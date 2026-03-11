# backend/app/services/recommendation_service.py

from app.db import users_collection, movies_collection, tv_collection
from collections import Counter
from bson import ObjectId
from typing import Any, List, Set
import traceback


def _extract_movie_ids_from_raw_list(raw_list: List[Any]) -> List[int]:
    """Handle both old-format (ints) and new-format (dicts with media_type)."""
    movie_ids = []
    for item in raw_list:
        if isinstance(item, dict):
            if item.get("media_type") == "movie" and isinstance(item.get("tmdb_id"), int):
                movie_ids.append(item["tmdb_id"])
        elif isinstance(item, int):
            # legacy format: tmdb_id integers
            movie_ids.append(item)
    return movie_ids


def generate_user_recommendations(user_id: Any, limit: int = 12):
    """
    Collaborative recommendations based on users' my_list.
    Defensive: accepts ObjectId or string user_id and tolerates mixed my_list schemas.
    Returns a list of movie documents (no _id field).
    """
    try:
        # normalize user_id to ObjectId
        if not isinstance(user_id, ObjectId):
            try:
                user_oid = ObjectId(user_id)
            except Exception:
                # invalid id -> no recommendations
                return []
        else:
            user_oid = user_id

        current_user = users_collection.find_one({"_id": user_oid})
        if not current_user:
            return []

        raw_list = current_user.get("my_list", []) or []

        # Extract only movie tmdb_ids (handle legacy ints and new dict items)
        movie_ids = _extract_movie_ids_from_raw_list(raw_list)

        # Cold-start / fallback: not enough movie history -> popular movies
        if len(movie_ids) < 3:
            popular = list(
                movies_collection
                .find({}, {"_id": 0})
                .sort("popularity", -1)
                .limit(limit)
            )
            return popular

        current_set: Set[int] = set(movie_ids)

        # Find similar users: handle both new-format and legacy int-format lists
        similar_users_cursor = users_collection.find(
            {
                "_id": {"$ne": user_oid},
                "$or": [
                    {"my_list.tmdb_id": {"$in": movie_ids}},  # new-format match
                    {"my_list": {"$in": movie_ids}},  # legacy int-format match
                ],
            },
            {"my_list": 1}
        )

        # Precompute global popularity counts for weighting (only movies)
        all_lists_cursor = users_collection.find({}, {"my_list": 1})
        global_counts = Counter()
        for u in all_lists_cursor:
            for item in u.get("my_list", []) or []:
                if isinstance(item, dict):
                    if item.get("media_type") == "movie" and isinstance(item.get("tmdb_id"), int):
                        global_counts[item["tmdb_id"]] += 1
                elif isinstance(item, int):
                    global_counts[item] += 1

        # Jaccard-weighted collaborative scoring
        movie_scores = {}

        for user in similar_users_cursor:
            other_list_items = user.get("my_list", []) or []

            other_set: Set[int] = set()
            for item in other_list_items:
                if isinstance(item, dict):
                    if item.get("media_type") == "movie" and isinstance(item.get("tmdb_id"), int):
                        other_set.add(item["tmdb_id"])
                elif isinstance(item, int):
                    other_set.add(item)

            if not other_set:
                continue

            intersection = len(current_set & other_set)
            union = len(current_set | other_set)
            if union == 0:
                continue

            similarity = intersection / union
            if similarity <= 0:
                continue

            # score candidate movies (in other_set but not in current_set)
            for movie_id in other_set - current_set:
                weight = similarity / (1 + global_counts.get(movie_id, 1))
                movie_scores[movie_id] = movie_scores.get(movie_id, 0) + weight

        if not movie_scores:
            # fallback: popular movies not in user's set
            popular_candidates = list(
                movies_collection
                .find({"tmdb_id": {"$nin": list(current_set)}}, {"_id": 0})
                .sort("popularity", -1)
                .limit(limit)
            )
            return popular_candidates

        # pick top-N by score
        recommended_ids = [
            movie_id
            for movie_id, _ in sorted(
                movie_scores.items(),
                key=lambda x: x[1],
                reverse=True
            )[:limit]
        ]

        # fetch movie documents and preserve order
        movies = list(
            movies_collection.find(
                {"tmdb_id": {"$in": recommended_ids}},
                {"_id": 0}
            )
        )

        # In rare cases some ids may be missing from DB; sort by recommended_ids order
        id_to_index = {mid: i for i, mid in enumerate(recommended_ids)}
        movies.sort(key=lambda m: id_to_index.get(m.get("tmdb_id"), 9999))

        return movies

    except Exception:
        # log for debugging, but avoid raising to keep API stable
        traceback.print_exc()
        return []