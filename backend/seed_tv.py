import os, time
import requests
from dotenv import load_dotenv
from app.db import tv_collection
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

load_dotenv()

TMDB_KEY = os.getenv("TMDB_KEY")
DISCOVER_URL = "https://api.themoviedb.org/3/discover/tv"
GENRES_URL = "https://api.themoviedb.org/3/genre/tv/list"
DETAILS_URL = "https://api.themoviedb.org/3/tv/{}"
MIN_VOTE_COUNT = 200
REQUEST_DELAY = 0.25


def get_session():
    session = requests.Session()
    retry = Retry(total=3, backoff_factor=1, status_forcelist=[429, 500, 502, 503, 504])
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session


session = get_session()
details_cache = {}


def fetch_genres():
    res = session.get(GENRES_URL, params={"api_key": TMDB_KEY, "language": "en-US"})
    res.raise_for_status()
    return {g["id"]: g["name"] for g in res.json()["genres"]}


def fetch_details(tmdb_id):
    if tmdb_id in details_cache:
        return details_cache[tmdb_id]
    res = session.get(DETAILS_URL.format(tmdb_id), params={"api_key": TMDB_KEY, "language": "en-US"})
    res.raise_for_status()
    time.sleep(REQUEST_DELAY)
    details_cache[tmdb_id] = res.json()
    return details_cache[tmdb_id]


def fetch_discover(params):
    res = session.get(DISCOVER_URL, params={"api_key": TMDB_KEY, **params})
    res.raise_for_status()
    return res.json()["results"]


def normalize(tv, details):
    year = int(tv["first_air_date"][:4]) if tv.get("first_air_date") else None
    runtimes = details.get("episode_run_time")
    return {
        "tmdb_id": tv["id"],
        "title": tv["name"],
        "year": year,
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


def seed_tv():
    tv_collection.delete_many({})
    tv_collection.create_index("tmdb_id", unique=True)
    tv_map = {}

    def add(results):
        for tv in results:
            if tv["vote_count"] < MIN_VOTE_COUNT:
                continue
            try:
                details = fetch_details(tv["id"])
                normalized = normalize(tv, details)
                tv_map[normalized["tmdb_id"]] = normalized
            except Exception as e:
                print("Error:", e)

    print("Fetching Popular TV")
    for page in range(1, 30):
        print("Page", page)
        add(fetch_discover({"sort_by": "popularity.desc", "page": page}))

    print("Fetching Top Rated TV")
    for page in range(1, 20):
        print("Page", page)
        add(fetch_discover({"sort_by": "vote_average.desc", "vote_count.gte": 500, "page": page}))

    print("Inserting", len(tv_map))
    if tv_map:
        tv_collection.insert_many(list(tv_map.values()))


if __name__ == "__main__":
    seed_tv()