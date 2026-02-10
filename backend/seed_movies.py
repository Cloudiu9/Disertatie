import os
import time
import requests
from dotenv import load_dotenv
from app.db import movies_collection
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

load_dotenv()

TMDB_KEY = os.getenv("TMDB_KEY")

DISCOVER_URL = "https://api.themoviedb.org/3/discover/movie"
GENRES_URL = "https://api.themoviedb.org/3/genre/movie/list"
MOVIE_DETAILS_URL = "https://api.themoviedb.org/3/movie/{}"

# ------------------------
# CONFIGURATION
# ------------------------
MIN_VOTE_COUNT = int(os.getenv("MIN_VOTE_COUNT", "300"))
REQUEST_DELAY = 0.25  # 4 requests per second to avoid rate limits

# ------------------------
# EXCLUSIONS
# ------------------------
EXCLUDED_TITLES = {
    "shameless","kandungan","risqué","succubus","disclosure","the voyeur",
    "ligaw","uhaw","scorned","rita","sayaw","malena","giacomo casanova",
    "kulong","mom's friend","my friend's mom","eks",
    "fate/kaleid liner prisma☆illya: dance at the sports festival!",
    "fate/kaleid liner prisma☆illya 2wei!: magical girl in hot springs inn",
    "les inshortables, vol. 1","play time","high art","emmanuelle", "love exposure", "9 songs", "dreamgirls", 
}

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
    res = session.get(
        GENRES_URL,
        params={"api_key": TMDB_KEY, "language": "en-US"}
    )
    res.raise_for_status()
    return {g["id"]: g["name"] for g in res.json()["genres"]}

def fetch_discover(params):
    res = session.get(
        DISCOVER_URL,
        params={"api_key": TMDB_KEY, **params}
    )
    res.raise_for_status()
    return res.json()["results"]

# Cache for movie details to avoid duplicate API calls
details_cache = {}

def fetch_movie_details(tmdb_id):
    if tmdb_id in details_cache:
        return details_cache[tmdb_id]
    
    res = session.get(
        MOVIE_DETAILS_URL.format(tmdb_id),
        params={"api_key": TMDB_KEY, "language": "en-US"}
    )
    res.raise_for_status()
    time.sleep(REQUEST_DELAY)
    details_cache[tmdb_id] = res.json()
    return details_cache[tmdb_id]

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
# SEEDING STRATEGY
# ------------------------
def seed_movies():
    movies_collection.delete_many({})
    movies_collection.create_index("tmdb_id", unique=True)

    genres = fetch_genres()
    movies_map = {}

    def add_movies(results, source=""):
        for i, movie in enumerate(results, 1):
            title = movie["title"].lower()
            if title in EXCLUDED_TITLES:
                continue
            if movie["vote_count"] < MIN_VOTE_COUNT:
                continue

            try:
                details = fetch_movie_details(movie["id"])
                normalized = normalize_movie(movie, details)
                movies_map[normalized["tmdb_id"]] = normalized
            except Exception as e:
                print(f"  Error processing {movie['title']}: {e}")
                continue
            
            if i % 10 == 0:
                print(f"  {source}: Processed {i}/{len(results)} movies, total unique: {len(movies_map)}")

    # ------------------------
    # A. HIGH-QUALITY MAINSTREAM
    # ------------------------
    print("\n[A] Fetching high-quality mainstream movies...")
    for page in range(1, 26):
        print(f"  Page {page}/25")
        add_movies(fetch_discover({
            "language": "en-US",
            "sort_by": "vote_average.desc",
            "vote_count.gte": 2000,
            "page": page
        }), "High-Quality")

    # ------------------------
    # A2. MAINSTREAM BLOCKBUSTERS (POPULARITY-FIRST)
    # ------------------------
    print("\n[A2] Fetching mainstream blockbusters...")
    for page in range(1, 26):
        print(f"  Page {page}/25")
        add_movies(fetch_discover({
            "language": "en-US",
            "sort_by": "popularity.desc",
            "vote_count.gte": 1000,
            "page": page
        }), "Blockbusters")

    # ------------------------
    # B. GENRE DIVERSITY
    # ------------------------
    print("\n[B] Fetching genre diversity...")
    for genre_id, genre_name in genres.items():
        print(f"  Genre: {genre_name}")
        add_movies(fetch_discover({
            "language": "en-US",
            "with_genres": genre_id,
            "sort_by": "popularity.desc",
            "vote_count.gte": 500,
            "page": 1
        }), f"Genre-{genre_name}")

    # ------------------------
    # C. OLDER CLASSICS
    # ------------------------
    print("\n[C] Fetching older classics...")
    for page in range(1, 16):
        print(f"  Page {page}/15")
        add_movies(fetch_discover({
            "language": "en-US",
            "primary_release_date.lte": "2005-12-31",
            "sort_by": "vote_average.desc",
            "vote_count.gte": 800,
            "page": page
        }), "Classics")

    # ------------------------
    # D. INTERNATIONAL CINEMA
    # ------------------------
    print("\n[D] Fetching international cinema...")
    for page in range(1, 16):
        print(f"  Page {page}/15")
        add_movies(fetch_discover({
            "sort_by": "vote_average.desc",
            "vote_count.gte": 500,
            "with_original_language": "fr|es|de|it|ja|ko",
            "page": page
        }), "International")

    # ------------------------
    # INSERT TO DATABASE
    # ------------------------
    print(f"\n[FINAL] Inserting {len(movies_map)} unique movies into database...")
    if movies_map:
        movies_collection.insert_many(list(movies_map.values()))
    print(f"✓ Seed completed: {len(movies_map)} high-quality movies inserted")
    print(f"✓ API calls saved by caching: {len(details_cache) - len(movies_map)}")

if __name__ == "__main__":
    seed_movies()