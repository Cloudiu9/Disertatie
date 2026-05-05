from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from bson import ObjectId

from app.db import users_collection, movies_collection, tv_collection, interactions_collection
from app.auth.auth_utils import get_current_user_id

bp = Blueprint("my_list", __name__, url_prefix="/api")


# =========================
# GET MY LIST
# =========================

def _collection_for(media_type: str):
    return movies_collection if media_type == "movie" else tv_collection


@bp.route("/my-list", methods=["GET"])
def get_my_list():
    user_id = get_current_user_id()

    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    user_oid = ObjectId(user_id)
    user = users_collection.find_one({"_id": user_oid}, {"my_list": 1})

    if not user:
        return jsonify([])

    raw_watchlist = user.get("my_list", []) or []

    watched = []
    watched_keys = set()

    for interaction in interactions_collection.find(
        {"user_id": user_oid},
        {"_id": 0, "tmdb_id": 1, "media_type": 1, "interaction": 1},
    ):
        key = (interaction["tmdb_id"], interaction["media_type"])
        watched_keys.add(key)

        collection = _collection_for(interaction["media_type"])
        doc = collection.find_one({"tmdb_id": interaction["tmdb_id"]}, {"_id": 0})

        if not doc:
            continue

        doc["media_type"] = interaction["media_type"]
        doc["section"] = "watched"
        doc["interaction"] = interaction["interaction"]
        watched.append(doc)

    watchlist = []
    for item in raw_watchlist:
        if not isinstance(item, dict):
            continue

        tmdb_id = item.get("tmdb_id")
        media_type = item.get("media_type")

        if tmdb_id is None or media_type not in {"movie", "tv"}:
            continue

        key = (tmdb_id, media_type)
        if key in watched_keys:
            continue

        collection = _collection_for(media_type)
        doc = collection.find_one({"tmdb_id": tmdb_id}, {"_id": 0})

        if not doc:
            continue

        doc["media_type"] = media_type
        doc["section"] = "watchlist"
        watchlist.append(doc)

    return jsonify(watched + watchlist)


# =========================
# ADD
# =========================

@bp.route("/my-list", methods=["POST"])
def add_to_my_list():

    user_id = get_current_user_id()

    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(force=True)

    tmdb_id = data.get("tmdb_id")
    media_type = data.get("media_type")

    if not isinstance(tmdb_id, int):

        return jsonify({"error": "tmdb_id required"}), 400

    if media_type not in ["movie", "tv"]:

        return jsonify({"error": "media_type required"}), 400

    section = data.get("section", "watchlist")  # or "watched"
    if section not in {"watchlist", "watched"}:
        return jsonify({"error": "invalid section"}), 400

    interaction = data.get("interaction", "seen")
    if interaction not in {"seen", "like", "love"}:
        return jsonify({"error": "invalid interaction"}), 400

    if section == "watched":
        # 1. store interaction
        interactions_collection.update_one(
            {
                "user_id": ObjectId(user_id),
                "tmdb_id": tmdb_id,
                "media_type": media_type,
            },
            {
                "$set": {
                    "interaction": interaction,
                    "created_at": datetime.now(timezone.utc),
                }
            },
            upsert=True,
        )

        # 2. remove from watchlist if present
        users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$pull": {
                    "my_list": {
                        "tmdb_id": tmdb_id,
                        "media_type": media_type,
                    }
                }
            },
        )
    else:
        users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$addToSet": {
                    "my_list": {
                        "tmdb_id": tmdb_id,
                        "media_type": media_type,
                    }
                }
            },
        )

    return jsonify({"status": "added"})


# =========================
# REMOVE
# =========================

@bp.route("/my-list/<int:tmdb_id>/<media_type>", methods=["DELETE"])
def remove_from_my_list(tmdb_id, media_type):
    user_id = get_current_user_id()

    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    section = request.args.get("section", "watchlist")

    if section == "watched":
        interactions_collection.delete_one(
            {
                "user_id": ObjectId(user_id),
                "tmdb_id": tmdb_id,
                "media_type": media_type,
            }
        )

        users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$pull": {
                    "my_list": {
                        "tmdb_id": tmdb_id,
                        "media_type": media_type,
                    }
                }
            }
        )
    else:
        users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$pull": {
                    "my_list": {
                        "tmdb_id": tmdb_id,
                        "media_type": media_type,
                    }
                }
            }
        )

    return jsonify({"success": True})

@bp.route("/reset-preferences", methods=["POST"])
def reset_preferences():

    user_id = get_current_user_id()

    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    user_object_id = ObjectId(user_id)

    # remove interaction signals
    interactions_collection.delete_many({
        "user_id": user_object_id
    })

    # clear my_list
    users_collection.update_one(
        {"_id": user_object_id},
        {
            "$set": {
                "my_list": [],
                "preferred_genres": [],
                "onboarding_complete": False
            }
        }
    )

    return jsonify({"success": True})