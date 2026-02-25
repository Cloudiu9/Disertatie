# Vector — Movie Recommendation Platform

> A full-stack movie discovery and personalised recommendation system built as a dissertation project.

![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Flask%20%7C%20MongoDB-blue?style=flat-square)
![Python](https://img.shields.io/badge/Python-3.10%2B-yellow?style=flat-square&logo=python)
![React](https://img.shields.io/badge/React-TypeScript-61DAFB?style=flat-square&logo=react)
![License](https://img.shields.io/badge/License-Academic-lightgrey?style=flat-square)

---

## 1. Overview

Vector is a full-stack movie discovery platform that combines **content-based filtering**, **collaborative filtering**, and a **hybrid recommendation model** to deliver personalised movie suggestions. Built to explore real-world application of recommender systems, full-stack architecture, and API design.

Core goals:

- Efficient movie browsing and discovery
- Personalised recommendations based on user behaviour
- Full-stack architecture, REST API design, and authentication

---

## 2. Architecture

```
project/
├── backend/          # Flask REST API + MongoDB + recommendation scripts
│   ├── scripts/
│   │   └── build_content_recommender.py
│   ├── seed_movies.py
│   └── .env
└── frontend/         # React + TypeScript + TailwindCSS + Vite
    └── .env.local
```

**Frontend:** React · TypeScript · TailwindCSS · Vite  
**Backend:** Flask · MongoDB · Python (NumPy, Pandas, scikit-learn)

---

## 3. Features

### Movie Browsing

- Sections for **Popular**, **Top Rated**, and **New Releases**
- Horizontal drag scrolling and infinite scroll via `IntersectionObserver`
- Dynamic genre filtering pulled from MongoDB
- Hero section with rotating featured movies

### Search

- Instant title search with debounce
- Highlighted match results
- Middle-click and right-click support

### Rating System

- Normalised scores (e.g. 7.5, 8.2)
- Colour-coded by range: 1–4 (red) · 5–7 (orange) · 8–10 (green)

### Authentication

- Register, login, and logout
- Cookie-based sessions with environment-aware `samesite` config

### My List

- Add and remove movies with instant UI feedback
- Persistent across sessions with toast notifications

### Recommendations

| Type          | Based On                             |
| ------------- | ------------------------------------ |
| Content-Based | Genres, keywords, similarity vectors |
| Collaborative | User behaviour and My List activity  |
| Hybrid        | Weighted combination of both models  |

---

## 4. Getting Started

### 4.1 Clone the Repository

```bash
git clone <repo-url>
cd project
```

### 4.2 Backend Setup

```bash
cd backend
pip install -r requirements.txt

# Additional dependencies
pip install flask pymongo python-dotenv numpy pandas scikit-learn
```

Create `backend/.env`:

```env
MONGO_URI=your_mongodb_uri
TMDB_KEY=your_tmdb_api_key
```

> A TMDB API key is required and can be obtained from [themoviedb.org](https://www.themoviedb.org/).

### 4.3 Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
VITE_API_BASE=http://localhost:5000
```

### 4.4 Seed the Database

```bash
cd backend
python seed_movies.py
```

This downloads movie data, cleans it, and populates MongoDB.

### 4.5 Build the Content Recommender

> Must be re-run after every reseed.

```bash
python scripts/build_content_recommender.py
```

Generates the feature vectors and similarity matrices used for content-based recommendations.

### 4.6 Run the Application

```bash
# Terminal 1 — Backend
cd backend
flask run

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 5. API Reference

| Method   | Endpoint                         | Description                                     |
| -------- | -------------------------------- | ----------------------------------------------- |
| `GET`    | `/api/movies`                    | List movies (pagination, sorting, genre filter) |
| `GET`    | `/api/movies/:id`                | Get single movie                                |
| `GET`    | `/api/recommendations/movie/:id` | Content-based recommendations                   |
| `GET`    | `/api/recommendations/user`      | Personalised user recommendations               |
| `POST`   | `/api/register`                  | Create account                                  |
| `POST`   | `/api/login`                     | Log in                                          |
| `POST`   | `/api/logout`                    | Log out                                         |
| `GET`    | `/api/my-list`                   | Get user's saved list                           |
| `POST`   | `/api/my-list`                   | Add movie to list                               |
| `DELETE` | `/api/my-list/:id`               | Remove movie from list                          |

---

## 6. Technical Challenges

| Challenge                                         | Solution                                                          |
| ------------------------------------------------- | ----------------------------------------------------------------- |
| Cookie authentication failing across environments | Environment-aware `samesite` / `secure` config                    |
| Frontend bypassing Vite proxy                     | Changed `fetch` calls from absolute URLs to `/api` relative paths |
| Incorrect collaborative filtering results         | Implemented weighted similarity scoring                           |
| Drag events triggering movie navigation           | `didDrag` flag to distinguish drag from click                     |
| Genre switching caused scroll jumps               | Persistent container height                                       |
| Low-vote movies ranking highly                    | Minimum 2,000 votes threshold for Top Rated                       |
| Genres hardcoded                                  | Dynamic genre loading from MongoDB                                |

---

## 7. Performance

- Infinite scroll with `IntersectionObserver`
- Debounced search input
- Lazy loading and image optimisation
- Responsive card variants: `default` · `compact` · `recommendation`

---

## 8. Scripts

| Script            | Command                                       | Description                   |
| ----------------- | --------------------------------------------- | ----------------------------- |
| Seed database     | `python seed_movies.py`                       | Download and store movie data |
| Build recommender | `python scripts/build_content_recommender.py` | Generate similarity model     |

---

## 9. Planned Features

- [ ] Trailer popup player
- [ ] Separate browse routes (New, Top, Popular)
- [ ] TV show support
- [ ] AI-enhanced recommendations
- [ ] Chatbot assistant

---

## 10. Status

| Component                | Status      |
| ------------------------ | ----------- |
| Backend API              | Complete    |
| Frontend UI              | Complete    |
| Authentication           | Complete    |
| Recommendations          | Complete    |
| Advanced recommendations | In Progress |
| Trailers                 | In Progress |
