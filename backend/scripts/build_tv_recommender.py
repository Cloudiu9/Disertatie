import json
import re
import joblib
import os
import pickle
import numpy as np
from dotenv import load_dotenv
from pymongo import MongoClient
from sklearn.feature_extraction.text import TfidfVectorizer

# ------------------------
# DB CONNECTION
# ------------------------
load_dotenv()
client = MongoClient(os.getenv("MONGO_URI"))
db = client["movie_platform"]
tv_collection = db["tv"]

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

def name_token(name: str) -> str:
    if not name:
        return ""
    return re.sub(r"\s+", "_", name.strip().lower())

# ------------------------
# LOAD SHOWS (Optimized via Streaming Cursor)
# ------------------------
print("Fetching TV shows from database...")
shows_cursor = tv_collection.find(
    {},
    {
        "_id": 0,
        "tmdb_id": 1,
        "name": 1,
        "overview": 1,
        "genres": 1,
        "tagline": 1,
        "keywords": 1,
        "cast": 1,
        "creator": 1,
    },
)

documents = []
tmdb_ids = []

for s in shows_cursor:
    genres_clean   = clean_text(" ".join(s.get("genres", [])))
    keywords_clean = clean_text(" ".join(s.get("keywords", [])))
    cast_tokens    = " ".join(name_token(n) for n in s.get("cast", []))
    creator_token  = name_token(s.get("creator") or "")

    text = " ".join([
        clean_text(s.get("name", "")) * 2,
        clean_text(s.get("overview", "")),
        clean_text(s.get("tagline", "")),
        (genres_clean + " ") * 3,             # primary axis
        (keywords_clean + " ") * 2,           # precise thematic signal
        (cast_tokens + " ") * 2,              # actor-based similarity
        (creator_token + " ") * 3,            # strong auteur/creator signal
    ])
    documents.append(text)
    tmdb_ids.append(int(s["tmdb_id"]))

num_shows = len(tmdb_ids)
if num_shows == 0:
    raise RuntimeError("No TV shows found in database")

print(f"Loaded {num_shows} TV shows. Building TF-IDF Matrix...")

# ------------------------
# TF-IDF
# ------------------------
vectorizer = TfidfVectorizer(
    ngram_range=(1, 2),
    min_df=3,
    max_df=0.8,
    sublinear_tf=True,
    stop_words='english',
)
tfidf_matrix = vectorizer.fit_transform(documents)

# Convert to Compressed Sparse Row format for optimal slicing performance
tfidf_matrix = tfidf_matrix.tocsr()

# ------------------------
# SAVE ARTIFACTS
# ------------------------
joblib.dump(vectorizer, f"{ARTIFACTS_PATH}/tv_vectorizer.joblib")
joblib.dump(tfidf_matrix, f"{ARTIFACTS_PATH}/tv_tfidf_matrix.joblib")
with open(f"{ARTIFACTS_PATH}/tv_index_to_tmdb.json", "w") as f:
    json.dump(tmdb_ids, f)

# ------------------------
# BUILD SIMILARITY MAP (Memory-Safe & Vectorized)
# ------------------------
print("Computing similarity map row-by-row...")
tfidf_map = {}

# Pre-transpose the matrix once for optimal dot product performance
tfidf_matrix_T = tfidf_matrix.T

for idx, tmdb_id in enumerate(tmdb_ids):
    # Calculate cosine similarity for JUST this single row using sparse dot product
    sim_scores = tfidf_matrix[idx].dot(tfidf_matrix_T).toarray().flatten()
    
    # Penalize self-similarity so a TV show never recommends itself
    sim_scores[idx] = -1.0
    
    # Safe boundary check for small catalogs
    k = min(50, num_shows - 1)
    if k <= 0:
        tfidf_map[tmdb_id] = []
        continue
        
    # High-performance NumPy argpartition: isolates top-K elements in linear time O(N)
    top_k_idx = np.argpartition(sim_scores, -k)[-k:]
    
    # Sort only those isolated 50 items to get the proper ranking order
    top_k_idx = top_k_idx[np.argsort(sim_scores[top_k_idx])[::-1]]
    
    # Save matches, completely skipping non-matched records (score <= 0)
    tfidf_map[tmdb_id] = [
        (tmdb_ids[i], float(sim_scores[i])) 
        for i in top_k_idx if sim_scores[i] > 0
    ]

# ------------------------
# SAVE MODEL
# ------------------------
with open(f"{MODELS_PATH}/tv_tfidf.pkl", "wb") as f:
    pickle.dump(tfidf_map, f)

print(f"Saved similarity map for {len(tfidf_map)} TV shows.")
print("TV recommender built successfully and optimally.")