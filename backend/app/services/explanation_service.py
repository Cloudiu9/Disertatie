import os
import pickle
from groq import Groq
from bson import ObjectId
from app.db import movies_collection, tv_collection, interactions_collection

# ------------------------
# GROQ CLIENT
# ------------------------
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# ------------------------
# LOAD TF-IDF MAPS
# ------------------------
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))

with open(os.path.join(PROJECT_ROOT, "models/movie_tfidf.pkl"), "rb") as f:
    movie_tfidf = pickle.load(f)

with open(os.path.join(PROJECT_ROOT, "models/tv_tfidf.pkl"), "rb") as f:
    tv_tfidf = pickle.load(f)

# ------------------------
# IN-MEMORY CACHE
# ------------------------
_explanation_cache: dict = {}


def _get_user_top_items(user_oid: ObjectId, media_type: str, limit: int = 5) -> list:
    WEIGHT = {"love": 3, "like": 2, "seen": 1}

    interactions = list(interactions_collection.find(
        {"user_id": user_oid, "media_type": media_type},
        {"tmdb_id": 1, "interaction": 1, "_id": 0}
    ))
    interactions.sort(key=lambda x: WEIGHT.get(x.get("interaction", "seen"), 1), reverse=True)
    top_ids = [i["tmdb_id"] for i in interactions[:limit]]

    if not top_ids:
        return []

    collection = movies_collection if media_type == "movie" else tv_collection

    items = list(collection.find(
        {"tmdb_id": {"$in": top_ids}},
        {"_id": 0, "tmdb_id": 1, "title": 1, "name": 1, "genres": 1, "keywords": 1}
    ))

    interaction_map = {i["tmdb_id"]: i.get("interaction", "seen") for i in interactions}
    for item in items:
        item["interaction"] = interaction_map.get(item["tmdb_id"], "seen")

    return items


def _find_source_items(target_tmdb_id: int, user_item_ids: list, tfidf_map: dict) -> list:
    neighbors = {sim_id: score for sim_id, score in tfidf_map.get(target_tmdb_id, [])}
    scored = [
        (item_id, neighbors[item_id])
        for item_id in user_item_ids
        if item_id in neighbors
    ]
    scored.sort(key=lambda x: x[1], reverse=True)
    return [item_id for item_id, _ in scored[:3]]


def _build_prompt(target: dict, source_items: list) -> str:
    """Prompt for user-preference-based explanations (recommendations row)."""
    target_name = target.get("name") or target.get("title") or "this title"
    target_genres = ", ".join(target.get("genres", [])) or "unknown genre"
    target_keywords = ", ".join(target.get("keywords", [])[:5]) or "none"

    sources_text = ""
    for item in source_items:
        label = item.get("interaction", "seen")
        name = item.get("name") or item.get("title") or "unknown"
        genres = ", ".join(item.get("genres", []))
        sources_text += f'  - "{name}" ({label}) — genres: {genres}\n'

    if not sources_text:
        sources_text = "  - (no specific source items found)\n"

    return f"""You are generating a short explanation for a movie/TV recommendation system.

The user has shown interest in:
{sources_text}
They are being recommended: "{target_name}"
  Genres: {target_genres}
  Themes/keywords: {target_keywords}

Write exactly ONE sentence (max 20 words) explaining why "{target_name}" is a good recommendation for this user.
- Be specific — mention a shared genre, theme, or mood
- Sound natural, not robotic
- Do not say "based on your history" or "our algorithm"
- Do not use the word "recommendation"
- Start with "Because" or a similar connector

Only output the sentence itself, nothing else."""


def _build_item_prompt(source: dict, target: dict) -> str:
    """
    Prompt for item-based explanations (DetailsPage).
    References the page item the user is currently viewing,
    not their personal history.
    """
    source_name  = source.get("name") or source.get("title") or "the current title"
    target_name  = target.get("name") or target.get("title") or "this title"
    source_genres  = ", ".join(source.get("genres", [])) or "unknown"
    target_genres  = ", ".join(target.get("genres", [])) or "unknown"
    target_keywords = ", ".join(target.get("keywords", [])[:5]) or "none"

    return f"""You are generating a short explanation for a movie/TV recommendation system.

The user is currently viewing: "{source_name}"
  Genres: {source_genres}

They are being shown a similar title: "{target_name}"
  Genres: {target_genres}
  Themes/keywords: {target_keywords}

Write exactly ONE sentence (max 20 words) explaining why "{target_name}" is similar to "{source_name}".
- Be specific — mention a shared genre, theme, mood, or style
- Sound natural, not robotic
- Do not say "based on your history" or "our algorithm"
- Do not use the word "recommendation"
- Start with "Because" or a similar connector

Only output the sentence itself, nothing else."""


def generate_explanation(user_id: str, tmdb_id: int, media_type: str) -> str:
    """
    User-preference-based explanation.
    Used by UserMovieRecommendationsRow and UserTVRecommendationsRow.
    """
    cache_key = (user_id, tmdb_id, media_type)
    if cache_key in _explanation_cache:
        return _explanation_cache[cache_key]

    try:
        user_oid = ObjectId(user_id)
        tfidf_map = movie_tfidf if media_type == "movie" else tv_tfidf
        collection = movies_collection if media_type == "movie" else tv_collection

        target = collection.find_one(
            {"tmdb_id": tmdb_id},
            {"_id": 0, "title": 1, "name": 1, "genres": 1, "keywords": 1}
        )
        if not target:
            return "Recommended based on your taste profile."

        user_items = _get_user_top_items(user_oid, media_type)
        user_item_ids = [item["tmdb_id"] for item in user_items]
        source_ids = _find_source_items(tmdb_id, user_item_ids, tfidf_map)
        source_items = [item for item in user_items if item["tmdb_id"] in source_ids]

        prompt = _build_prompt(target, source_items)

        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=60,
            temperature=0.7,
        )
        explanation = response.choices[0].message.content.strip()
        _explanation_cache[cache_key] = explanation
        return explanation

    except Exception as e:
        print(f"[Explanation] Error: {e}")
        return "Recommended based on your taste profile."


def generate_explanation_from_item(
    source_tmdb_id: int,
    source_media_type: str,
    target_tmdb_id: int,
    target_media_type: str,
) -> str:
    """
    Item-based explanation.
    Used by DetailsPage recommendations — references the page item,
    not the user's personal history.
    """
    cache_key = ("item", source_tmdb_id, target_tmdb_id, target_media_type)
    if cache_key in _explanation_cache:
        return _explanation_cache[cache_key]

    try:
        source_collection = movies_collection if source_media_type == "movie" else tv_collection
        target_collection = movies_collection if target_media_type == "movie" else tv_collection

        source = source_collection.find_one(
            {"tmdb_id": source_tmdb_id},
            {"_id": 0, "title": 1, "name": 1, "genres": 1}
        )
        target = target_collection.find_one(
            {"tmdb_id": target_tmdb_id},
            {"_id": 0, "title": 1, "name": 1, "genres": 1, "keywords": 1}
        )

        if not source or not target:
            return "Similar themes and style make this a strong match."

        prompt = _build_item_prompt(source, target)

        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=60,
            temperature=0.7,
        )
        explanation = response.choices[0].message.content.strip()
        _explanation_cache[cache_key] = explanation
        return explanation

    except Exception as e:
        print(f"[Explanation] Error (item-based): {e}")
        return "Similar themes and style make this a strong match."