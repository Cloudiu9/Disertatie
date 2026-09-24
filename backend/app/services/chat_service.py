import os
import re
import json
import pickle

from groq import Groq
from groq.types.chat import ChatCompletionMessageParam

from app.db import movies_collection, tv_collection


# ------------------------
# GROQ CLIENT
# ------------------------
client = Groq(api_key=os.getenv("GROQ_API_KEY"))


# ------------------------
# LOAD TF-IDF MAPS
# ------------------------
PROJECT_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../")
)

with open(os.path.join(PROJECT_ROOT, "models/movie_tfidf.pkl"), "rb") as f:
    movie_tfidf = pickle.load(f)

with open(os.path.join(PROJECT_ROOT, "models/tv_tfidf.pkl"), "rb") as f:
    tv_tfidf = pickle.load(f)


# ------------------------
# VALID GENRE LISTS
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
# STRUCTURED OUTPUT SCHEMA
# ------------------------
INTENT_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "media_type": {
            "type": "string",
            "enum": ["movie", "tv", "both"]
        },
        "genres": {
            "type": "array",
            "items": {
                "type": "string"
            }
        },
        "keywords": {
            "type": "array",
            "items": {
                "type": "string"
            },
            "maxItems": 5
        },
        "similar_to": {
            "type": ["string", "null"]
        },
        "min_rating": {
            "type": ["number", "null"]
        },
        "max_runtime": {
            "type": ["integer", "null"]
        },
        "era": {
            "type": ["string", "null"],
            "enum": ["classic", "modern", "recent", None]
        },
        "limit": {
            "type": "integer",
            "minimum": 0,
            "maximum": 12
        }
    },
    "required": [
        "media_type",
        "genres",
        "keywords",
        "similar_to",
        "min_rating",
        "max_runtime",
        "era",
        "limit"
    ],
    "additionalProperties": False
}


# ------------------------
# SYSTEM PROMPT
# ------------------------
SYSTEM_PROMPT = f"""
Extract movie/TV recommendation intent from the user's message.

Return only structured intent. Do not answer the user.

Rules:

1. "similar_to" is the exact title the user wants something like.
   Set it when the user uses wording such as:
   - "like X"
   - "something like X"
   - "similar to X"
   - "something similar to X"
   - "in the style of X"
   - equivalent wording.

2. Keep "similar_to" exactly as the title appears in the user's request.
   Never add years, media types, descriptions, or other words.

3. Example:
   "something tense like Parasite"
   -> similar_to = "Parasite"
   -> keywords = ["tense"]

4. A title mentioned without a similarity request does not set "similar_to".

5. Only extract genres, keywords, rating, runtime, or era when the user
   explicitly requests them.

6. Do not infer attributes from a referenced title.
   For example, do not infer "Crime" or "Drama" merely because the user
   asks for something like Breaking Bad.

7. Genres must come only from the valid genre lists below.

8. Use at most 5 keywords. Keywords should describe explicit qualities
   requested by the user, such as "tense", "dark", "funny", "heist".

9. "media_type":
   - movie when the user explicitly asks for movies/films
   - tv when the user explicitly asks for TV shows/series
   - both when the user explicitly asks for both
   - otherwise use "both"

10. "limit" is 8 for a recommendation request.
    Use 0 when the user is not asking for recommendations.
    If the user explicitly requests a number between 6 and 12, use that number.

11. "era":
    - classic = pre-1990
    - modern = 1990-2009
    - recent = 2010+
    Only set it when the user explicitly requests an era/time period.
    Do not infer an era from a referenced title.

12. min_rating should only be set when the user explicitly asks for
    highly-rated, well-rated, or a specific minimum rating.

13. max_runtime should only be set when the user explicitly asks for
    something shorter than a specified runtime.

Movie genres:
{", ".join(MOVIE_GENRES)}

TV genres:
{", ".join(TV_GENRES)}
"""


