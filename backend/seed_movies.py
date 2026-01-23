import os
import requests
from dotenv import load_dotenv
from app.db import movies_collection

load_dotenv()

TMDB_KEY = os.getenv("TMDB_KEY")

BASE_URL = "https://api.themoviedb.org/3/movie/popular"

def fetch_movies(page: int):
    response = requests.get(
        BASE_URL,
        params={
            "api_key": TMDB_KEY,
            "language": "en-US",
            "page": page
        }
    )
    response.raise_for_status()
    return response.json()["results"]

GENRES_URL = "https://api.themoviedb.org/3/genre/movie/list"

def fetch_genres():
    response = requests.get(
        GENRES_URL,
        params={
            "api_key": TMDB_KEY,
            "language": "en-US"
        }
    )
    response.raise_for_status()
    genres = response.json()["genres"]
    return {g["id"]: g["name"] for g in genres}

MOVIE_DETAILS_URL = "https://api.themoviedb.org/3/movie/{}"

def fetch_movie_details(tmdb_id):
    response = requests.get(
        MOVIE_DETAILS_URL.format(tmdb_id),
        params={"api_key": TMDB_KEY, "language": "en-US"}
    )
    response.raise_for_status()
    return response.json()

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

def seed_movies(pages=10):
    movies_collection.delete_many({})
    movies_collection.create_index("tmdb_id", unique=True)

    movies_map = {}  # tmdb_id -> movie

    for page in range(1, pages + 1):
        raw_movies = fetch_movies(page)
        for movie in raw_movies:
            details = fetch_movie_details(movie["id"])
            normalized = normalize_movie(movie, details)
            movies_map[normalized["tmdb_id"]] = normalized

    movies_collection.insert_many(list(movies_map.values()))
    print(f"Seed completed: {len(movies_map)} unique movies inserted")

if __name__ == "__main__":
    seed_movies()
