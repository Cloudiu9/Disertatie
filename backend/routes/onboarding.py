from flask import Blueprint, jsonify, request
from app.auth.auth_utils import get_current_user_id
from app.db import movies_collection, tv_collection, users_collection, interactions_collection
from bson import ObjectId
from datetime import datetime

bp = Blueprint("onboarding", __name__, url_prefix="/api/onboarding")

GENRE_MAP_MOVIE = {
    "Sci-Fi": "Science Fiction"
}

GENRE_MAP_TV = {
    "Action": "Action & Adventure",
    "Adventure": "Action & Adventure",
    "Sci-Fi": "Sci-Fi & Fantasy",
    "Fantasy": "Sci-Fi & Fantasy"
}


def normalize_genres(genres, media_type):
    mapped = []

    for g in genres:
        if media_type == "movie":
            mapped.append(GENRE_MAP_MOVIE.get(g, g))
        else:
            mapped.append(GENRE_MAP_TV.get(g, g))

    return list(set(mapped))


@bp.route("/movies")
def onboarding_movies():

    genres = request.args.getlist("genres")
    genres = normalize_genres(genres, "movie")

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
    genres = normalize_genres(genres, "tv")

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

    movies = data.get("movies", {})
    tv = data.get("tv", {})

    if len(movies) < 3 or len(tv) < 3:
        return jsonify({"error": "Minimum 3 interactions required"}), 400

    my_list_items = []

    # STORE MOVIE INTERACTIONS
    for tmdb_id, interaction in movies.items():

        tmdb_id = int(tmdb_id)

        interactions_collection.update_one(
            {
                "user_id": ObjectId(user_id),
                "tmdb_id": tmdb_id,
                "media_type": "movie"
            },
            {
                "$set": {
                    "interaction": interaction,
                    "created_at": datetime.utcnow()
                }
            },
            upsert=True
        )

        if interaction == "love" or interaction == "like":
            my_list_items.append({
                "tmdb_id": tmdb_id,
                "media_type": "movie"
            })

    # STORE TV INTERACTIONS
    for tmdb_id, interaction in tv.items():

        tmdb_id = int(tmdb_id)

        interactions_collection.update_one(
            {
                "user_id": ObjectId(user_id),
                "tmdb_id": tmdb_id,
                "media_type": "tv"
            },
            {
                "$set": {
                    "interaction": interaction,
                    "created_at": datetime.utcnow()
                }
            },
            upsert=True
        )

        if interaction == "love" or interaction == "like":
            my_list_items.append({
                "tmdb_id": tmdb_id,
                "media_type": "tv"
            })

    # UPDATE USER
    update_data = {
        "$set": {
            "onboarding_complete": True,
            "preferred_genres": data.get("genres", [])
        }
    }

    if my_list_items:
        update_data["$addToSet"] = {
            "my_list": {"$each": my_list_items}
        }

    users_collection.update_one(
        {"_id": ObjectId(user_id)},
        update_data
    )

    return jsonify({"success": True})