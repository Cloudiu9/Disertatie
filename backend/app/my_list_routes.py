from flask import Blueprint, request, jsonify
from bson import ObjectId

from app.db import users_collection, movies_collection, tv_collection
from app.auth.auth_utils import get_current_user_id

bp = Blueprint("my_list", __name__, url_prefix="/api")


# =========================
# GET MY LIST
# =========================

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

    items = user.get("my_list", [])

    result = []

    for entry in items:

        if isinstance(entry,int):

            tmdb_id=entry

            movie=movies_collection.find_one(
                {"tmdb_id":tmdb_id},
                {"_id":0}
            )

            if movie:

                movie["media_type"]="movie"

                result.append(movie)

            continue

        tmdb_id = entry.get("tmdb_id")
        media_type = entry.get("media_type")

        if media_type == "movie":

            movie = movies_collection.find_one(
                {"tmdb_id": tmdb_id},
                {"_id": 0}
            )

            if movie:
                movie["media_type"] = "movie"
                result.append(movie)

        elif media_type == "tv":

            tv = tv_collection.find_one(
                {"tmdb_id": tmdb_id},
                {"_id": 0}
            )

            if tv:
                tv["media_type"] = "tv"
                result.append(tv)

    return jsonify(result)


# =========================
# ADD
# =========================

@bp.route("/my-list", methods=["POST"])
def add_to_my_list():

    user_id = get_current_user_id()

    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(force=True)

    tmdb_id = data.get("tmdb_id")
    media_type = data.get("media_type")

    if not isinstance(tmdb_id, int):

        return jsonify({"error": "tmdb_id required"}), 400

    if media_type not in ["movie", "tv"]:

        return jsonify({"error": "media_type required"}), 400


    users_collection.update_one(

        {"_id": ObjectId(user_id)},

        {
            "$addToSet": {
                "my_list": {
                    "tmdb_id": tmdb_id,
                    "media_type": media_type
                }
            }
        }

    )

    return jsonify({"status": "added"})


# =========================
# REMOVE
# =========================

@bp.route("/my-list/<int:tmdb_id>/<media_type>", methods=["DELETE"])
def remove_from_my_list(tmdb_id, media_type):

    user_id = get_current_user_id()

    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    users_collection.update_one(

        {"_id": ObjectId(user_id)},

        {
            "$pull": {
                "my_list": {
                    "tmdb_id": tmdb_id,
                    "media_type": media_type
                }
            }
        }

    )

    return jsonify({"status": "removed"})