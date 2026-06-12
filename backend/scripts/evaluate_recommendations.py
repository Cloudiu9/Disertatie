import os
import sys
import random
from collections import defaultdict
from bson import ObjectId

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from dotenv import load_dotenv
load_dotenv()

from app.db import users_collection, interactions_collection
from app.services.recommendation_service import (
    _collaborative_recommendation,
    movies_collection,
    tv_collection,
    movie_tfidf,
    tv_tfidf,
    INTERACTION_WEIGHTS
)

K_VALUES        = [5, 10, 20]
MIN_INTERACTIONS = 6    
TRAIN_RATIO     = 0.7   
RANDOM_SEED     = 42
RELEVANT_TYPES  = {"like", "love"}

random.seed(RANDOM_SEED)
PRINTED_DEBUG_SAMPLE = False

def precision_at_k(recommended_ids: list, relevant_ids: set, k: int) -> float:
    top_k = recommended_ids[:k]
    if not top_k: return 0.0
    hits = sum(1 for item_id in top_k if item_id in relevant_ids)
    return hits / k

def recall_at_k(recommended_ids: list, relevant_ids: set, k: int) -> float:
    if not relevant_ids: return 0.0
    top_k = recommended_ids[:k]
    hits = sum(1 for item_id in top_k if item_id in relevant_ids)
    return hits / len(relevant_ids)

def get_user_relevant_interactions_full(user_oid: ObjectId, media_type: str) -> list:
    """Returneaza o lista de dict-uri (tmdb_id, weight) pentru split corect."""
    docs = list(interactions_collection.find(
        {"user_id": user_oid, "media_type": media_type, "interaction": {"$in": list(RELEVANT_TYPES)}},
        {"tmdb_id": 1, "interaction": 1, "_id": 0}
    ))
    return [{"tmdb_id": d["tmdb_id"], "weight": INTERACTION_WEIGHTS.get(d["interaction"], 2)} for d in docs]

def evaluate_user(user_doc: dict, media_type: str) -> dict | None:
    global PRINTED_DEBUG_SAMPLE
    user_oid = user_doc["_id"]
    
    full_interactions = get_user_relevant_interactions_full(user_oid, media_type)
    if len(full_interactions) < MIN_INTERACTIONS:
        return None

    random.shuffle(full_interactions)
    
    split_idx = max(1, int(len(full_interactions) * TRAIN_RATIO))
    train_data = full_interactions[:split_idx]
    test_data = full_interactions[split_idx:]

    train_ids = [d["tmdb_id"] for d in train_data]
    test_ids = {d["tmdb_id"] for d in test_data}
    
    # Simulam greutatile pe care le-ar vedea modelul in Train
    test_mode_weights = {d["tmdb_id"]: d["weight"] for d in train_data}

    if not test_ids:
        return None

    # IMPORTANT: Exclude just train_ids. 
    # Leave test_ids so they can be 'guessed'
    excluded = set(train_ids)

    collection = movies_collection if media_type == "movie" else tv_collection
    tfidf_map  = movie_tfidf       if media_type == "movie" else tv_tfidf

    max_k = max(K_VALUES)
    results = _collaborative_recommendation(
        user_oid=user_oid,
        item_ids=train_ids,
        excluded_ids=excluded,
        media_type=media_type,
        collection=collection,
        tfidf_model=tfidf_map,
        limit=max_k,
        test_mode_interactions=test_mode_weights # Force ignore DB
    )

    recommended_ids = [r["tmdb_id"] for r in results]

    if not PRINTED_DEBUG_SAMPLE and len(test_ids) > 0:
        print("\n" + "🔍" * 15 + " DEBUG SAMPLE " + "🔍" * 15)
        print(f"Media Type: {media_type.upper()}")
        print(f"Train IDs: {train_ids}")
        print(f"Test IDs (Targets): {list(test_ids)}")
        print(f"Recommended: {recommended_ids}")
        PRINTED_DEBUG_SAMPLE = True

    metrics = {}
    for k in K_VALUES:
        metrics[f"P@{k}"] = precision_at_k(recommended_ids, test_ids, k)
        metrics[f"R@{k}"] = recall_at_k(recommended_ids, test_ids, k)
    return metrics

def run_evaluation():
    print("Running Evaluation...")
    all_users = list(users_collection.find({}, {"_id": 1, "preferred_genres": 1}))
    results_by_type = {"movie": [], "tv": []}

    for user_doc in all_users:
        for media_type in ("movie", "tv"):
            metrics = evaluate_user(user_doc, media_type)
            if metrics:
                results_by_type[media_type].append(metrics)

    for media_type, results in results_by_type.items():
        print(f"\n--- {media_type.upper()} ({len(results)} users) ---")
        for k in K_VALUES:
            avg_p = sum(r[f"P@{k}"] for r in results) / len(results)
            avg_r = sum(r[f"R@{k}"] for r in results) / len(results)
            print(f"  P@{k}: {avg_p:.4f} | R@{k}: {avg_r:.4f}")

if __name__ == "__main__":
    run_evaluation()
