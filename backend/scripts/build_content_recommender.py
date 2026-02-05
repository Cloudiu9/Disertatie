import json
import re
import joblib
import numpy as np
import os
from dotenv import load_dotenv
from pymongo import MongoClient
from sklearn.feature_extraction.text import TfidfVectorizer

# ------------------------
# DB CONNECTION
# ------------------------
load_dotenv()

client = MongoClient(os.getenv("MONGO_URI"))
db = client["movie_platform"]
movies_collection = db["movies"]

# ------------------------
# HELPERS
# ------------------------
def clean_text(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"[^a-zA-Z0-9\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip().lower()

# ------------------------
# LOAD MOVIES
# ------------------------
movies = list(
    movies_collection.find(
        {},
        {
            "_id": 0,
            "tmdb_id": 1,
            "title": 1,
            "overview": 1,
            "genres": 1,
        },
    )
)

if not movies:
    raise RuntimeError("No movies found in database")

documents = []
tmdb_ids = []

for m in movies:
    genres = " ".join(m.get("genres", []))
    text = " ".join(
        [
            clean_text(m.get("title", "")),
            clean_text(m.get("overview", "")),
            genres,
            genres,
        ]
    )

    documents.append(text)
    tmdb_ids.append(m["tmdb_id"])

# ------------------------
# TF-IDF
# ------------------------
vectorizer = TfidfVectorizer(
    ngram_range=(1, 2),
    min_df=3,
    max_df=0.8,
)

tfidf_matrix = vectorizer.fit_transform(documents)

# ------------------------
# SAVE ARTIFACTS
# ------------------------
ARTIFACTS_PATH = "backend/artifacts"

joblib.dump(vectorizer, f"{ARTIFACTS_PATH}/tfidf_vectorizer.joblib")
joblib.dump(tfidf_matrix, f"{ARTIFACTS_PATH}/tfidf_matrix.joblib")

with open(f"{ARTIFACTS_PATH}/tfidf_index_to_tmdb.json", "w") as f:
    json.dump(tmdb_ids, f)

print("Content-based recommender built successfully.")
