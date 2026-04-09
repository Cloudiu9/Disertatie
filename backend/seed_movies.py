import os
import time
import requests
from dotenv import load_dotenv
from app.db import movies_collection, db
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from concurrent.futures import ThreadPoolExecutor, as_completed

load_dotenv()

TMDB_KEY = os.getenv("TMDB_KEY")

DISCOVER_URL = "https://api.themoviedb.org/3/discover/movie"
GENRES_URL = "https://api.themoviedb.org/3/genre/movie/list"
MOVIE_DETAILS_URL = "https://api.themoviedb.org/3/movie/{}"

# ------------------------
# CONFIGURATION
# ------------------------
MIN_VOTE_COUNT = int(os.getenv("MIN_VOTE_COUNT", "300"))
MAX_WORKERS = 8  # Parallel detail fetches

# ------------------------
# EXCLUSIONS
# ------------------------
EXCLUDED_TITLES = {
    "shameless", "kandungan", "risqué", "succubus", "disclosure", "the voyeur",
    "ligaw", "uhaw", "scorned", "rita", "sayaw", "malena", "giacomo casanova",
    "kulong", "mom's friend", "my friend's mom", "eks",
    "fate/kaleid liner prisma☆illya: dance at the sports festival!",
    "fate/kaleid liner prisma☆illya 2wei!: magical girl in hot springs inn",
    "les inshortables, vol. 1", "play time", "high art", "emmanuelle",
    "love exposure", "9 songs", "dreamgirls", "hot girls wanted"
}

def is_excluded(title: str) -> bool:
    t = title.lower().strip()
    return any(excl in t for excl in EXCLUDED_TITLES)

# ------------------------
# SESSION WITH RETRY LOGIC
# ------------------------
def get_session():
    session = requests.Session()
    retry = Retry(
        total=3,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504]
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session

session = get_session()

# ------------------------
# HELPERS
# ------------------------
def fetch_genres():
    res = session.get(GENRES_URL, params={"api_key": TMDB_KEY, "language": "en-US"})
    res.raise_for_status()
    return {g["id"]: g["name"] for g in res.json()["genres"]}

def fetch_discover(params):
    res = session.get(DISCOVER_URL, params={"api_key": TMDB_KEY, **params})
    res.raise_for_status()
    return res.json()["results"]

def fetch_movie_details(tmdb_id):
    res = session.get(
        MOVIE_DETAILS_URL.format(tmdb_id),
        params={"api_key": TMDB_KEY, "language": "en-US"}
    )
    res.raise_for_status()
    return res.json()

def normalize_movie(movie, details):
    return {
        "tmdb_id": movie["id"],
        "title": movie["title"],
        "year": int(movie["release_date"][:4]) if movie.get("release_date") else None,
        "rating": movie["vote_average"],
        "votes": movie["vote_count"],
        "popularity": movie["popularity"],
        "genres": [g["name"] for g in details.get("genres", [])],
        "overview": details.get("overview"),
        "runtime": details.get("runtime"),
        "poster_path": details.get("poster_path"),
        "backdrop_path": details.get("backdrop_path"),
        "original_language": details.get("original_language"),
        "tagline": details.get("tagline"),
    }

# ------------------------
# PARALLEL ADD
# ------------------------
def add_movies(results, movies_map, seen_ids, source=""):
    candidates = []
    for movie in results:
        if is_excluded(movie["title"]):
            continue
        if movie["vote_count"] < MIN_VOTE_COUNT:
            continue
        if movie["id"] in seen_ids:
            continue
        seen_ids.add(movie["id"])
        candidates.append(movie)

    if not candidates:
        return

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(fetch_movie_details, m["id"]): m
            for m in candidates
        }
        for future in as_completed(futures):
            movie = futures[future]
            try:
                details = future.result()
                normalized = normalize_movie(movie, details)
                movies_map[normalized["tmdb_id"]] = normalized
            except Exception as e:
                print(f"  [{source}] Error processing '{movie['title']}': {e}")

# ------------------------
# SEEDING STRATEGY
# ------------------------
def seed_movies():
    temp_collection = db["movies_temp"]
    temp_collection.drop()
    temp_collection.create_index("tmdb_id", unique=True)

    genres = fetch_genres()
    movies_map = {}
    seen_ids = set()

    # ------------------------
    # A. HIGH-QUALITY MAINSTREAM
    # ------------------------
    print("\n[A] Fetching high-quality mainstream movies...")
    for page in range(1, 41):
        print(f"  Page {page}/40")
        add_movies(fetch_discover({
            "language": "en-US",
            "sort_by": "vote_average.desc",
            "vote_count.gte": 2000,
            "page": page
        }), movies_map, seen_ids, "High-Quality")

    # ------------------------
    # A2. MAINSTREAM BLOCKBUSTERS (POPULARITY-FIRST)
    # ------------------------
    print("\n[A2] Fetching mainstream blockbusters...")
    for page in range(1, 41):
        print(f"  Page {page}/40")
        add_movies(fetch_discover({
            "language": "en-US",
            "sort_by": "popularity.desc",
            "vote_count.gte": 1000,
            "page": page
        }), movies_map, seen_ids, "Blockbusters")

    # ------------------------
    # B. GENRE DIVERSITY
    # ------------------------
    print("\n[B] Fetching genre diversity...")
    for genre_id, genre_name in genres.items():
        print(f"  Genre: {genre_name}")
        for page in range(1, 6):
            add_movies(fetch_discover({
                "language": "en-US",
                "with_genres": genre_id,
                "sort_by": "popularity.desc",
                "vote_count.gte": 500,
                "page": page
            }), movies_map, seen_ids, f"Genre-{genre_name}")

    # ------------------------
    # C. OLDER CLASSICS
    # ------------------------
    print("\n[C] Fetching older classics...")
    for page in range(1, 31):
        print(f"  Page {page}/30")
        add_movies(fetch_discover({
            "language": "en-US",
            "primary_release_date.lte": "2005-12-31",
            "sort_by": "vote_average.desc",
            "vote_count.gte": 800,
            "page": page
        }), movies_map, seen_ids, "Classics")

    # ------------------------
    # D. INTERNATIONAL CINEMA
    # ------------------------
    print("\n[D] Fetching international cinema...")
    for lang in ["fr", "es", "de", "it", "ja", "ko"]:
        print(f"  Language: {lang}")
        for page in range(1, 31):
            add_movies(fetch_discover({
                "sort_by": "vote_average.desc",
                "vote_count.gte": 500,
                "with_original_language": lang,
                "page": page
            }), movies_map, seen_ids, f"Intl-{lang}")

    # ------------------------
    # ATOMIC INSERT VIA TEMP COLLECTION
    # ------------------------
    print(f"\n[FINAL] Inserting {len(movies_map)} unique movies...")
    if movies_map:
        temp_collection.insert_many(list(movies_map.values()), ordered=False)

    temp_collection.rename("movies", dropTarget=True)
    print(f"✓ Seed completed: {len(movies_map)} movies inserted")

if __name__ == "__main__":
    seed_movies()