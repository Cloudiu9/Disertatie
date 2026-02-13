from app.db import users_collection, movies_collection
from collections import Counter
from bson import ObjectId


def generate_user_recommendations(user_id: ObjectId, limit: int = 12):
    current_user = users_collection.find_one({"_id": user_id})
    if not current_user:
        return []

    user_list = current_user.get("my_list", [])

    # -------- Cold Start Fallback --------
    if len(user_list) < 3:
        return list(
            movies_collection
            .find({}, {"_id": 0})
            .sort("popularity", -1)
            .limit(limit)
        )

    current_set = set(user_list)

    similar_users = users_collection.find(
        {
            "_id": {"$ne": user_id},
            "my_list": {"$in": user_list}
        },
        {"my_list": 1}
    )

    # -------- Popularity Precompute --------
    all_lists = users_collection.find({}, {"my_list": 1})
    global_counts = Counter()

    for u in all_lists:
        for m in u.get("my_list", []):
            global_counts[m] += 1

    # -------- Jaccard Weighted Scoring --------
    movie_scores = {}

    for user in similar_users:
        other_list = set(user.get("my_list", []))

        intersection = len(current_set & other_list)
        union = len(current_set | other_list)

        if union == 0:
            continue

        similarity = intersection / union

        if similarity == 0:
            continue

        for movie_id in other_list - current_set:
            weight = similarity / (1 + global_counts.get(movie_id, 1))
            movie_scores[movie_id] = movie_scores.get(movie_id, 0) + weight

    if not movie_scores:
        return []

    recommended_ids = [
        movie_id
        for movie_id, _ in sorted(
            movie_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )[:limit]
    ]

    movies = list(
        movies_collection.find(
            {"tmdb_id": {"$in": recommended_ids}},
            {"_id": 0}
        )
    )

    movies.sort(
        key=lambda m: recommended_ids.index(m["tmdb_id"])
    )

    return movies
