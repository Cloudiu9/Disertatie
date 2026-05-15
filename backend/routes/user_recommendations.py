from flask import Blueprint, jsonify, request
from app.auth.auth_utils import get_current_user_id
from app.services.recommendation_service import (
    generate_user_movie_recommendations,
    generate_user_tv_recommendations,
)

bp = Blueprint("user_recommendations", __name__, url_prefix="/api")


@bp.route("/user_recommendations/movies", methods=["GET"])
def get_movie_recommendations():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    limit = min(int(request.args.get("limit", 24)), 48)  # cap at 48
    movies = generate_user_movie_recommendations(user_id, limit=limit)
    return jsonify(movies)

@bp.route("/user_recommendations/tv", methods=["GET"])
def get_tv_recommendations():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    limit = min(int(request.args.get("limit", 24)), 48)
    shows = generate_user_tv_recommendations(user_id, limit=limit)
    return jsonify(shows)