from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

client = MongoClient(os.getenv("MONGO_URI"))
db = client["movie_platform"]

tv_collection = db["tv_shows"]
movies_collection = db["movies"]
users_collection = db["users"]
users_collection.create_index("my_list")
movies_collection.create_index("tmdb_id", unique=True)
movies_collection.create_index("popularity")


# create unique index once (safe to call multiple times)
users_collection.create_index("email", unique=True)
