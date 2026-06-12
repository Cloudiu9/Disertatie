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

def name_token(name: str) -> str:
    if not name:
        return ""
    return re.sub(r"\s+", "_", name.strip().lower())

# ------------------------
# LOAD MOVIES (Optimized via Streaming Cursor)
# ------------------------
print("Fetching movies from database...")
movies_cursor = movies_collection.find(
    {},
    {
        "_id": 0,
        "tmdb_id": 1,
        "title": 1,
        "overview": 1,
        "genres": 1,
        "tagline": 1,
        "keywords": 1,
        "cast": 1,
        "director": 1,
    },
)

documents = []
tmdb_ids = []

for m in movies_cursor:
    genres_clean   = clean_text(" ".join(m.get("genres", [])))
    keywords_clean = clean_text(" ".join(m.get("keywords", [])))
    cast_tokens    = " ".join(name_token(n) for n in m.get("cast", []))
    director_token = name_token(m.get("director") or "")

    text = " ".join([
        clean_text(m.get("title", "")) * 2,
        clean_text(m.get("overview", "")),
        clean_text(m.get("tagline", "")),
        (genres_clean + " ") * 3,
        (keywords_clean + " ") * 2,
        (cast_tokens + " ") * 2,
        (director_token + " ") * 3,
    ])
    documents.append(text)
    tmdb_ids.append(int(m["tmdb_id"]))

num_movies = len(tmdb_ids)
if num_movies == 0:
    raise RuntimeError("No movies found in database")

print(f"Loaded {num_movies} movies. Building TF-IDF Matrix...")

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

# Convert to Compressed Sparse Row format to ensure faster row slicing
tfidf_matrix = tfidf_matrix.tocsr()

# ------------------------
# SAVE ARTIFACTS
# ------------------------
joblib.dump(vectorizer, f"{ARTIFACTS_PATH}/tfidf_vectorizer.joblib")
joblib.dump(tfidf_matrix, f"{ARTIFACTS_PATH}/tfidf_matrix.joblib")
with open(f"{ARTIFACTS_PATH}/tfidf_index_to_tmdb.json", "w") as f:
    json.dump(tmdb_ids, f)

# ------------------------
# BUILD SIMILARITY MAP (Memory-Safe & Vectorized)
# ------------------------
print("Computing similarity map row-by-row...")
tfidf_map = {}

# Pre-transpose the matrix once for optimal dot product performance
tfidf_matrix_T = tfidf_matrix.T

for idx, tmdb_id in enumerate(tmdb_ids):
    # Calculate cosine similarity for JUST this row against all items
    # Spares us from allocating a massive dense NxN grid
    sim_scores = tfidf_matrix[idx].dot(tfidf_matrix_T).toarray().flatten()
    
    # Force self-similarity to a penalty score so a movie never recommends itself
    sim_scores[idx] = -1.0
    
    # Safe boundary check for catalogs smaller than 50 items
    k = min(50, num_movies - 1)
    if k <= 0:
        tfidf_map[tmdb_id] = []
        continue
        
    # High-performance NumPy argpartition: isolates top-K elements in O(N) linear time
    top_k_idx = np.argpartition(sim_scores, -k)[-k:]
    
    # Sort only those isolated 50 items, preserving top-ranking order
    top_k_idx = top_k_idx[np.argsort(sim_scores[top_k_idx])[::-1]]
    
    # Save matches, filtering out completely un-matched items (score <= 0)
    tfidf_map[tmdb_id] = [
        (tmdb_ids[i], float(sim_scores[i])) 
        for i in top_k_idx if sim_scores[i] > 0
    ]

# ------------------------
# SAVE MODEL
# ------------------------
with open(f"{MODELS_PATH}/movie_tfidf.pkl", "wb") as f:
    pickle.dump(tfidf_map, f)

print(f"Saved similarity map for {len(tfidf_map)} movies.")
print("Movie recommender built successfully and optimally.")