# ------------------------
# EXTRACT INTENT
# ------------------------
def _extract_intent(message: str, history: list) -> dict:
    """
    Extract structured recommendation intent using Groq's JSON schema
    structured output.
    """

    messages: list[ChatCompletionMessageParam] = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT
        }
    ]

    # Include recent conversation history for context.
    # This allows follow-up requests such as:
    # "something darker"
    # after:
    # "something like Parasite"
    for turn in history[-6:]:
        content = turn.get("content")


    messages.append({
        "role": "user",
        "content": message
    })

    response = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=messages,
        max_tokens=300,
        temperature=0.1,
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "movie_tv_intent",
                "schema": INTENT_RESPONSE_SCHEMA,
                "strict": True
            }
        }
    )

    choice = response.choices[0]
    content = choice.message.content

    if not content:
        print("[Chat] Groq returned no content")
        print("[Chat] Finish reason:", choice.finish_reason)
        print("[Chat] Message:", choice.message)

        raise ValueError("Groq returned an empty response")

    try:
        intent = json.loads(content)
    except json.JSONDecodeError as e:
        print("[Chat] Invalid JSON from Groq:", content)
        raise ValueError("Groq returned invalid JSON") from e

    # ------------------------
    # Defensive validation
    # ------------------------

    if intent["media_type"] not in ("movie", "tv", "both"):
        intent["media_type"] = "both"

    intent["genres"] = [
        genre
        for genre in intent.get("genres", [])
        if genre in MOVIE_GENRES or genre in TV_GENRES
    ]

    intent["keywords"] = [
        str(keyword).strip()
        for keyword in intent.get("keywords", [])[:5]
        if str(keyword).strip()
    ]

    if intent.get("similar_to"):
        intent["similar_to"] = str(intent["similar_to"]).strip()

        if not intent["similar_to"]:
            intent["similar_to"] = None

    if intent.get("min_rating") is not None:
        try:
            intent["min_rating"] = float(intent["min_rating"])
            intent["min_rating"] = max(0.0, min(10.0, intent["min_rating"]))
        except (TypeError, ValueError):
            intent["min_rating"] = None

    if intent.get("max_runtime") is not None:
        try:
            intent["max_runtime"] = int(intent["max_runtime"])
        except (TypeError, ValueError):
            intent["max_runtime"] = None

    if intent.get("era") not in ("classic", "modern", "recent", None):
        intent["era"] = None

    try:
        intent["limit"] = int(intent.get("limit", 8))
    except (TypeError, ValueError):
        intent["limit"] = 8

    intent["limit"] = max(0, min(12, intent["limit"]))

    return intent


# ------------------------
# FIND SIMILAR TITLES
# ------------------------
def _find_similar_by_title(title: str, media_type: str) -> list[int]:
    """
    Looks up a title in the DB and returns its TF-IDF neighbors.
    """

    collection = movies_collection if media_type != "tv" else tv_collection
    name_field = "title" if media_type != "tv" else "name"
    tfidf_map = movie_tfidf if media_type != "tv" else tv_tfidf

    # Exact case-insensitive match first.
    item = collection.find_one(
        {
            name_field: {
                "$regex": f"^{re.escape(title)}$",
                "$options": "i"
            }
        },
        {
            "tmdb_id": 1,
            "_id": 0
        }
    )

    if not item:
        # Fuzzy fallback.
        item = collection.find_one(
            {
                name_field: {
                    "$regex": re.escape(title),
                    "$options": "i"
                }
            },
            {
                "tmdb_id": 1,
                "_id": 0
            }
        )

    if not item:
        return []

    neighbors = tfidf_map.get(item["tmdb_id"], [])

    return [
        tmdb_id
        for tmdb_id, _ in neighbors[:40]
    ]


# ------------------------
# BUILD MONGO QUERY
# ------------------------
def _build_mongo_query(
    intent: dict,
    media_type: str,
    similar_ids: list
) -> dict:
    """
    Build a MongoDB query from extracted intent.

    When TF-IDF similarity exists, it is the primary signal.
    Explicit constraints such as rating, runtime and era remain filters.
    """

    query = {}

    # ------------------------
    # SIMILARITY
    # ------------------------
    if similar_ids:
        query["tmdb_id"] = {
            "$in": similar_ids
        }

    # ------------------------
    # DIRECT FILTERS
    # ------------------------
    #
    # When similarity exists, genres/keywords are intentionally NOT
    # applied here because they can destroy otherwise relevant TF-IDF
    # matches.
    #
    if not similar_ids:

        if intent.get("genres"):
            query["genres"] = {
                "$in": intent["genres"]
            }

        if intent.get("keywords"):
            query["keywords"] = {
                "$in": intent["keywords"]
            }

    # ------------------------
    # RATING
    # ------------------------
    if intent.get("min_rating") is not None:
        query["rating"] = {
            "$gte": intent["min_rating"]
        }

    # ------------------------
    # RUNTIME
    # ------------------------
    if intent.get("max_runtime") is not None:
        query["runtime"] = {
            "$lte": intent["max_runtime"],
            "$gt": 0
        }

    # ------------------------
    # ERA
    # ------------------------
    era = intent.get("era")

    if era == "classic":
        query["year"] = {
            "$lte": 1989
        }

    elif era == "modern":
        query["year"] = {
            "$gte": 1990,
            "$lte": 2009
        }

    elif era == "recent":
        query["year"] = {
            "$gte": 2010
        }

    return query


