# backend/app/services/recommendation_service.py

from app.db import users_collection, movies_collection, tv_collection
from collections import Counter
from bson import ObjectId
from typing import Any, List, Set
import traceback


def _extract_ids(raw_list: List[Any], media_type: str) -> List[int]:
    """
    Extract tmdb_ids from my_list filtered by media_type.
    Handles both legacy int format and new object format.
    """
    ids = []

    for item in raw_list:
        if isinstance(item, dict):
            if item.get("media_type") == media_type and isinstance(item.get("tmdb_id"), int):
                ids.append(item["tmdb_id"])

        elif isinstance(item, int) and media_type == "movie":
            # legacy support
            ids.append(item)

    return ids


def _compute_global_popularity(media_type: str) -> Counter:
    """
    Count how many users have each item in their my_list.
    Used to penalize overly popular items.
    """
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


def _collaborative_recommendation(
    user_oid: ObjectId,
    item_ids: List[int],
    media_type: str,
    collection,
    limit: int
):
    """
    Core collaborative filtering engine used for both movies and TV.
    """

    if len(item_ids) < 3:
        # cold start fallback
        return list(
            collection
            .find({}, {"_id": 0})
            .sort("popularity", -1)
            .limit(limit)
        )

    current_set: Set[int] = set(item_ids)

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

        intersection = len(current_set & other_set)
        union = len(current_set | other_set)

        if union == 0:
            continue

        similarity = intersection / union

        if similarity <= 0:
            continue

        for item_id in other_set - current_set:

            weight = similarity / (1 + global_counts.get(item_id, 1))

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
    """
    Movie recommendations.
    """

    try:

        if not isinstance(user_id, ObjectId):
            user_oid = ObjectId(user_id)
        else:
            user_oid = user_id

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
    """
    TV show recommendations.
    """

    try:

        if not isinstance(user_id, ObjectId):
            user_oid = ObjectId(user_id)
        else:
            user_oid = user_id

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