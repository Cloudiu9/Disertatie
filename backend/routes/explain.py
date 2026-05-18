from flask import Blueprint, jsonify, request
from app.auth.auth_utils import get_current_user_id
from app.services.explanation_service import (
    generate_explanation,
    generate_explanation_from_item,
)

bp = Blueprint("explain", __name__, url_prefix="/api")

@bp.route("/explain", methods=["GET"])
def explain():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    tmdb_id    = request.args.get("tmdb_id", type=int)
    media_type = request.args.get("media_type", type=str)

    # Optional — only present when called from DetailsPage
    source_tmdb_id    = request.args.get("source_tmdb_id", type=int)
    source_media_type = request.args.get("source_media_type", type=str)

    if not tmdb_id or media_type not in ("movie", "tv"):
        return jsonify({"error": "Missing or invalid parameters"}), 400

    if source_tmdb_id and source_media_type in ("movie", "tv"):
        # DetailsPage context: explain similarity to the source item
        explanation = generate_explanation_from_item(
            source_tmdb_id, source_media_type,
            tmdb_id, media_type
        )
    else:
        # Recommendations row context: explain via user preferences
        explanation = generate_explanation(str(user_id), tmdb_id, media_type)

    return jsonify({"explanation": explanation})