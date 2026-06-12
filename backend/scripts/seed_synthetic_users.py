import random
import uuid
from datetime import datetime, timezone
from bson import ObjectId
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import users_collection, movies_collection, tv_collection, interactions_collection


# -----------------------
# CONFIG (IMPORTANT)
# -----------------------
NUM_USERS = 300   # increased for evaluation stability
MIN_STRONG = 12   # guarantees eligibility
MIN_TOTAL = 40
MAX_TOTAL = 80

RELEVANT_TYPES = ["seen", "like", "love"]

CLEAN_BEFORE_RUN = True

# users are clustered -> fixes randomness problem
GENRE_CLUSTERS = [
    ["Action", "Adventure"],
    ["Comedy"],
    ["Drama"],
    ["Thriller", "Crime"],
    ["Sci-Fi", "Fantasy"],
    ["Animation", "Family"],
]


# -----------------------
# CLEAN
# -----------------------
def clean():
    if not CLEAN_BEFORE_RUN:
        return

    synthetic = list(users_collection.find({"is_synthetic": True}, {"_id": 1}))
    ids = [u["_id"] for u in synthetic]

    users_collection.delete_many({"is_synthetic": True})
    interactions_collection.delete_many({"user_id": {"$in": ids}})

    print(f"Cleaned {len(ids)} users")


# -----------------------
# LOAD CATALOG
# -----------------------
def load():
    movies = list(movies_collection.find({}, {"tmdb_id": 1, "genres": 1}))
    tv = list(tv_collection.find({}, {"tmdb_id": 1, "genres": 1}))

    return movies, tv


# -----------------------
# GENRE FILTER
# -----------------------
def filter_by_genre(items, cluster):
    return [
        i["tmdb_id"]
        for i in items
        if any(g in (i.get("genres") or []) for g in cluster)
    ]


# -----------------------
# USER PROFILE GENERATION
# -----------------------
def build_user(movie_pool, tv_pool):
    cluster = random.choice(GENRE_CLUSTERS)

    movie_ids = filter_by_genre(movie_pool, cluster)
    tv_ids = filter_by_genre(tv_pool, cluster)

    # Fallback if cluster is too small
    if len(movie_ids) < (MAX_TOTAL // 2) + 15:
        movie_ids = [m["tmdb_id"] for m in movie_pool]
    if len(tv_ids) < (MAX_TOTAL // 2) + 15:
        tv_ids = [t["tmdb_id"] for t in tv_pool]

    # 1. Explicitly guarantee each user clears MIN_INTERACTIONS (6) for evaluation eligibility
    strong_movie_count = random.randint(6, 12)
    strong_tv_count = random.randint(6, 12)

    strong_movies = random.sample(movie_ids, min(strong_movie_count, len(movie_ids)))
    strong_tv = random.sample(tv_ids, min(strong_tv_count, len(tv_ids)))

    # 2. THE FIX: Filter out already chosen strong items to prevent duplicate key errors
    remaining_movies = [m for m in movie_ids if m not in strong_movies]
    remaining_tv = [t for t in tv_ids if t not in strong_tv]

    # Calculate remaining weak item counts to satisfy target total items
    total_items = random.randint(MIN_TOTAL, MAX_TOTAL)
    weak_movie_count = max(0, (total_items // 2) - len(strong_movies))
    weak_tv_count = max(0, (total_items // 2) - len(strong_tv))

    weak_movies = random.sample(remaining_movies, min(weak_movie_count, len(remaining_movies)))
    weak_tv = random.sample(remaining_tv, min(weak_tv_count, len(remaining_tv)))

    def interaction(strong=False):
        if strong:
            return random.choices(["like", "love"], weights=[0.4, 0.6])[0]
        return random.choices(RELEVANT_TYPES, weights=[0.6, 0.3, 0.1])[0]

    # Generate explicit user ID mapping
    user_id = ObjectId()
    interactions = []

    # Process Strong Interactions (Guaranteed Likes/Loves)
    for i in strong_movies:
        interactions.append({
            "user_id": user_id,
            "tmdb_id": i,
            "media_type": "movie",
            "interaction": interaction(strong=True),
        })

    for i in strong_tv:
        interactions.append({
            "user_id": user_id,
            "tmdb_id": i,
            "media_type": "tv",
            "interaction": interaction(strong=True),
        })

    # Process Weak Interactions (Mixed Seen/Likes/Loves)
    for i in weak_movies:
        interactions.append({
            "user_id": user_id,
            "tmdb_id": i,
            "media_type": "movie",
            "interaction": interaction(strong=False),
        })

    for i in weak_tv:
        interactions.append({
            "user_id": user_id,
            "tmdb_id": i,
            "media_type": "tv",
            "interaction": interaction(strong=False),
        })

    user = {
        "_id": user_id,
        "email": f"synthetic_{uuid.uuid4()}@synthetic.local",
        "password_hash": None,
        "my_list": [
            {"tmdb_id": i, "media_type": "movie"} for i in strong_movies[:10]
        ] + [
            {"tmdb_id": i, "media_type": "tv"} for i in strong_tv[:10]
        ],
        "preferred_genres": cluster,
        "onboarding_complete": True,
        "is_synthetic": True,
        "created_at": datetime.now(timezone.utc),
        "last_login": datetime.now(timezone.utc),
    }

    return user, interactions


# -----------------------
# RUN
# -----------------------
def run():
    clean()

    movies, tv = load()

    users = []
    interactions = []

    for _ in range(NUM_USERS):
        u, i = build_user(movies, tv)
        users.append(u)
        interactions.extend(i)

    users_collection.insert_many(users)
    interactions_collection.insert_many(interactions)

    print(f"Inserted users: {len(users)}")
    print(f"Inserted interactions: {len(interactions)}")


if __name__ == "__main__":
    run()