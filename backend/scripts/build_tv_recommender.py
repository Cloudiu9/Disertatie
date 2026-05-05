import json
import re
import joblib
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

# ------------------------
# LOAD SHOWS
# ------------------------
shows = list(
    tv_collection.find(
        {},
        {
            "_id": 0,
            "tmdb_id": 1,
            "name": 1,
            "overview": 1,
            "genres": 1,
            "tagline": 1,
        },
    )
)
if not shows:
    raise RuntimeError("No TV shows found in database")

documents = []
tmdb_ids = []

for s in shows:
    genres_clean = clean_text(" ".join(s.get("genres", [])))

    text = " ".join([
        clean_text(s.get("name", "")) * 2,    # repeated: exact title matches matter
        clean_text(s.get("overview", "")),
        clean_text(s.get("tagline", "")),      # tone/theme signal not in overview
        (genres_clean + " ") * 3,             # primary similarity axis
    ])
    documents.append(text)
    tmdb_ids.append(int(s["tmdb_id"]))

# ------------------------
# TF-IDF
# ------------------------
vectorizer = TfidfVectorizer(
    ngram_range=(1, 2),
    min_df=3,
    max_df=0.8,
    sublinear_tf=True,      # log(1+tf): dampens repetition
    stop_words='english',   # removes "the", "a", "his", "her" etc.
)
tfidf_matrix = vectorizer.fit_transform(documents)

# ------------------------
# SAVE ARTIFACTS
# ------------------------
joblib.dump(vectorizer, f"{ARTIFACTS_PATH}/tv_vectorizer.joblib")
joblib.dump(tfidf_matrix, f"{ARTIFACTS_PATH}/tv_tfidf_matrix.joblib")
with open(f"{ARTIFACTS_PATH}/tv_index_to_tmdb.json", "w") as f:
    json.dump(tmdb_ids, f)

# ------------------------
# BUILD SIMILARITY MAP
# ------------------------
print("Computing cosine similarity...")
cosine_sim = cosine_similarity(tfidf_matrix)

tfidf_map = {}
for idx, tmdb_id in enumerate(tmdb_ids):
    sim_scores = [(i, s) for i, s in enumerate(cosine_sim[idx]) if i != idx]
    sim_scores.sort(key=lambda x: x[1], reverse=True)
    tfidf_map[tmdb_id] = [
        (tmdb_ids[i], float(score)) for i, score in sim_scores[:50]
    ]

# ------------------------
# SAVE MODEL
# ------------------------
with open(f"{MODELS_PATH}/tv_tfidf.pkl", "wb") as f:
    pickle.dump(tfidf_map, f)

print(f"Saved similarity map for {len(tfidf_map)} shows.")
print("TV recommender built successfully.")