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

# Signal strength per interaction type — used to weight how much a given
# liked/loved/seen item should influence content-based scoring. "love" counts
# 3x as much as a passive "seen" when accumulating TF-IDF neighbor scores.
INTERACTION_WEIGHTS = {
    "seen": 1,
    "like": 2,
    "love": 3
}

# --- LOAD TF-IDF MODELS ---
# Loaded once at module import time (process startup), not per-request —
# these pickles hold precomputed cosine-similarity neighbor lists for every
# title in the catalog, built offline by build_movie_recommender.py /
# build_tv_recommender.py. Loading them here means every request just does
# an in-memory dict lookup instead of recomputing similarity live.
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))

with open(os.path.join(PROJECT_ROOT, "models/movie_tfidf.pkl"), "rb") as f:
    movie_tfidf = pickle.load(f)

with open(os.path.join(PROJECT_ROOT, "models/tv_tfidf.pkl"), "rb") as f:
    tv_tfidf = pickle.load(f)

# Process-lifetime cache for global popularity counts (see _compute_global_popularity).
# NOTE: this cache is never invalidated — it reflects popularity at first-read
# time and goes stale as users add to their lists afterward. Fine for a
# dissertation-scale deployment; a production version would want a TTL or an
# explicit invalidation hook whenever my_list changes.
_popularity_cache: Dict[str, Counter] = {}

def _extract_ids(raw_list: List[Any], media_type: str) -> List[int]:
    # Pulls just the tmdb_ids for one media type out of a user's mixed
    # movie+TV my_list array.
    ids = []
    for item in raw_list:
        if isinstance(item, dict) and item.get("media_type") == media_type:
            ids.append(item["tmdb_id"])
    return ids

def _get_excluded_ids(user: Dict[str, Any], user_oid: ObjectId, media_type: str) -> Set[int]:
    # Items we should never recommend back to the user: anything already on
    # their watchlist, AND anything they've already logged an interaction for
    # (seen/like/love). These are two separate storage locations (see
    # my_list_routes.py), so both have to be queried and unioned here —
    # checking only one would let an already-watched-and-removed-from-watchlist
    # item slip back into their recommendations.
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
    # Approximates "popularity" by counting how many users have each title on
    # their my_list (a proxy signal, not TMDB's own popularity score — this is
    # specifically what the hybrid score's popularity-penalty term uses to
    # down-weight universally-added titles). Cached per media_type for the
    # life of the process, since this is a full users-collection scan and is
    # too expensive to repeat on every recommendation request.
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
    # test_mode_interactions lets evaluate_recommendations.py inject a
    # held-out training subset of a user's real interactions instead of
    # reading their live, full interaction history — this is what makes
    # offline recommendation-quality evaluation (train/test split) possible
    # without touching production data or duplicating this query logic.
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
    # Min-max normalization to [0, 1]. Required before combining collaborative
    # and content scores in the hybrid formula below, since they live on
    # completely different, non-comparable scales (Jaccard similarities are
    # bounded fractions; TF-IDF cosine-similarity sums can range much wider
    # depending on how many items a user has interacted with).
    if not scores:
        return scores
    min_val = min(scores.values())
    max_val = max(scores.values())
    # All scores identical (e.g. only one candidate) — avoid a divide-by-zero
    # and just treat everything as equally maximally relevant.
    if max_val == min_val:
        return {k: 1.0 for k in scores}
    return {k: (v - min_val) / (max_val - min_val) for k, v in scores.items()}

