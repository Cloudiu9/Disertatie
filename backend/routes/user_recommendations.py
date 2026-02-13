from flask import Blueprint, jsonify
from app.auth.auth_utils import get_current_user_id
from app.services.recommendation_service import generate_user_recommendations

bp = Blueprint("user_recommendations", __name__, url_prefix="/api")


@bp.route("/user_recommendations", methods=["GET"])
def get_recommendations():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    movies = generate_user_recommendations(user_id)

    return jsonify(movies)
