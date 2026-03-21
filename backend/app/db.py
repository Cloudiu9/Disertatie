from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

client = MongoClient(os.getenv("MONGO_URI"))
db = client["movie_platform"]

tv_collection = db["tv_shows"]
movies_collection = db["movies"]
users_collection = db["users"]

# NEW user interactions
interactions_collection = db["user_interactions"]

# Indexes
users_collection.create_index("my_list")
users_collection.create_index("email", unique=True)

movies_collection.create_index("tmdb_id", unique=True)
movies_collection.create_index("popularity")

# Interaction indexes
interactions_collection.create_index(
    [("user_id", 1), ("tmdb_id", 1), ("media_type", 1)],
    unique=True
)

interactions_collection.create_index("user_id")