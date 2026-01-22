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
    movies_collection.create_index("tmdb_id", unique=True)

    inserted = 0

    for page in range(1, pages + 1):
        raw_movies = fetch_movies(page)
        for movie in raw_movies:
            normalized = normalize_movie(movie)

            result = movies_collection.update_one(
                {"tmdb_id": normalized["tmdb_id"]},
                {"$setOnInsert": normalized},
                upsert=True
            )

            if result.upserted_id:
                inserted += 1

    print(f"Seed completed: {inserted} unique movies inserted")


if __name__ == "__main__":
    seed_movies()
