from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

from app.auth.auth_utils import get_current_user_id
from app.db import interactions_collection, movies_collection, tv_collection, users_collection

bp = Blueprint("onboarding", __name__, url_prefix="/api/onboarding")

# Mirrors GENRE_MAP in OnboardingPage.tsx exactly.
# Any change on the frontend must be reflected here.
GENRE_MAP = {
    "Action":      {"movie": ["Action", "Adventure"],    "tv": ["Action & Adventure"]},
    "Comedy":      {"movie": ["Comedy"],                 "tv": ["Comedy"]},
    "Drama":       {"movie": ["Drama"],                  "tv": ["Drama"]},
    "Thriller":    {"movie": ["Thriller", "Crime"],      "tv": ["Crime", "Mystery"]},
    "Sci-Fi":      {"movie": ["Science Fiction"],        "tv": ["Sci-Fi & Fantasy"]},
    "Fantasy":     {"movie": ["Fantasy"],                "tv": ["Sci-Fi & Fantasy"]},
    "Adventure":   {"movie": ["Adventure"],              "tv": ["Action & Adventure"]},
    "Animation":   {"movie": ["Animation"],              "tv": ["Animation"]},
    "Documentary": {"movie": ["Documentary"],            "tv": ["Documentary"]},
    "Mystery":     {"movie": ["Mystery"],                "tv": ["Mystery"]},
    "Family":      {"movie": ["Family"],                 "tv": ["Family", "Kids"]},
}

VALID_INTERACTIONS = {"seen", "like", "love"}


# ---------------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------------

def _unique_preserve_order(values):
    """Deduplicate a list while preserving original order."""
    seen = set()
    output = []
    for value in values:
        if value not in seen:
            seen.add(value)
            output.append(value)
    return output


def _normalize_genre_keys(raw_genres):
    """
    Accept whatever the frontend sends for 'genres' and return a clean list
    of valid GENRE_MAP keys. Handles string, list, and None gracefully.
    """
    if isinstance(raw_genres, str):
        raw_genres = [raw_genres]

    if not isinstance(raw_genres, (list, tuple)):
        return []

    cleaned = []
    for genre in raw_genres:
        if isinstance(genre, str):
            genre = genre.strip()
            if genre and genre in GENRE_MAP:
                cleaned.append(genre)

    return _unique_preserve_order(cleaned)


def _expand_preferred_genres(selected_genre_keys):
    """
    Convert validated UI genre keys (e.g. ["Sci-Fi", "Action"]) into a
    deduplicated list of real DB genre names (e.g. ["Science Fiction",
    "Sci-Fi & Fantasy", "Action", "Adventure", "Action & Adventure"]).

    Storing the expanded form means preferred_genres is directly queryable
    against the movies and tv collections without further mapping.
    """
    expanded = []
    for genre_key in selected_genre_keys:
        expanded.extend(GENRE_MAP[genre_key]["movie"])
        expanded.extend(GENRE_MAP[genre_key]["tv"])
    return _unique_preserve_order(expanded)


def _build_genre_query(genres):
    """
    Build a MongoDB $in query from a list of genre strings.
    Returns an empty dict (no filter) if the input is empty or invalid.
    """
    if isinstance(genres, str):
        genres = [genres]
    if not isinstance(genres, (list, tuple)):
        return {}

    cleaned = _unique_preserve_order(
        [g.strip() for g in genres if isinstance(g, str) and g.strip()]
    )
    return {"genres": {"$in": cleaned}} if cleaned else {}


def _store_interactions(user_oid, media_type, items):
    """
    Upsert each interaction into interactions_collection and return
    a my_list entry for every item regardless of interaction type.

    Why all interactions go to my_list:
      recommendation_service.py seeds collaborative filtering from
      my_list (_extract_ids). If only like/love items are added,
      a user who marks everything as "seen" during onboarding ends up
      with an empty seed pool and receives no personalised recommendations.
      interactions_collection still records the exact type (seen/like/love)
      so _get_content_scores can weight them correctly (×1/×2/×3).
    """
    my_list_items = []

    for tmdb_id_raw, interaction in items.items():
        if interaction not in VALID_INTERACTIONS:
            raise ValueError(f"Invalid interaction value: '{interaction}'")

        try:
            tmdb_id = int(tmdb_id_raw)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"Invalid tmdb_id: {tmdb_id_raw!r}") from exc

        interactions_collection.update_one(
            {
                "user_id": user_oid,
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

        # All selections bootstrap the recommendation seed pool.
        # The interaction type is already recorded above for score weighting.
        my_list_items.append({"tmdb_id": tmdb_id, "media_type": media_type})

    return my_list_items


# ---------------------------------------------------------------------------
# ROUTES
# ---------------------------------------------------------------------------

@bp.route("/movies")
def onboarding_movies():
    genres = request.args.getlist("genres")
    query = _build_genre_query(genres)
    movies = list(
        movies_collection.find(query, {"_id": 0})
        .sort("popularity", -1)
        .limit(30)
    )
    return jsonify(movies)


@bp.route("/tv")
def onboarding_tv():
    genres = request.args.getlist("genres")
    query = _build_genre_query(genres)
    shows = list(
        tv_collection.find(query, {"_id": 0})
        .sort("popularity", -1)
        .limit(30)
    )
    return jsonify(shows)


@bp.route("/complete", methods=["POST"])
def complete_onboarding():
    user_oid = get_current_user_id()
    if not user_oid:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}

    movies = data.get("movies") or {}
    tv     = data.get("tv") or {}

    if not isinstance(movies, dict) or not isinstance(tv, dict):
        return jsonify({"error": "Invalid payload"}), 400

    if len(movies) < 3 or len(tv) < 3:
        return jsonify({"error": "Minimum 3 interactions required"}), 400

    # Validate and expand genre keys before touching the DB
    selected_genre_keys = _normalize_genre_keys(data.get("genres"))
    preferred_genres    = _expand_preferred_genres(selected_genre_keys)

    try:
        my_list_items = []
        my_list_items.extend(_store_interactions(user_oid, "movie", movies))
        my_list_items.extend(_store_interactions(user_oid, "tv", tv))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    update_data = {
        "$set": {
            "onboarding_complete": True,
            "preferred_genres": preferred_genres,
        }
    }

    if my_list_items:
        update_data["$addToSet"] = {"my_list": {"$each": my_list_items}}

    users_collection.update_one({"_id": user_oid}, update_data)

    # Return preferred_genres so the frontend/logs can confirm what was stored
    return jsonify({"success": True, "preferred_genres": preferred_genres})