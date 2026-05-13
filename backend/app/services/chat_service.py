import os
import re
import json
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
# VALID GENRE LISTS
# (must match what's stored in your DB from TMDB)
# ------------------------
MOVIE_GENRES = [
    "Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary",
    "Drama", "Family", "Fantasy", "History", "Horror", "Music", "Mystery",
    "Romance", "Science Fiction", "TV Movie", "Thriller", "War", "Western"
]
TV_GENRES = [
    "Action & Adventure", "Animation", "Comedy", "Crime", "Documentary",
    "Drama", "Family", "Kids", "Mystery", "News", "Reality",
    "Sci-Fi & Fantasy", "Soap", "Talk", "War & Politics", "Western"
]

# ------------------------
# SYSTEM PROMPT
# ------------------------
SYSTEM_PROMPT = f"""You are a movie and TV show recommendation assistant embedded in a streaming platform.
The user will describe what they want to watch in natural language.
Your job is to extract their intent and return a JSON object — nothing else, no markdown, no explanation.

JSON schema:
{{
  "media_type": "movie" | "tv" | "both",
  "genres": [],          // subset of the valid genres below, empty if none apply
  "keywords": [],        // up to 5 thematic keywords (e.g. "heist", "time travel", "redemption")
  "similar_to": null,    // exact title the user mentioned wanting something similar to, or null
  "min_rating": null,    // float 0-10, only if user wants highly rated content
  "max_runtime": null,   // int minutes, only if user wants short films
  "era": null,           // "classic" (pre-1990), "modern" (1990-2010), "recent" (2010+), or null
  "limit": 8,            // how many results, between 6 and 12
  "reply": ""            // one natural, friendly sentence to show the user above the results
}}

Valid movie genres: {", ".join(MOVIE_GENRES)}
Valid TV genres: {", ".join(TV_GENRES)}

Rules:
- Only return the raw JSON object. No markdown fences, no extra text.
- "reply" should be warm and specific, e.g. "Here are some tense psychological thrillers that match that mood."
- If the user is just chatting (no clear watch intent), set all filter fields to null/empty and
  use "reply" to respond conversationally, and set "limit" to 0.
- Never invent movie titles. Only use "similar_to" if the user explicitly names a title.
"""


def _extract_intent(message: str, history: list) -> dict:
    """
    First Groq call: parse the user's message into structured intent JSON.
    """
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Include conversation history for context (last 6 turns max to save tokens)
    for turn in history[-6:]:
        messages.append({"role": turn["role"], "content": turn["content"]})

    messages.append({"role": "user", "content": message})

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=messages,
        max_tokens=300,
        temperature=0.3,   # low temp for consistent JSON
    )

    raw = response.choices[0].message.content.strip()

    # Strip markdown fences if the model wraps anyway
    raw = re.sub(r"^```json\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    return json.loads(raw)


def _find_similar_by_title(title: str, media_type: str) -> list[int]:
    """
    Looks up a title in the DB, then returns its tfidf neighbors.
    Used when user says "something like X".
    """
    collection = movies_collection if media_type != "tv" else tv_collection
    name_field = "title" if media_type != "tv" else "name"
    tfidf_map = movie_tfidf if media_type != "tv" else tv_tfidf

    # Case-insensitive title search
    item = collection.find_one(
        {name_field: {"$regex": f"^{re.escape(title)}$", "$options": "i"}},
        {"tmdb_id": 1, "_id": 0}
    )
    if not item:
        # Fuzzy fallback: partial match
        item = collection.find_one(
            {name_field: {"$regex": re.escape(title), "$options": "i"}},
            {"tmdb_id": 1, "_id": 0}
        )
    if not item:
        return []

    neighbors = tfidf_map.get(item["tmdb_id"], [])
    return [tmdb_id for tmdb_id, _ in neighbors[:40]]


def _build_mongo_query(intent: dict, media_type: str, similar_ids: list) -> dict:
    query = {}

    if similar_ids:
        query["tmdb_id"] = {"$in": similar_ids}

    if intent.get("genres"):
        query["genres"] = {"$in": intent["genres"]}

    if intent.get("keywords"):
        query["keywords"] = {"$in": intent["keywords"]}

    if intent.get("min_rating"):
        query["rating"] = {"$gte": intent["min_rating"]}

    if intent.get("max_runtime"):
        query["runtime"] = {"$lte": intent["max_runtime"], "$gt": 0}

    if intent.get("era"):
        era_map = {
            "classic": ("$lte", 1989),
            "modern":  ("$gte", 1990),   # further filtered below
            "recent":  ("$gte", 2010),
        }
        op, year = era_map[intent["era"]]
        query["year"] = {op: year}
        if intent["era"] == "modern":
            query["year"]["$lte"] = 2009

    return query


def _fetch_results(intent: dict, media_type: str, limit: int) -> list:
    """
    Queries MongoDB for one media type and returns normalized results.
    """
    collection = movies_collection if media_type == "movie" else tv_collection
    name_field = "title" if media_type == "movie" else "name"

    similar_ids = []
    if intent.get("similar_to"):
        similar_ids = _find_similar_by_title(intent["similar_to"], media_type)

    query = _build_mongo_query(intent, media_type, similar_ids)

    # If similar_ids exist, preserve their ranking order;
    # otherwise sort by rating desc
    if similar_ids:
        raw = list(collection.find(query, {"_id": 0}).limit(limit * 2))
        order_map = {tid: i for i, tid in enumerate(similar_ids)}
        raw.sort(key=lambda x: order_map.get(x["tmdb_id"], 9999))
        results = raw[:limit]
    else:
        results = list(
            collection.find(query, {"_id": 0})
            .sort("rating", -1)
            .limit(limit)
        )

    # Normalise the name field to always be "title" for the frontend
    for r in results:
        if "name" in r and "title" not in r:
            r["title"] = r.pop("name")
        r["media_type"] = media_type

    return results


def handle_chat(user_id: str, message: str, history: list) -> dict:
    """
    Main entry point called by the route.
    Returns { reply, results }.
    """
    try:
        intent = _extract_intent(message, history)
    except Exception as e:
        print(f"[Chat] Intent parsing failed: {e}")
        return {
            "reply": "Sorry, I didn't quite catch that — could you rephrase?",
            "results": []
        }

    limit = int(intent.get("limit") or 0)
    reply = intent.get("reply", "Here are some picks for you!")

    if limit == 0:
        # Pure conversation turn, no results needed
        return {"reply": reply, "results": []}

    media_type = intent.get("media_type", "both")
    results = []

    if media_type in ("movie", "both"):
        results += _fetch_results(intent, "movie", limit)

    if media_type in ("tv", "both"):
        results += _fetch_results(intent, "tv", limit)

    # If filters were too narrow and we got nothing, fall back to genre-only
    if not results and (intent.get("genres") or intent.get("keywords")):
        fallback_intent = {"genres": intent.get("genres", []), "keywords": []}
        if media_type in ("movie", "both"):
            results += _fetch_results(fallback_intent, "movie", limit)
        if media_type in ("tv", "both"):
            results += _fetch_results(fallback_intent, "tv", limit)
        if results:
            reply += " (I broadened the search a little to find these.)"

    if not results:
        return {
            "reply": "I couldn't find anything matching that in the library — try describing the mood or a genre instead.",
            "results": []
        }

    return {"reply": reply, "results": results[:limit]}