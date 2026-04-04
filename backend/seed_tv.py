import os
import requests
from dotenv import load_dotenv
from app.db import tv_collection, db
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from concurrent.futures import ThreadPoolExecutor, as_completed

load_dotenv()

TMDB_KEY = os.getenv("TMDB_KEY")

DISCOVER_URL = "https://api.themoviedb.org/3/discover/tv"
GENRES_URL = "https://api.themoviedb.org/3/genre/tv/list"
DETAILS_URL = "https://api.themoviedb.org/3/tv/{}"

# ------------------------
# CONFIGURATION
# ------------------------
MIN_VOTE_COUNT = 200
MAX_WORKERS = 8

# ------------------------
# EXCLUSIONS
# ------------------------
EXCLUDED_TITLES = {
    "redo of healer",
    "raw",
    "tagesschau",
    "high school d×d",
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

def fetch_details(tmdb_id):
    res = session.get(
        DETAILS_URL.format(tmdb_id),
        params={"api_key": TMDB_KEY, "language": "en-US"}
    )
    res.raise_for_status()
    return res.json()

def normalize(tv, details):
    runtimes = details.get("episode_run_time")
    return {
        "tmdb_id": tv["id"],
        "title": tv["name"],
        "year": int(tv["first_air_date"][:4]) if tv.get("first_air_date") else None,
        "rating": tv["vote_average"],
        "votes": tv["vote_count"],
        "popularity": tv["popularity"],
        "genres": [g["name"] for g in details.get("genres", [])],
        "overview": details.get("overview"),
        "runtime": runtimes[0] if runtimes else None,
        "poster_path": details.get("poster_path"),
        "backdrop_path": details.get("backdrop_path"),
        "original_language": details.get("original_language"),
        "tagline": details.get("tagline"),
        "seasons": details.get("number_of_seasons"),
        "episodes": details.get("number_of_episodes"),
    }

# ------------------------
# PARALLEL ADD
# ------------------------
def add_tv(results, tv_map, seen_ids, source=""):
    candidates = []
    for tv in results:
        if is_excluded(tv["name"]):
            continue
        if tv["vote_count"] < MIN_VOTE_COUNT:
            continue
        if tv["id"] in seen_ids:
            continue
        seen_ids.add(tv["id"])
        candidates.append(tv)

    if not candidates:
        return

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(fetch_details, t["id"]): t
            for t in candidates
        }
        for future in as_completed(futures):
            tv = futures[future]
            try:
                details = future.result()
                normalized = normalize(tv, details)
                tv_map[normalized["tmdb_id"]] = normalized
            except Exception as e:
                print(f"  [{source}] Error processing '{tv['name']}': {e}")

# ------------------------
# SEEDING STRATEGY
# ------------------------
def seed_tv():
    temp_collection = db["tv_temp"]
    temp_collection.drop()
    temp_collection.create_index("tmdb_id", unique=True)

    genres = fetch_genres()
    tv_map = {}
    seen_ids = set()

    # ------------------------
    # A. POPULAR TV
    # ------------------------
    print("\n[A] Fetching popular TV shows...")
    for page in range(1, 41):
        print(f"  Page {page}/40")
        add_tv(fetch_discover({
            "sort_by": "popularity.desc",
            "vote_count.gte": MIN_VOTE_COUNT,
            "page": page
        }), tv_map, seen_ids, "Popular")

    # ------------------------
    # B. TOP RATED TV
    # ------------------------
    print("\n[B] Fetching top rated TV shows...")
    for page in range(1, 41):
        print(f"  Page {page}/40")
        add_tv(fetch_discover({
            "sort_by": "vote_average.desc",
            "vote_count.gte": 500,
            "page": page
        }), tv_map, seen_ids, "Top-Rated")

    # ------------------------
    # C. GENRE DIVERSITY
    # ------------------------
    print("\n[C] Fetching genre diversity...")
    for genre_id, genre_name in genres.items():
        print(f"  Genre: {genre_name}")
        for page in range(1, 6):
            add_tv(fetch_discover({
                "with_genres": genre_id,
                "sort_by": "popularity.desc",
                "vote_count.gte": MIN_VOTE_COUNT,
                "page": page
            }), tv_map, seen_ids, f"Genre-{genre_name}")

    # ------------------------
    # D. INTERNATIONAL TV
    # ------------------------
    print("\n[D] Fetching international TV...")
    for lang in ["ko", "ja", "fr", "es", "de", "it"]:
        print(f"  Language: {lang}")
        for page in range(1, 31):
            add_tv(fetch_discover({
                "sort_by": "vote_average.desc",
                "vote_count.gte": 300,
                "with_original_language": lang,
                "page": page
            }), tv_map, seen_ids, f"Intl-{lang}")

    # ------------------------
    # E. CLASSICS (pre-2010)
    # ------------------------
    print("\n[E] Fetching classic TV shows...")
    for page in range(1, 31):
        print(f"  Page {page}/30")
        add_tv(fetch_discover({
            "sort_by": "vote_average.desc",
            "vote_count.gte": 500,
            "first_air_date.lte": "2010-12-31",
            "page": page
        }), tv_map, seen_ids, "Classics")

    # ------------------------
    # ATOMIC INSERT VIA TEMP COLLECTION
    # ------------------------
    print(f"\n[FINAL] Inserting {len(tv_map)} unique TV shows...")
    if tv_map:
        temp_collection.insert_many(list(tv_map.values()), ordered=False)

    temp_collection.rename("tv", dropTarget=True)
    print(f"✓ Seed completed: {len(tv_map)} TV shows inserted")

if __name__ == "__main__":
    seed_tv()