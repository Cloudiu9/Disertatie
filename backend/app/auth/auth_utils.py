import os
import jwt
from flask import request
from datetime import datetime
from bson import ObjectId

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALG = "HS256"

def get_current_user_id():
    token = request.cookies.get("access_token")
    if not token:
        return None

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return ObjectId(payload.get("sub"))
    except Exception:
        return None