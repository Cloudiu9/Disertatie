import json
import joblib
import numpy as np
from flask import Blueprint, jsonify
from sklearn.metrics.pairwise import cosine_similarity
from pymongo import MongoClient
import os

bp = Blueprint("recommendations", __name__)

# ------------------------
# LOAD ARTIFACTS (ONCE)
# ------------------------
vectorizer = joblib.load("./artifacts/tfidf_vectorizer.joblib")
tfidf_matrix = joblib.load("./artifacts/tfidf_matrix.joblib")

with open("./artifacts/tfidf_index_to_tmdb.json") as f:
    index_to_tmdb = json.load(f)

# O(1) lookup map
tmdb_to_index = {tmdb: i for i, tmdb in enumerate(index_to_tmdb)}

tv_vectorizer = joblib.load("./artifacts/tv_vectorizer.joblib")
tv_tfidf_matrix = joblib.load("./artifacts/tv_tfidf_matrix.joblib")

with open("./artifacts/tv_index_to_tmdb.json") as f:
    tv_index_to_tmdb = json.load(f)

# O(1) lookup map (TV)
tv_tmdb_to_index = {tmdb: i for i, tmdb in enumerate(tv_index_to_tmdb)}

# ------------------------
# DB
# ------------------------
client = MongoClient(os.getenv("MONGO_URI"))
db = client["movie_platform"]
movies_collection = db["movies"]
tv_collection = db["tv"]

# ------------------------
# MOVIE RECOMMENDATIONS
# ------------------------
@bp.route("/api/recommendations/movie/<int:tmdb_id>", methods=["GET"])
def recommend_for_movie(tmdb_id):

    idx = tmdb_to_index.get(tmdb_id)
    if idx is None:
        return jsonify({"error": "TMDB id not found in model"}), 404

    similarities = cosine_similarity(
        tfidf_matrix[idx], tfidf_matrix
    ).flatten()

    # Exclude itself
    similarities[idx] = 0

    top_indices = np.argsort(similarities)[-10:][::-1]

    tmdb_with_scores = {
        index_to_tmdb[i]: float(similarities[i])
        for i in top_indices
    }

    recommended_tmdb_ids = list(tmdb_with_scores.keys())

    # Fetch once
    movies_cursor = movies_collection.find(
        {"tmdb_id": {"$in": recommended_tmdb_ids}},
        {"_id": 0},
    )

    # Map for deterministic ordering
    movies_map = {m["tmdb_id"]: m for m in movies_cursor}

    movies = []
    for mid in recommended_tmdb_ids:
        if mid in movies_map:
            movie = movies_map[mid]
            movie["similarity"] = round(tmdb_with_scores[mid], 3)
            movies.append(movie)

    return jsonify(movies)


# ------------------------
# TV RECOMMENDATIONS
# ------------------------
@bp.route("/api/recommendations/tv/<int:tmdb_id>", methods=["GET"])
def recommend_for_tv(tmdb_id):

    idx = tv_tmdb_to_index.get(tmdb_id)
    if idx is None:
        return jsonify({"error": "TMDB id not found in model"}), 404

    similarities = cosine_similarity(
        tv_tfidf_matrix[idx], tv_tfidf_matrix
    ).flatten()

    similarities[idx] = 0

    top_indices = np.argsort(similarities)[-10:][::-1]

    tmdb_with_scores = {
        tv_index_to_tmdb[i]: float(similarities[i])
        for i in top_indices
    }

    recommended_tmdb_ids = list(tmdb_with_scores.keys())

    shows_cursor = tv_collection.find(
        {"tmdb_id": {"$in": recommended_tmdb_ids}},
        {"_id": 0},
    )

    shows_map = {s["tmdb_id"]: s for s in shows_cursor}

    shows = []
    for tid in recommended_tmdb_ids:
        if tid in shows_map:
            show = shows_map[tid]
            show["similarity"] = round(tmdb_with_scores[tid], 3)
            shows.append(show)

    return jsonify(shows)