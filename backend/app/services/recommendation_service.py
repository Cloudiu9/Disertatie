from app.db import (
    users_collection,
    movies_collection,
    tv_collection,
    interactions_collection,
)
from collections import Counter
from bson import ObjectId
from typing import Any, List, Set
import traceback


INTERACTION_WEIGHTS = {
    "seen": 1,
    "like": 2,
    "love": 3
}


def _extract_ids(raw_list: List[Any], media_type: str) -> List[int]:
    ids = []

    for item in raw_list:
        if isinstance(item, dict):
            if item.get("media_type") == media_type and isinstance(item.get("tmdb_id"), int):
                ids.append(item["tmdb_id"])

        elif isinstance(item, int) and media_type == "movie":
            ids.append(item)

    return ids


def _compute_global_popularity(media_type: str) -> Counter:
    global_counts = Counter()

    all_lists = users_collection.find({}, {"my_list": 1})

    for u in all_lists:
        for item in u.get("my_list", []) or []:

            if isinstance(item, dict):
                if item.get("media_type") == media_type:
                    global_counts[item["tmdb_id"]] += 1

            elif isinstance(item, int) and media_type == "movie":
                global_counts[item] += 1

    return global_counts


def _get_user_interactions(user_oid: ObjectId, media_type: str):
    """
    Returns { tmdb_id: weight }
    """
    interactions = interactions_collection.find(
        {
            "user_id": user_oid,
            "media_type": media_type
        }
    )

    weighted = {}

    for i in interactions:
        tmdb_id = i.get("tmdb_id")
        interaction = i.get("interaction")

        if tmdb_id and interaction in INTERACTION_WEIGHTS:
            weighted[tmdb_id] = INTERACTION_WEIGHTS[interaction]

    return weighted


def _collaborative_recommendation(
    user_oid: ObjectId,
    item_ids: List[int],
    media_type: str,
    collection,
    limit: int
):
    if len(item_ids) < 3:
        return list(
            collection
            .find({}, {"_id": 0})
            .sort("popularity", -1)
            .limit(limit)
        )

    current_set: Set[int] = set(item_ids)
    current_weights = _get_user_interactions(user_oid, media_type)

    similar_users = users_collection.find(
        {
            "_id": {"$ne": user_oid},
            "my_list.tmdb_id": {"$in": item_ids},
            "my_list.media_type": media_type
        },
        {"my_list": 1}
    )

    global_counts = _compute_global_popularity(media_type)

    item_scores = {}

    for user in similar_users:

        other_set: Set[int] = set()

        for item in user.get("my_list", []) or []:
            if isinstance(item, dict):
                if item.get("media_type") == media_type:
                    other_set.add(item["tmdb_id"])

        if not other_set:
            continue

        intersection_items = current_set & other_set

        if not intersection_items:
            continue

        weighted_intersection = sum(
            current_weights.get(item, 1) for item in intersection_items
        )

        union = len(current_set | other_set)

        if union == 0:
            continue

        similarity = weighted_intersection / union

        if similarity <= 0:
            continue

        for item_id in other_set - current_set:

            interaction_boost = current_weights.get(item_id, 1)

            weight = (
                similarity * 0.5 +
                interaction_boost * 0.3
            ) / (1 + global_counts.get(item_id, 1))

            item_scores[item_id] = item_scores.get(item_id, 0) + weight

    if not item_scores:
        return list(
            collection
            .find({"tmdb_id": {"$nin": list(current_set)}}, {"_id": 0})
            .sort("popularity", -1)
            .limit(limit)
        )

    recommended_ids = [
        item_id
        for item_id, _ in sorted(
            item_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )[:limit]
    ]

    items = list(
        collection.find(
            {"tmdb_id": {"$in": recommended_ids}},
            {"_id": 0}
        )
    )

    id_to_index = {mid: i for i, mid in enumerate(recommended_ids)}

    items.sort(
        key=lambda m: id_to_index.get(m.get("tmdb_id"), 9999)
    )

    return items


def generate_user_movie_recommendations(user_id: Any, limit: int = 12):
    try:

        user_oid = ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id

        user = users_collection.find_one({"_id": user_oid})
        if not user:
            return []

        raw_list = user.get("my_list", []) or []
        movie_ids = _extract_ids(raw_list, "movie")

        return _collaborative_recommendation(
            user_oid,
            movie_ids,
            "movie",
            movies_collection,
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

        raw_list = user.get("my_list", []) or []
        tv_ids = _extract_ids(raw_list, "tv")

        return _collaborative_recommendation(
            user_oid,
            tv_ids,
            "tv",
            tv_collection,
            limit
        )

    except Exception:
        traceback.print_exc()
        return []