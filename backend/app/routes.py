from flask import Blueprint, jsonify, request
from app.db import movies_collection

bp = Blueprint("routes", __name__)

@bp.route("/api/movies", methods=["GET"])
def get_movies():
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 10))
    skip = (page - 1) * limit

    sort_param = request.args.get("sort", "rating")
    genre_param = request.args.get("genre")

    SORT_FIELDS = {
        "rating": "rating",
        "popularity": "popularity",
        "year": "year"
    }

    sort_field = SORT_FIELDS.get(sort_param, "rating")

    # ------------------------
    # FILTER BUILDING
    # ------------------------
    filter_query = {}

    # Vote cutoff for rating sort
    if sort_field == "rating":
        filter_query["votes"] = {"$gt": 2000}

    # Genre filter
    if genre_param:
        filter_query["genres"] = genre_param


    # ------------------------
    # QUERY
    # ------------------------
    movies_cursor = (
        movies_collection
        .find(filter_query, {"_id": 0})
        .sort([
            (sort_field, -1),
            ("tmdb_id", 1)
        ])
        .skip(skip)
        .limit(limit)
    )

    movies = list(movies_cursor)
    total = movies_collection.count_documents(filter_query)

    return jsonify({
        "page": page,
        "limit": limit,
        "sort": sort_field,
        "genre": genre_param,
        "total": total,
        "results": movies
    })


@bp.route("/api/movies/<int:tmdb_id>", methods=["GET"])
def get_movie(tmdb_id):
    movie = movies_collection.find_one(
        {"tmdb_id": tmdb_id},
        {"_id": 0}
    )

    if not movie:
        return jsonify({"error": "Movie not found"}), 404

    return jsonify(movie)

@bp.route("/api/movies/search", methods=["GET"])
def search_movies():
    query = request.args.get("q", "").strip()

    if not query:
        return jsonify([])

    movies = list(
        movies_collection.find(
            {"title": {"$regex": query, "$options": "i"}},
            {"_id": 0}
        ).limit(20)
    )

    return jsonify(list(movies))

@bp.route("/api/genres", methods=["GET"])
def get_genres():
    genres = movies_collection.distinct("genres")
    genres = sorted(genres)
    return jsonify(genres)
