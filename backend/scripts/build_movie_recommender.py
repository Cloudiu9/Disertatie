import json
import re
import joblib
import numpy as np
import os
import pickle
from dotenv import load_dotenv
from pymongo import MongoClient
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# ------------------------
# DB CONNECTION
# ------------------------
load_dotenv()

client = MongoClient(os.getenv("MONGO_URI"))
db = client["movie_platform"]
movies_collection = db["movies"]

# ------------------------
# PATHS
# ------------------------
ARTIFACTS_PATH = "./artifacts"
MODELS_PATH = "./models"

os.makedirs(ARTIFACTS_PATH, exist_ok=True)
os.makedirs(MODELS_PATH, exist_ok=True)

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
    tmdb_ids.append(int(m["tmdb_id"]))

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
# SAVE ORIGINAL ARTIFACTS
# ------------------------
joblib.dump(vectorizer, f"{ARTIFACTS_PATH}/tfidf_vectorizer.joblib")
joblib.dump(tfidf_matrix, f"{ARTIFACTS_PATH}/tfidf_matrix.joblib")

with open(f"{ARTIFACTS_PATH}/tfidf_index_to_tmdb.json", "w") as f:
    json.dump(tmdb_ids, f)

# ------------------------
# BUILD SIMILARITY MAP (NEW)
# ------------------------
print("Computing cosine similarity...")

cosine_sim = cosine_similarity(tfidf_matrix)

tfidf_map = {}

for idx, tmdb_id in enumerate(tmdb_ids):

    sim_scores = list(enumerate(cosine_sim[idx]))

    sim_scores = [s for s in sim_scores if s[0] != idx]
    sim_scores.sort(key=lambda x: x[1], reverse=True)

    top = sim_scores[:20]

    tfidf_map[tmdb_id] = [
        (tmdb_ids[i], float(score)) for i, score in top
    ]

# ------------------------
# SAVE MODEL (USED BY HYBRID RECS)
# ------------------------
with open(f"{MODELS_PATH}/movie_tfidf.pkl", "wb") as f:
    pickle.dump(tfidf_map, f)

print("Movie TF-IDF similarity map saved.")
print("Content-based recommender built successfully.")