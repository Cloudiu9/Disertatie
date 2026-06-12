import json
import pickle
import os
from flask import Blueprint, jsonify
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()
bp = Blueprint("recommendations", __name__)

# ------------------------
# PATHS & MODEL LOADING (ONCE AT STARTUP)
# ------------------------
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../"))
MODELS_PATH = os.path.join(PROJECT_ROOT, "models")

# Load precomputed O(1) similarity lookups built by our build scripts
with open(os.path.join(MODELS_PATH, "movie_tfidf.pkl"), "rb") as f:
    movie_similarity_map = pickle.load(f)

with open(os.path.join(MODELS_PATH, "tv_tfidf.pkl"), "rb") as f:
    tv_similarity_map = pickle.load(f)

# ------------------------
# DB CONNECTION
# ------------------------
client = MongoClient(os.getenv("MONGO_URI"))
db = client["movie_platform"]
movies_collection = db["movies"]
tv_collection = db["tv"]

# ------------------------
# MOVIE-TO-MOVIE RECOMMENDATIONS
# ------------------------
@bp.route("/api/recommendations/movie/<int:tmdb_id>", methods=["GET"])
def recommend_for_movie(tmdb_id):
    # O(1) Fetch precomputed similarities
    similar_items = movie_similarity_map.get(tmdb_id)
    if similar_items is None:
        return jsonify({"error": "TMDB id not found in precomputed model"}), 404

    # Extract the top 10 recommendations from the precomputed top 50
    top_10_matches = similar_items[:10]
    if not top_10_matches:
        return jsonify([])

    # Map tmdb_id -> similarity score for quick local lookup
    scores_map = {item_id: score for item_id, score in top_10_matches}
    recommended_ids = list(scores_map.keys())

    # Batch fetch the documents from MongoDB in a single roundtrip
    movies_cursor = movies_collection.find(
        {"tmdb_id": {"$in": recommended_ids}},
        {"_id": 0},
    )

    # Convert cursor to a map to fix MongoDB's naturally unordered retrieval
    movies_db_map = {m["tmdb_id"]: m for m in movies_cursor}

    # Reconstruct the collection with deterministic sort order
    recommended_movies = []
    for mid in recommended_ids:
        if mid in movies_db_map:
            movie = movies_db_map[mid]
            movie["similarity"] = round(scores_map[mid], 3)
            recommended_movies.append(movie)

    return jsonify(recommended_movies)


# ------------------------
# TV-TO-TV RECOMMENDATIONS
# ------------------------
@bp.route("/api/recommendations/tv/<int:tmdb_id>", methods=["GET"])
def recommend_for_tv(tmdb_id):
    # O(1) Fetch precomputed similarities
    similar_items = tv_similarity_map.get(tmdb_id)
    if similar_items is None:
        return jsonify({"error": "TMDB id not found in precomputed model"}), 404

    # Extract the top 10 recommendations from the precomputed top 50
    top_10_matches = similar_items[:10]
    if not top_10_matches:
        return jsonify([])

    scores_map = {item_id: score for item_id, score in top_10_matches}
    recommended_ids = list(scores_map.keys())

    # Batch fetch from MongoDB
    shows_cursor = tv_collection.find(
        {"tmdb_id": {"$in": recommended_ids}},
        {"_id": 0},
    )

    shows_db_map = {s["tmdb_id"]: s for s in shows_cursor}

    # Reconstruct collection with deterministic sort order
    recommended_shows = []
    for tid in recommended_ids:
        if tid in shows_db_map:
            show = shows_db_map[tid]
            show["similarity"] = round(scores_map[tid], 3)
            recommended_shows.append(show)

    return jsonify(recommended_shows)