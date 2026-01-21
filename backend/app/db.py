from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()  # CRITIC

client = MongoClient(os.getenv("MONGO_URI"))
db = client["movie_platform"]

movies_collection = db["movies"]
