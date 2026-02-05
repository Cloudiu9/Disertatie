import json
import joblib
import numpy as np
from flask import Blueprint, jsonify
from sklearn.metrics.pairwise import cosine_similarity
from pymongo import MongoClient
import os
from dotenv import load_dotenv

bp = Blueprint("recommendations", __name__)

# ------------------------
# LOAD ARTIFACTS (ONCE)
# ------------------------
vectorizer = joblib.load("./artifacts/tfidf_vectorizer.joblib")
tfidf_matrix = joblib.load("./artifacts/tfidf_matrix.joblib")

with open("./artifacts/tfidf_index_to_tmdb.json") as f:
    index_to_tmdb = json.load(f)

# ------------------------
# DB
# ------------------------
client = MongoClient(os.getenv("MONGO_URI"))
db = client["movie_platform"]
movies_collection = db["movies"]

# ------------------------
# ROUTE
# ------------------------
@bp.route("/api/recommendations/movie/<int:tmdb_id>")
def recommend_for_movie(tmdb_id):
    if tmdb_id not in index_to_tmdb:
        return jsonify([])

    idx = index_to_tmdb.index(tmdb_id)

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


    movies = list(
        movies_collection.find(
            {"tmdb_id": {"$in": recommended_tmdb_ids}},
            {"_id": 0},
        )
    )

    for movie in movies:
        movie["similarity"] = round(tmdb_with_scores[movie["tmdb_id"]], 3)

    # Preserve ranking order
    movies.sort(key=lambda m: m["similarity"], reverse=True)

    return jsonify(movies)

