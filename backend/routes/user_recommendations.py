from flask import Blueprint, jsonify
from collections import Counter
from app.auth.auth_utils import get_current_user_id
from app.db import users_collection, movies_collection

bp = Blueprint("user_recommendations", __name__, url_prefix="/api")

@bp.route("/user_recommendations", methods=["GET"])
def get_recommendations():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    current_user = users_collection.find_one({"_id": user_id})
    if not current_user:
        return jsonify({"error": "Unauthorized"}), 401

    user_list = current_user.get("my_list", [])

    if len(user_list) < 3:
        return jsonify([])

    similar_users = users_collection.find({
        "_id": {"$ne": user_id},
        "my_list": {"$in": user_list}
    })

    movie_counter = Counter()

    for user in similar_users:
        for movie_id in user.get("my_list", []):
            if movie_id not in user_list:
                movie_counter[movie_id] += 1

    recommended_ids = [
        movie_id for movie_id, _ in movie_counter.most_common(12)
    ]

    if not recommended_ids:
        return jsonify([])

    movies = list(
        movies_collection.find(
            {"tmdb_id": {"$in": recommended_ids}},
            {"_id": 0}
        )
    )

    # preserve ranking order
    movies.sort(
        key=lambda m: recommended_ids.index(m["tmdb_id"])
    )

    return jsonify(movies)
