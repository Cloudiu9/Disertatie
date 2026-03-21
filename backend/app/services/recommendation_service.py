from app.db import (
    users_collection,
    movies_collection,
    tv_collection,
    interactions_collection,
)
from collections import Counter
from bson import ObjectId
from typing import Any, List, Set, Dict
import traceback
import pickle
import os


INTERACTION_WEIGHTS = {
    "seen": 1,
    "like": 2,
    "love": 3
}


# --- LOAD TF-IDF MODELS ---
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))

with open(os.path.join(PROJECT_ROOT, "models/movie_tfidf.pkl"), "rb") as f:
    movie_tfidf = pickle.load(f)

with open(os.path.join(PROJECT_ROOT, "models/tv_tfidf.pkl"), "rb") as f:
    tv_tfidf = pickle.load(f)


def _extract_ids(raw_list: List[Any], media_type: str) -> List[int]:
    ids = []
    for item in raw_list:
        if isinstance(item, dict):
            if item.get("media_type") == media_type:
                ids.append(item["tmdb_id"])
    return ids


def _compute_global_popularity(media_type: str) -> Counter:
    global_counts = Counter()

    for u in users_collection.find({}, {"my_list": 1}):
        for item in u.get("my_list", []) or []:
            if item.get("media_type") == media_type:
                global_counts[item["tmdb_id"]] += 1

    return global_counts


def _get_user_interactions(user_oid: ObjectId, media_type: str):
    interactions = interactions_collection.find({
        "user_id": user_oid,
        "media_type": media_type
    })

    return {
        i["tmdb_id"]: INTERACTION_WEIGHTS.get(i["interaction"], 1)
        for i in interactions
    }


# --- CONTENT SCORING ---
def _get_content_scores(item_ids: List[int], tfidf_model) -> Dict[int, float]:
    """
    Aggregate TF-IDF similarity scores across user's items
    """
    scores = {}

    for item_id in item_ids:
        similar = tfidf_model.get(item_id, [])

        for sim_id, sim_score in similar:
            scores[sim_id] = scores.get(sim_id, 0) + sim_score

    return scores


def _collaborative_recommendation(
    user_oid: ObjectId,
    item_ids: List[int],
    media_type: str,
    collection,
    tfidf_model,
    limit: int
):
    if len(item_ids) < 3:
        return list(
            collection.find({}, {"_id": 0})
            .sort("popularity", -1)
            .limit(limit)
        )

    current_set: Set[int] = set(item_ids)
    current_weights = _get_user_interactions(user_oid, media_type)
    global_counts = _compute_global_popularity(media_type)

    # --- COLLABORATIVE SCORES ---
    collab_scores = {}

    similar_users = users_collection.find(
        {
            "_id": {"$ne": user_oid},
            "my_list.tmdb_id": {"$in": item_ids},
            "my_list.media_type": media_type
        },
        {"my_list": 1}
    )

    for user in similar_users:

        other_set = {
            item["tmdb_id"]
            for item in user.get("my_list", [])
            if item.get("media_type") == media_type
        }

        intersection = current_set & other_set
        if not intersection:
            continue

        weighted_intersection = sum(
            current_weights.get(i, 1) for i in intersection
        )

        union = len(current_set | other_set)
        similarity = weighted_intersection / union

        for item_id in other_set - current_set:
            collab_scores[item_id] = collab_scores.get(item_id, 0) + similarity

    # --- CONTENT SCORES ---
    content_scores = _get_content_scores(item_ids, tfidf_model)

    # --- MERGE + DEDUP ---
    final_scores = {}

    all_ids = set(collab_scores) | set(content_scores)

    for item_id in all_ids:

        collab = collab_scores.get(item_id, 0)
        content = content_scores.get(item_id, 0)
        interaction = current_weights.get(item_id, 1)
        popularity = global_counts.get(item_id, 1)

        score = (
            collab * 0.5 +
            content * 0.2 +
            interaction * 0.3
        ) / (1 + popularity)

        final_scores[item_id] = score

    if not final_scores:
        return list(
            collection.find({"tmdb_id": {"$nin": list(current_set)}}, {"_id": 0})
            .sort("popularity", -1)
            .limit(limit)
        )

    ranked_ids = sorted(final_scores, key=final_scores.get, reverse=True)[:limit]

    items = list(
        collection.find(
            {"tmdb_id": {"$in": ranked_ids}},
            {"_id": 0}
        )
    )

    order_map = {id_: i for i, id_ in enumerate(ranked_ids)}
    items.sort(key=lambda x: order_map.get(x["tmdb_id"], 9999))

    return items


def generate_user_movie_recommendations(user_id: Any, limit: int = 12):
    try:
        user_oid = ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id
        user = users_collection.find_one({"_id": user_oid})
        if not user:
            return []

        movie_ids = _extract_ids(user.get("my_list", []), "movie")

        return _collaborative_recommendation(
            user_oid,
            movie_ids,
            "movie",
            movies_collection,
            movie_tfidf,
            limit
        )

    except Exception:
        traceback.print_exc()
        return []


def generate_user_tv_recommendations(user_id: Any, limit: int = 12):
    try:
        user_oid = ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id
        user = users_collection.find_one({"_id": user_oid})
        if not user:
            return []

        tv_ids = _extract_ids(user.get("my_list", []), "tv")

        return _collaborative_recommendation(
            user_oid,
            tv_ids,
            "tv",
            tv_collection,
            tv_tfidf,
            limit
        )

    except Exception:
        traceback.print_exc()
        return []