import os
import requests
from dotenv import load_dotenv
from app.db import movies_collection

load_dotenv()

TMDB_KEY = os.getenv("TMDB_KEY")

DISCOVER_URL = "https://api.themoviedb.org/3/discover/movie"
GENRES_URL = "https://api.themoviedb.org/3/genre/movie/list"
MOVIE_DETAILS_URL = "https://api.themoviedb.org/3/movie/{}"

# ------------------------
# EXCLUSIONS
# ------------------------
EXCLUDED_TITLES = {
    "shameless","kandungan","risqué","succubus","disclosure","the voyeur",
    "ligaw","uhaw","scorned","rita","sayaw","malena","giacomo casanova",
    "kulong","mom's friend","my friend's mom","eks",
    "fate/kaleid liner prisma☆illya: dance at the sports festival!",
    "fate/kaleid liner prisma☆illya 2wei!: magical girl in hot springs inn",
    "les inshortables, vol. 1","play time","high art","emmanuelle", "love Exposure", "9 songs", "dreamgirls", 
}

# ------------------------
# HELPERS
# ------------------------
def fetch_genres():
    res = requests.get(
        GENRES_URL,
        params={"api_key": TMDB_KEY, "language": "en-US"}
    )
    res.raise_for_status()
    return {g["id"]: g["name"] for g in res.json()["genres"]}

def fetch_discover(params):
    res = requests.get(
        DISCOVER_URL,
        params={"api_key": TMDB_KEY, **params}
    )
    res.raise_for_status()
    return res.json()["results"]

def fetch_movie_details(tmdb_id):
    res = requests.get(
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
    }

# ------------------------
# SEEDING STRATEGY
# ------------------------
def seed_movies():
    movies_collection.delete_many({})
    movies_collection.create_index("tmdb_id", unique=True)

    genres = fetch_genres()
    movies_map = {}

    def add_movies(results):
        for movie in results:
            title = movie["title"].lower()
            if title in EXCLUDED_TITLES:
                continue
            if movie["vote_count"] < 300:
                continue

            details = fetch_movie_details(movie["id"])
            normalized = normalize_movie(movie, details)
            movies_map[normalized["tmdb_id"]] = normalized

    # ------------------------
    # A. HIGH-QUALITY MAINSTREAM
    # ------------------------
    for page in range(1, 21):
        add_movies(fetch_discover({
            "language": "en-US",
            "sort_by": "vote_average.desc",
            "vote_count.gte": 2000,
            "page": page
        }))

    # ------------------------
    # A2. MAINSTREAM BLOCKBUSTERS (POPULARITY-FIRST)
    # ------------------------
    for page in range(1, 21):
        add_movies(fetch_discover({
            "language": "en-US",
            "sort_by": "popularity.desc",
            "vote_count.gte": 1000,
            "page": page
        }))

    # ------------------------
    # B. GENRE DIVERSITY
    # ------------------------
    for genre_id in genres.keys():
        add_movies(fetch_discover({
            "language": "en-US",
            "with_genres": genre_id,
            "sort_by": "popularity.desc",
            "vote_count.gte": 500,
            "page": 1
        }))

    # ------------------------
    # C. OLDER CLASSICS
    # ------------------------
    for page in range(1, 12):
        add_movies(fetch_discover({
            "language": "en-US",
            "primary_release_date.lte": "2005-12-31",
            "sort_by": "vote_average.desc",
            "vote_count.gte": 800,
            "page": page
        }))

    # ------------------------
    # D. INTERNATIONAL CINEMA
    # ------------------------
    for page in range(1, 12):
        add_movies(fetch_discover({
            "sort_by": "vote_average.desc",
            "vote_count.gte": 500,
            "with_original_language": "fr|es|de|it|ja|ko",
            "page": page
        }))

    movies_collection.insert_many(list(movies_map.values()))
    print(f"Seed completed: {len(movies_map)} high-quality movies inserted")

if __name__ == "__main__":
    seed_movies()
