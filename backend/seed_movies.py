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

def normalize_movie(movie):
    return {
        "tmdb_id": movie["id"],
        "title": movie["title"],
        "year": int(movie["release_date"][:4]) if movie.get("release_date") else None,
        "rating": movie["vote_average"],
        "votes": movie["vote_count"],
        "popularity": movie["popularity"],
        "genres": movie["genre_ids"]
    }

def seed_movies(pages=5):
    movies_collection.delete_many({})

    all_movies = []

    for page in range(1, pages + 1):
        raw_movies = fetch_movies(page)
        for movie in raw_movies:
            all_movies.append(normalize_movie(movie))

    movies_collection.insert_many(all_movies)
    print(f"Seed completed: {len(all_movies)} movies inserted")

if __name__ == "__main__":
    seed_movies()
