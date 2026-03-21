import json
import re
import joblib
import os
import pickle
from dotenv import load_dotenv
from pymongo import MongoClient
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

load_dotenv()

client = MongoClient(os.getenv("MONGO_URI"))
db = client["movie_platform"]
tv_collection = db["tv_shows"]

# ------------------------
# PATHS
# ------------------------
ARTIFACTS_PATH = "./artifacts"
MODELS_PATH = "./models"

os.makedirs(ARTIFACTS_PATH, exist_ok=True)
os.makedirs(MODELS_PATH, exist_ok=True)

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
    tmdb_ids.append(int(s["tmdb_id"]))

vectorizer = TfidfVectorizer(
    ngram_range=(1, 2),
    min_df=3,
    max_df=0.8,
)

tfidf_matrix = vectorizer.fit_transform(documents)

# ------------------------
# SAVE ORIGINAL ARTIFACTS
# ------------------------
joblib.dump(vectorizer, f"{ARTIFACTS_PATH}/tv_vectorizer.joblib")
joblib.dump(tfidf_matrix, f"{ARTIFACTS_PATH}/tv_tfidf_matrix.joblib")

with open(f"{ARTIFACTS_PATH}/tv_index_to_tmdb.json", "w") as f:
    json.dump(tmdb_ids, f)

# ------------------------
# BUILD SIMILARITY MAP
# ------------------------
print("Computing TV cosine similarity...")

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
# SAVE MODEL
# ------------------------
with open(f"{MODELS_PATH}/tv_tfidf.pkl", "wb") as f:
    pickle.dump(tfidf_map, f)

print("TV TF-IDF similarity map saved.")
print("TV recommender built successfully.")