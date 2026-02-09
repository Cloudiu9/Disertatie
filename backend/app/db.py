from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

client = MongoClient(os.getenv("MONGO_URI"))
db = client["movie_platform"]

movies_collection = db["movies"]
users_collection = db["users"]

# create unique index once (safe to call multiple times)
users_collection.create_index("email", unique=True)
