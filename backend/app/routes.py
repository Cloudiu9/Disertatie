from flask import Blueprint, jsonify, request
from app.db import movies_collection

bp = Blueprint("routes", __name__)

@bp.route("/api/movies", methods=["GET"])
def get_movies():
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 10))
    skip = (page - 1) * limit

    sort_param = request.args.get("sort", "rating")

    SORT_FIELDS = {
        "rating": "rating",
        "popularity": "popularity",
        "year": "year"
    }

    sort_field = SORT_FIELDS.get(sort_param, "rating")

    movies_cursor = (
        movies_collection
        .find({}, {"_id": 0})
        .sort([(sort_field, -1),   # sort principal
               ("tmdb_id", 1)      # sort secundar stabil
        ])
        .skip(skip)
        .limit(limit)
    )

    movies = list(movies_cursor)
    total = movies_collection.count_documents({})

    return jsonify({
        "page": page,
        "limit": limit,
        "sort": sort_field,
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