# ------------------------
# FETCH RESULTS
# ------------------------
def _fetch_results(
    intent: dict,
    media_type: str,
    limit: int
) -> list:
    """
    Query MongoDB for one media type and normalize results.
    """

    collection = (
        movies_collection
        if media_type == "movie"
        else tv_collection
    )

    similar_ids = []

    if intent.get("similar_to"):
        similar_ids = _find_similar_by_title(
            intent["similar_to"],
            media_type
        )

    query = _build_mongo_query(
        intent,
        media_type,
        similar_ids
    )

    # ------------------------
    # SIMILARITY RESULTS
    # ------------------------
    if similar_ids:

        raw = list(
            collection
            .find(query, {"_id": 0})
            .limit(limit * 2)
        )

        order_map = {
            tmdb_id: index
            for index, tmdb_id in enumerate(similar_ids)
        }

        raw.sort(
            key=lambda x: order_map.get(
                x.get("tmdb_id"),
                9999
            )
        )

        results = raw[:limit]

    # ------------------------
    # NORMAL FILTER RESULTS
    # ------------------------
    else:

        results = list(
            collection
            .find(query, {"_id": 0})
            .sort("rating", -1)
            .limit(limit)
        )

    # ------------------------
    # NORMALIZE
    # ------------------------
    for result in results:

        if "name" in result and "title" not in result:
            result["title"] = result.pop("name")

        result["media_type"] = media_type

    # ------------------------
    # DEBUG
    # ------------------------
    print("MEDIA TYPE:", media_type)
    print("SIMILAR TO:", intent.get("similar_to"))
    print("SIMILAR IDS:", similar_ids)
    print("QUERY:", query)
    print("RESULT COUNT:", len(results))

    return results


# ------------------------
# GENERATE USER REPLY
# ------------------------
def _build_reply(
    intent: dict,
    result_count: int
) -> str:
    """
    Generate a deterministic user-facing reply without another LLM call.
    """

    similar_to = intent.get("similar_to")
    keywords = intent.get("keywords", [])
    genres = intent.get("genres", [])

    if result_count == 0:
        return (
            "I couldn't find a close match in the library. "
            "Try a different title, genre, or mood."
        )

    if similar_to:
        if keywords:
            return (
                f"Here are some {keywords[0]} picks similar to {similar_to}."
            )

        return f"Here are some picks similar to {similar_to}."

    if keywords:
        return f"Here are some {keywords[0]} picks that match your request."

    if genres:
        return f"Here are some {genres[0].lower()} picks that match your request."

    if intent.get("media_type") == "movie":
        return "Here are some movies that match your request."

    if intent.get("media_type") == "tv":
        return "Here are some shows that match your request."

    return "Here are some picks that match your request."


# ------------------------
# MAIN CHAT HANDLER
# ------------------------
def handle_chat(
    user_id: str,
    message: str,
    history: list
) -> dict:
    """
    Main entry point.

    Returns:
        {
            "reply": str,
            "results": list
        }
    """

    try:
        intent = _extract_intent(
            message,
            history
        )

    except Exception as e:

        print(
            f"[Chat] Intent parsing failed: {e}"
        )

        return {
            "reply": "Sorry, I didn't quite catch that — could you rephrase?",
            "results": []
        }

    limit = int(
        intent.get("limit") or 0
    )

    # ------------------------
    # NORMAL CONVERSATION
    # ------------------------
    if limit == 0:
        return {
            "reply": "How can I help you find something to watch?",
            "results": []
        }

    media_type = intent.get(
        "media_type",
        "both"
    )

    results = []

    if media_type in ("movie", "both"):
        results += _fetch_results(
            intent,
            "movie",
            limit
        )

    if media_type in ("tv", "both"):
        results += _fetch_results(
            intent,
            "tv",
            limit
        )

    # ------------------------
    # FALLBACK
    # ------------------------
    #
    # If explicit filters were too restrictive, retry without keywords.
    #
    if not results and (
        intent.get("genres")
        or intent.get("keywords")
    ):

        fallback_intent = {
            **intent,
            "keywords": []
        }

        if media_type in ("movie", "both"):
            results += _fetch_results(
                fallback_intent,
                "movie",
                limit
            )

        if media_type in ("tv", "both"):
            results += _fetch_results(
                fallback_intent,
                "tv",
                limit
            )

    reply = _build_reply(
        intent,
        len(results)
    )

    return {
        "reply": reply,
        "results": results[:limit]
    }
