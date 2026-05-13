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
import math


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


# --- POPULARITY CACHE (module-level, lives for the Flask process lifetime) ---
_popularity_cache: Dict[str, Counter] = {}


def _extract_ids(raw_list: List[Any], media_type: str) -> List[int]:
    ids = []
    for item in raw_list:
        if isinstance(item, dict) and item.get("media_type") == media_type:
            ids.append(item["tmdb_id"])
    return ids


def _get_excluded_ids(user: Dict[str, Any], user_oid: ObjectId, media_type: str) -> Set[int]:
    my_list_ids = set(_extract_ids(user.get("my_list", []), media_type))
    watched_ids = {
        doc["tmdb_id"]
        for doc in interactions_collection.find(
            {"user_id": user_oid, "media_type": media_type},
            {"tmdb_id": 1, "_id": 0},
        )
    }
    return my_list_ids | watched_ids


def _compute_global_popularity(media_type: str) -> Counter:
    if media_type in _popularity_cache:
        return _popularity_cache[media_type]

    global_counts = Counter()
    for u in users_collection.find({}, {"my_list": 1}):
        for item in u.get("my_list", []) or []:
            if item.get("media_type") == media_type:
                global_counts[item["tmdb_id"]] += 1

    _popularity_cache[media_type] = global_counts
    return global_counts


def _get_user_interactions(user_oid: ObjectId, media_type: str) -> Dict[int, int]:
    interactions = interactions_collection.find({
        "user_id": user_oid,
        "media_type": media_type
    })
    return {
        i["tmdb_id"]: INTERACTION_WEIGHTS.get(i["interaction"], 1)
        for i in interactions
    }


def _normalize(scores: Dict[int, float]) -> Dict[int, float]:
    """Min-max normalize a score dictionary to [0, 1]."""
    if not scores:
        return scores
    min_val = min(scores.values())
    max_val = max(scores.values())
    if max_val == min_val:
        return {k: 1.0 for k in scores}
    return {k: (v - min_val) / (max_val - min_val) for k, v in scores.items()}


def _get_content_scores(
    item_ids: List[int],
    user_weights: Dict[int, int],
    tfidf_model
) -> Dict[int, float]:
    """
    Aggregate TF-IDF similarity scores across user's items,
    weighted by how strongly the user interacted with each source item.
    Items similar to a 'loved' movie score 3x higher than a 'seen' one.
    """
    scores = {}
    for item_id in item_ids:
        similar = tfidf_model.get(item_id, [])
        interaction_weight = user_weights.get(item_id, 1)
        for sim_id, sim_score in similar:
            scores[sim_id] = scores.get(sim_id, 0) + sim_score * interaction_weight
    return scores


def _collaborative_recommendation(
    user_oid: ObjectId,
    item_ids: List[int],
    excluded_ids: Set[int],
    media_type: str,
    collection,
    tfidf_model,
    limit: int,
):
    if len(item_ids) < 3:
        return list(
            collection.find({"tmdb_id": {"$nin": list(excluded_ids)}}, {"_id": 0})
            .sort("popularity", -1)
            .limit(limit)
        )

    current_set: Set[int] = set(item_ids)
    current_weights = _get_user_interactions(user_oid, media_type)
    global_counts = _compute_global_popularity(media_type)

    # --- COLLABORATIVE SCORES ---
    collab_scores = {}
    n_similar_users = 0

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

        # Plain Jaccard — consistent on both sides
        similarity = len(intersection) / len(current_set | other_set)
        n_similar_users += 1

        for item_id in (other_set - current_set) - excluded_ids:
            collab_scores[item_id] = collab_scores.get(item_id, 0) + similarity

    # --- CONTENT SCORES (interaction-weighted) ---
    content_scores = _get_content_scores(item_ids, current_weights, tfidf_model)

    # --- NORMALIZE INDEPENDENTLY before merging ---
    collab_scores = _normalize(collab_scores)
    content_scores = _normalize(content_scores)

    # --- ADAPTIVE WEIGHTS ---
    # With few users collab signal is weak, so we lean on content.
    # collab_weight grows toward 0.6 as the user base fills out.
    collab_weight = min(0.6, n_similar_users / 20)
    content_weight = 1.0 - collab_weight

    # --- MERGE + RANK ---
    final_scores = {}
    all_ids = (set(collab_scores) | set(content_scores)) - excluded_ids

    for item_id in all_ids:
        collab = collab_scores.get(item_id, 0)
        content = content_scores.get(item_id, 0)
        popularity = global_counts.get(item_id, 1)

        # log1p gives a gentle penalty: pop=1→÷1.69, pop=10→÷3.4, pop=100→÷5.6
        score = (
            collab * collab_weight +
            content * content_weight
        ) / (1 + math.log1p(popularity))

        final_scores[item_id] = score

    if not final_scores:
        return list(
            collection.find({"tmdb_id": {"$nin": list(excluded_ids)}}, {"_id": 0})
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
        excluded_ids = _get_excluded_ids(user, user_oid, "movie")
        return _collaborative_recommendation(
            user_oid, movie_ids, excluded_ids, "movie", movies_collection, movie_tfidf, limit
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
        excluded_ids = _get_excluded_ids(user, user_oid, "tv")
        return _collaborative_recommendation(
            user_oid, tv_ids, excluded_ids, "tv", tv_collection, tv_tfidf, limit
        )

    except Exception:
        traceback.print_exc()
        return []