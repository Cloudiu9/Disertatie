from flask import Blueprint, jsonify, request
from app.auth.auth_utils import get_current_user_id
from app.db import movies_collection, tv_collection, users_collection
from bson import ObjectId

bp = Blueprint("onboarding", __name__, url_prefix="/api/onboarding")


@bp.route("/movies")
def onboarding_movies():

    genres = request.args.getlist("genres")

    query = {}
    if genres:
        query["genres"] = {"$in": genres}

    movies = list(
        movies_collection
        .find(query, {"_id": 0})
        .sort("popularity", -1)
        .limit(30)
    )

    return jsonify(movies)


@bp.route("/tv")
def onboarding_tv():

    genres = request.args.getlist("genres")

    query = {}
    if genres:
        query["genres"] = {"$in": genres}

    shows = list(
        tv_collection
        .find(query, {"_id": 0})
        .sort("popularity", -1)
        .limit(30)
    )

    return jsonify(shows)


@bp.route("/complete", methods=["POST"])
def complete_onboarding():

    user_id = get_current_user_id()

    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json

    movies = data.get("movies", [])
    tv = data.get("tv", [])

    if len(movies) < 3 or len(tv) < 3:
        return jsonify({"error": "Minimum 3 selections required"}), 400

    items = []

    for m in movies:
        items.append({"tmdb_id": m, "media_type": "movie"})

    for t in tv:
        items.append({"tmdb_id": t, "media_type": "tv"})

    users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$set": {"onboarding_complete": True},
            "$push": {"my_list": {"$each": items}}
        }
    )

    return jsonify({"success": True})