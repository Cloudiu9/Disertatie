from flask import Blueprint, request, jsonify
from bson import ObjectId
from app.db import users_collection, movies_collection
from app.auth.auth_utils import get_current_user_id

bp = Blueprint("my_list", __name__, url_prefix="/api")


@bp.route("/my-list", methods=["GET"])
def get_my_list():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    user = users_collection.find_one(
        {"_id": ObjectId(user_id)},
        {"my_list": 1}
    )

    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    movie_ids = user.get("my_list", [])

    movies = list(
        movies_collection.find(
            {"tmdb_id": {"$in": movie_ids}},
            {"_id": 0}
        )
    )

    # Preserve user order
    movies.sort(key=lambda m: movie_ids.index(m["tmdb_id"]))

    return jsonify(movies)


@bp.route("/my-list", methods=["POST"])
def add_to_my_list():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(force=True)
    tmdb_id = data.get("tmdb_id")

    if not isinstance(tmdb_id, int):
        return jsonify({"error": "tmdb_id required"}), 400

    users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$addToSet": {"my_list": tmdb_id}}
    )

    return jsonify({"status": "added"}), 200


@bp.route("/my-list/<int:tmdb_id>", methods=["DELETE"])
def remove_from_my_list(tmdb_id):
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$pull": {"my_list": tmdb_id}}
    )

    return jsonify({"status": "removed"}), 200
