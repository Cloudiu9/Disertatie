from flask import Blueprint, jsonify, request
from app.auth.auth_utils import get_current_user_id
from app.services.chat_service import handle_chat

bp = Blueprint("chat", __name__, url_prefix="/api")

@bp.route("/chat", methods=["POST"])
def chat():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    body = request.get_json(silent=True) or {}
    message = (body.get("message") or "").strip()
    history = body.get("history") or []   # [{ role, content }, ...]

    if not message:
        return jsonify({"error": "Empty message"}), 400

    result = handle_chat(str(user_id), message, history)
    return jsonify(result)