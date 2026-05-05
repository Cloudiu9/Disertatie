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
    """
    Collapse a person's name into a single token.
    "Christopher Nolan" → "christopher_nolan"
    Prevents first/last names matching unrelated overview words.
    """
    if not name:
        return ""
    return re.sub(r"\s+", "_", name.strip().lower())

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
            "tagline": 1,
            "keywords": 1,
            "cast": 1,
            "director": 1,
        },
    )
)
if not movies:
    raise RuntimeError("No movies found in database")

documents = []
tmdb_ids = []

for m in movies:
    genres_clean   = clean_text(" ".join(m.get("genres", [])))
    keywords_clean = clean_text(" ".join(m.get("keywords", [])))
    cast_tokens    = " ".join(name_token(n) for n in m.get("cast", []))
    director_token = name_token(m.get("director") or "")

    text = " ".join([
        clean_text(m.get("title", "")) * 2,   # title: short but precise
        clean_text(m.get("overview", "")),
        clean_text(m.get("tagline", "")),
        (genres_clean + " ") * 3,             # primary axis
        (keywords_clean + " ") * 2,           # precise thematic signal
        (cast_tokens + " ") * 2,              # actor-based similarity
        (director_token + " ") * 3,           # strong auteur signal
    ])
    documents.append(text)
    tmdb_ids.append(int(m["tmdb_id"]))

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

# ------------------------
# SAVE ARTIFACTS
# ------------------------
joblib.dump(vectorizer, f"{ARTIFACTS_PATH}/tfidf_vectorizer.joblib")
joblib.dump(tfidf_matrix, f"{ARTIFACTS_PATH}/tfidf_matrix.joblib")
with open(f"{ARTIFACTS_PATH}/tfidf_index_to_tmdb.json", "w") as f:
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
with open(f"{MODELS_PATH}/movie_tfidf.pkl", "wb") as f:
    pickle.dump(tfidf_map, f)

print(f"Saved similarity map for {len(tfidf_map)} movies.")
print("Movie recommender built successfully.")