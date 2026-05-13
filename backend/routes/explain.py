from flask import Blueprint, jsonify, request
from app.auth.auth_utils import get_current_user_id
from app.services.explanation_service import generate_explanation

bp = Blueprint("explain", __name__, url_prefix="/api")

@bp.route("/explain", methods=["GET"])
def explain():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    tmdb_id    = request.args.get("tmdb_id", type=int)
    media_type = request.args.get("media_type", type=str)

    if not tmdb_id or media_type not in ("movie", "tv"):
        return jsonify({"error": "Missing or invalid parameters"}), 400

    explanation = generate_explanation(str(user_id), tmdb_id, media_type)
    return jsonify({"explanation": explanation})