def _get_content_scores(
    item_ids: List[int],
    user_weights: Dict[int, int],
    tfidf_model
) -> Dict[int, float]:
    # For every item the user has interacted with, pull its precomputed
    # TF-IDF neighbor list and accumulate each neighbor's similarity score,
    # scaled by how strongly the user felt about the source item
    # (INTERACTION_WEIGHTS). An item that's a close neighbor of several
    # things the user loved will accumulate a higher score than one that's
    # only a weak neighbor of something they merely marked "seen".
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
    # Cold-start guard: with fewer than 3 interactions there isn't enough
    # signal to compute a meaningful Jaccard overlap with other users, so we
    # skip straight to a popularity-ranked fallback rather than return noise.
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

    # Pass 1: find candidate "neighbor" users — anyone (other than this user)
    # who liked/loved at least one item this user also has. This is
    # intentionally a narrow, cheap query first, rather than scanning every
    # other user's full history up front.
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

    # Pass 2: now that we know WHICH users are worth comparing against, fetch
    # their COMPLETE like/love history (not just the overlapping subset from
    # pass 1) — Jaccard similarity needs each neighbor's full item set to be
    # computed correctly, and this also surfaces every item they liked that
    # the current user hasn't seen yet, which is the actual recommendation
    # candidate pool.
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

    # Jaccard similarity: |intersection| / |union| of the current user's and
    # each neighbor's full liked-item sets. A neighbor who overlaps heavily
    # relative to both of your total histories counts for more than one who
    # happens to share a single item out of hundreds.
    for other_user_id, shared_items in similar_user_items.items():
        other_full_history = histories_map[other_user_id]
        if not other_full_history: continue
        intersection = current_set & other_full_history
        if not intersection: continue

        similarity = len(intersection) / len(current_set | other_full_history)
        n_similar_users += 1

        # Every item this neighbor liked that the user hasn't interacted with
        # or already excluded gets a score bump proportional to how similar
        # that neighbor is — a near-identical neighbor's taste counts far
        # more than a barely-overlapping one.
        for item_id in (other_full_history - current_set) - excluded_ids:
            collab_scores[item_id] = collab_scores.get(item_id, 0) + similarity

    # Combining content and collaborative scores
    content_scores = _get_content_scores(item_ids, current_weights, tfidf_model)
    collab_scores = _normalize(collab_scores)
    content_scores = _normalize(content_scores)

    # Adaptive weighting: with zero similar users, collab_weight is 0 and the
    # hybrid silently degrades to pure content-based scoring. As more
    # similar users are found (capped at 20), collaborative filtering earns
    # up to 60% of the final score — the more social proof we have, the more
    # we trust it over content similarity alone.
    collab_weight = min(0.6, n_similar_users / 20)
    content_weight = min(0.8, 1.0 - collab_weight)

    final_scores = {}
    all_ids = (set(collab_scores) | set(content_scores)) - excluded_ids

    for item_id in all_ids:
        collab = collab_scores.get(item_id, 0)
        content = content_scores.get(item_id, 0)
        popularity = global_counts.get(item_id, 0)
        pop_penalty_weight = 0.2

        # Popularity penalty: divides the blended score down for items that
        # are already globally popular. Without this, universally-liked
        # blockbusters would dominate every user's recommendations simply by
        # showing up in most neighbors' histories, drowning out personal
        # taste signal. log1p keeps the penalty gentle and avoids a harsh
        # drop-off for moderately popular titles.
        score = (collab * collab_weight + content * content_weight) / (1 + pop_penalty_weight * math.log1p(popularity))
        final_scores[item_id] = score

    # Safety net: if scoring produced nothing (e.g. no overlapping neighbors
    # AND no content neighbors found), fall back to plain popularity rather
    # than returning an empty recommendations list.
    if not final_scores:
        return list(collection.find({"tmdb_id": {"$nin": list(excluded_ids)}}, {"_id": 0}).sort("popularity", -1).limit(limit))

    ranked_ids = sorted(final_scores, key=lambda k: final_scores.get(k, 0), reverse=True)[:limit]
    items = list(collection.find({"tmdb_id": {"$in": ranked_ids}}, {"_id": 0}))
    # MongoDB's $in does NOT guarantee results come back in the order the ids
    # were listed, so the ranking computed above has to be reapplied manually
    # after the fetch — order_map maps each id to its rank position, and the
    # final sort restores it.
    order_map = {id_: i for i, id_ in enumerate(ranked_ids)}
    items.sort(key=lambda x: order_map.get(x["tmdb_id"], 9999))

    return items

def generate_user_movie_recommendations(user_id: Any, limit: int = 12):
    # Broad except here is deliberate: a failure in recommendation scoring
    # should degrade to an empty list for this user, not take down the page
    # or propagate a 500 — recommendations are an enhancement, not a
    # critical-path feature. traceback.print_exc() keeps the failure visible
    # in logs for debugging without surfacing it to the client.
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