from app.db import (
    users_collection,
    movies_collection,
    tv_collection,
    interactions_collection,
)
from collections import Counter, defaultdict
from bson import ObjectId
from typing import Any, List, Set, Dict, Optional
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

def _get_user_interactions(user_oid: ObjectId, media_type: str, test_mode_interactions: Optional[Dict[int, int]] = None) -> Dict[int, int]:
    # If if testing mode, use training set
    if test_mode_interactions is not None:
        return test_mode_interactions

    interactions = interactions_collection.find({
        "user_id": user_oid,
        "media_type": media_type
    })
    return {
        i["tmdb_id"]: INTERACTION_WEIGHTS.get(i["interaction"], 1)
        for i in interactions
    }

def _normalize(scores: Dict[int, float]) -> Dict[int, float]:
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
    test_mode_interactions: Optional[Dict[int, int]] = None # For evaluate_recommendations
):
    if len(item_ids) < 3:
        return list(
            collection.find({"tmdb_id": {"$nin": list(excluded_ids)}}, {"_id": 0})
            .sort("popularity", -1)
            .limit(limit)
        )

    current_set = set(item_ids)
    current_weights = _get_user_interactions(user_oid, media_type, test_mode_interactions)
    global_counts = _compute_global_popularity(media_type)

    collab_scores = {}
    n_similar_users = 0

    overlapping_interactions = interactions_collection.find({
        "user_id": {"$ne": user_oid},
        "tmdb_id": {"$in": item_ids},
        "media_type": media_type,
        "interaction": {"$in": ["like", "love"]}
    })
    
    similar_user_items = {}
    for inter in overlapping_interactions:
        uid = inter.get("user_id")
        if not uid: continue
        if uid not in similar_user_items:
            similar_user_items[uid] = set()
        similar_user_items[uid].add(inter["tmdb_id"])

    similar_user_ids = list(similar_user_items.keys())
    histories_map = defaultdict(set)
    
    if similar_user_ids:
        all_histories = interactions_collection.find(
            {
                "user_id": {"$in": similar_user_ids},
                "media_type": media_type,
                "interaction": {"$in": ["like", "love"]}
            },
            {"user_id": 1, "tmdb_id": 1, "_id": 0}
        )
        for doc in all_histories:
            uid = doc.get("user_id")
            if uid: histories_map[uid].add(doc["tmdb_id"])

    for other_user_id, shared_items in similar_user_items.items():
        other_full_history = histories_map[other_user_id]
        if not other_full_history: continue
        intersection = current_set & other_full_history
        if not intersection: continue

        similarity = len(intersection) / len(current_set | other_full_history)
        n_similar_users += 1

        for item_id in (other_full_history - current_set) - excluded_ids:
            collab_scores[item_id] = collab_scores.get(item_id, 0) + similarity

    content_scores = _get_content_scores(item_ids, current_weights, tfidf_model)
    collab_scores = _normalize(collab_scores)
    content_scores = _normalize(content_scores)

    collab_weight = min(0.6, n_similar_users / 20)
    content_weight = min(0.8, 1.0 - collab_weight)

    final_scores = {}
    all_ids = (set(collab_scores) | set(content_scores)) - excluded_ids

    for item_id in all_ids:
        collab = collab_scores.get(item_id, 0)
        content = content_scores.get(item_id, 0)
        popularity = global_counts.get(item_id, 0)
        pop_penalty_weight = 0.2 

        score = (collab * collab_weight + content * content_weight) / (1 + pop_penalty_weight * math.log1p(popularity))
        final_scores[item_id] = score

    if not final_scores:
        return list(collection.find({"tmdb_id": {"$nin": list(excluded_ids)}}, {"_id": 0}).sort("popularity", -1).limit(limit))

    ranked_ids = sorted(final_scores, key=final_scores.get, reverse=True)[:limit]
    items = list(collection.find({"tmdb_id": {"$in": ranked_ids}}, {"_id": 0}))
    order_map = {id_: i for i, id_ in enumerate(ranked_ids)}
    items.sort(key=lambda x: order_map.get(x["tmdb_id"], 9999))

    return items

def generate_user_movie_recommendations(user_id: Any, limit: int = 12):
    try:
        user_oid = ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id
        user = users_collection.find_one({"_id": user_oid})
        if not user: return []
        movie_ids = _extract_ids(user.get("my_list", []), "movie")
        excluded_ids = _get_excluded_ids(user, user_oid, "movie")
        return _collaborative_recommendation(user_oid, movie_ids, excluded_ids, "movie", movies_collection, movie_tfidf, limit)
    except Exception:
        traceback.print_exc()
        return []

def generate_user_tv_recommendations(user_id: Any, limit: int = 12):
    try:
        user_oid = ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id
        user = users_collection.find_one({"_id": user_oid})
        if not user: return []
        tv_ids = _extract_ids(user.get("my_list", []), "tv")
        excluded_ids = _get_excluded_ids(user, user_oid, "tv")
        return _collaborative_recommendation(user_oid, tv_ids, excluded_ids, "tv", tv_collection, tv_tfidf, limit)
    except Exception:
        traceback.print_exc()
        return []
