import os
import jwt
import bcrypt
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, make_response
from email_validator import validate_email, EmailNotValidError
from app.auth.auth_utils import get_current_user_id
from app.db import users_collection

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_EXPIRES_DAYS = int(os.getenv("JWT_EXPIRES_DAYS", 7))


# ------------------------
# HELPERS
# ------------------------
def hash_password(password: str) -> bytes:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12))


def verify_password(password: str, password_hash: bytes) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash)


def create_jwt(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(days=JWT_EXPIRES_DAYS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def validate_password_rules(password: str) -> bool:
    if len(password) < 10:
        return False
    if not any(c.isupper() for c in password):
        return False
    if len(set(password)) < len(password):
        return True  # has unique chars
    return True


# ------------------------
# ROUTES
# ------------------------
@bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(force=True)
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    try:
        validate_email(email)
    except EmailNotValidError:
        return jsonify({"error": "Invalid email"}), 400

    if not validate_password_rules(password):
        return jsonify({
            "error": "Password must be at least 10 chars and contain 1 uppercase letter"
        }), 400

    try:
        users_collection.insert_one({
            "email": email,
            "password_hash": hash_password(password),
            "my_list": [],
            "created_at": datetime.utcnow(),
            "last_login": None,
        })
    except Exception:
        return jsonify({"error": "Email already registered"}), 409

    return jsonify({"status": "registered"}), 201


@bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(force=True)
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    user = users_collection.find_one({"email": email})
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401

    if not verify_password(password, user["password_hash"]):
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_jwt(str(user["_id"]), email)

    users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.utcnow()}}
    )

    response = make_response(jsonify({"email": email}))
    response.set_cookie(
        "access_token",
        token,
        httponly=True,
        samesite="Lax",
        secure=False,  # IMP set True in production (HTTPS)
        max_age=JWT_EXPIRES_DAYS * 24 * 60 * 60,
    )

    return response

@bp.route("/me", methods=["GET"])
def me():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    user = users_collection.find_one(
        {"_id": user_id},
        {"password_hash": 0}
    )

    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    user["_id"] = str(user["_id"])
    return jsonify(user)
