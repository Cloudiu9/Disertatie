import json
import re
import joblib
import os
from dotenv import load_dotenv
from pymongo import MongoClient
from sklearn.feature_extraction.text import TfidfVectorizer

load_dotenv()

client = MongoClient(os.getenv("MONGO_URI"))
db = client["movie_platform"]
tv_collection = db["tv_shows"]

def clean_text(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"[^a-zA-Z0-9\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip().lower()

shows = list(
    tv_collection.find(
        {},
        {
            "_id": 0,
            "tmdb_id": 1,
            "name": 1,
            "overview": 1,
            "genres": 1,
        },
    )
)

if not shows:
    raise RuntimeError("No TV shows found in database")

documents = []
tmdb_ids = []

for s in shows:
    genres = " ".join(s.get("genres", []))

    text = " ".join(
        [
            clean_text(s.get("name", "")),
            clean_text(s.get("overview", "")),
            genres,
            genres,
        ]
    )

    documents.append(text)
    tmdb_ids.append(s["tmdb_id"])

vectorizer = TfidfVectorizer(
    ngram_range=(1, 2),
    min_df=3,
    max_df=0.8,
)

tfidf_matrix = vectorizer.fit_transform(documents)

ARTIFACTS_PATH = "./artifacts"

joblib.dump(vectorizer, f"{ARTIFACTS_PATH}/tv_vectorizer.joblib")
joblib.dump(tfidf_matrix, f"{ARTIFACTS_PATH}/tv_tfidf_matrix.joblib")

with open(f"{ARTIFACTS_PATH}/tv_index_to_tmdb.json", "w") as f:
    json.dump(tmdb_ids, f)

print("TV recommender built successfully.")