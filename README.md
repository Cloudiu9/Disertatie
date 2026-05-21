# MovieFlix — Platformă web inteligentă pentru recomandarea personalizată a filmelor

![Stack](https://img.shields.io/badge/Stack-React%20%7C%20Flask%20%7C%20MongoDB-blue?style=flat-square)
![Python](https://img.shields.io/badge/Python-3.10%2B-yellow?style=flat-square&logo=python)
![React](https://img.shields.io/badge/React-TypeScript-61DAFB?style=flat-square&logo=react)
![Status](https://img.shields.io/badge/Status-Complete-brightgreen?style=flat-square)
![License](https://img.shields.io/badge/License-Academic-lightgrey?style=flat-square)

---

## 1. Prezentare generală

**MovieFlix** este o aplicație web full-stack pentru descoperirea și recomandarea personalizată de filme și seriale TV, concepută ca platformă de tip streaming. Sistemul combină filtrarea bazată pe conținut (TF-IDF + similaritate cosinus), filtrarea colaborativă ponderată (coeficient Jaccard) și un model hibrid adaptiv, extinse cu funcționalități de inteligență artificială generativă prin Groq API și LLaMA 3.1.

Aplicația este disponibilă public la: **[https://disertatie-frontend.vercel.app](https://disertatie-frontend.vercel.app)**

### Obiective principale

- Browsing și explorare film/serial cu interfață de tip streaming
- Recomandări personalizate bazate pe profilul utilizatorului
- Rezolvarea problemei cold-start printr-un flux de onboarding structurat
- Explicații generate de AI pentru fiecare recomandare
- Chatbot conversațional pentru descoperirea conținutului în limbaj natural
- Autentificare securizată cu JWT stocat în cookie HttpOnly

---

## 2. Arhitectura sistemului

```
project/
├── backend/                         # Flask REST API
│   ├── app/
│   │   ├── routes/                  # Blueprints: auth, movies, tv, recommendations,
│   │   │                            #             my_list, onboarding, explain, chat
│   │   ├── services/                # recommendation_service.py, explanation_service.py,
│   │   │                            # chat_service.py, auth_utils.py
│   │   └── models/                  # movie_tfidf.pkl, tv_tfidf.pkl (precomputate)
│   ├── scripts/
│   │   ├── seed_movies.py
│   │   ├── seed_tv.py
│   │   ├── build_movie_recommender.py
│   │   └── build_tv_recommender.py
│   └── .env
└── frontend/                        # React + TypeScript + Vite
    ├── src/
    │   ├── components/              # MovieCard, MovieRow, HeroBanner, TrailerModal,
    │   │                            # Skeletons, ChatWidget, ...
    │   ├── pages/                   # HomePage, MoviesPage, TVPage, DetailsPage,
    │   │                            # MyListPage, OnboardingPage, ProfilePage, ...
    │   ├── api/                     # movies.ts, tv.ts, myList.ts, recommendations.ts, ...
    │   ├── context/                 # AuthContext.tsx
    │   └── hooks/                   # useDragScroll.ts
    └── .env.local
```

**Frontend:** React · TypeScript · Tailwind CSS · Vite · React Router  
**Backend:** Flask · PyMongo · MongoDB Atlas · scikit-learn · JWT  
**AI:** Groq API · LLaMA 3.1 8B Instant  
**Deployment:** Vercel (frontend) · Render (backend) · CI/CD via GitHub

---

## 3. Funcționalități

### Browsing și explorare

- Pagini dedicate pentru filme și seriale TV, cu Hero Banner dinamic
- Rânduri orizontale cu drag-scroll: Populare, Top Rated, Noutăți
- Filtrare după gen, integrată în pagina principală
- Scroll infinit prin `IntersectionObserver`
- Căutare globală combinată filme + seriale, cu debounce

### Autentificare și cont

- Înregistrare, autentificare, deconectare
- JWT stocat în cookie HttpOnly (protecție XSS)
- Configurare cookie adaptivă: `SameSite=Lax` în dev, `SameSite=None; Secure` în producție
- Sesiune persistentă între reîncărcările paginii prin `/api/auth/me`

### My List

- Secțiuni distincte: **Watched** (seen / like / love) și **Watchlist**
- Adăugare și eliminare cu feedback vizual instant (toast notifications)
- Persistentă în MongoDB, sincronizată global prin `AuthContext`

### Sistem de recomandare

| Tip                  | Metodă                                                   | Context de utilizare              |
| -------------------- | -------------------------------------------------------- | --------------------------------- |
| Content-based        | TF-IDF + similaritate cosinus                            | Pagina de detalii (film / serial) |
| Colaborativ ponderat | Coeficient Jaccard + greutăți adaptive                   | Pagina principală                 |
| Hibrid adaptiv       | `collab × w_c + content × w_t` / penalizare popularitate | Recomandări personalizate         |

Ponderile `w_c` și `w_t` sunt adaptive în funcție de numărul de utilizatori similari disponibili, cu degradare elegantă spre content-based în absența semnalului colaborativ.

Greutăți interacțiuni: `seen = 1` · `like = 2` · `love = 3`

### Onboarding (rezolvarea cold-start)

- Flux în 2 pași: selecție genuri → selecție titluri inițiale (min. 3 filme + 3 seriale)
- Selecțiile sunt salvate în `my_list`, `interactions` (cu tip `love`) și `preferred_genres`
- Reset preferințe disponibil oricând din profil

### Funcționalități AI (Groq API + LLaMA 3.1)

- **Explicații personalizate** — generate pentru fiecare recomandare afișată
- **Chatbot conversațional** — procesează cereri în limbaj natural și returnează titluri relevante din catalog; disponibil persistent în interfață ca `ChatWidget`

### UX și performanță

- Skeleton loading pe toate paginile (fără spinner-e clasice)
- Prefetch trailer la hover pentru latență percepută redusă
- Modal pentru trailere YouTube (fără redirect extern)
- Modele TF-IDF precomputate la offline, încărcate la startup — lookup O(1) la runtime

---

## 4. Instalare și rulare locală

### 4.1 Clonare repository

```bash
git clone https://github.com/Cloudiu9/Disertatie.git
cd project
```

### 4.2 Configurare backend

```bash
cd backend
pip install -r requirements.txt
```

Creează `backend/.env`:

```env
MONGO_URI=your_mongodb_atlas_uri
TMDB_KEY=your_tmdb_api_key
JWT_SECRET=your_jwt_secret_key
GROQ_API_KEY=your_groq_api_key
FLASK_ENV=development
```

> Cheia TMDB se obține de la [themoviedb.org](https://www.themoviedb.org/).  
> Cheia Groq se obține de la [console.groq.com](https://console.groq.com/).

### 4.3 Configurare frontend

```bash
cd frontend
npm install
```

Creează `frontend/.env.local`:

```env
VITE_API_BASE=http://localhost:8000
```

### 4.4 Populare bază de date

```bash
cd backend
python scripts/seed_movies.py
python scripts/seed_tv.py
```

Descarcă datele din TMDB și populează colecțiile MongoDB.

### 4.5 Construirea modelelor de recomandare

> Trebuie rulat după fiecare reseed al bazei de date.

```bash
cd backend
python scripts/build_movie_recommender.py
python scripts/build_tv_recommender.py
```

Generează fișierele `movie_tfidf.pkl` și `tv_tfidf.pkl` folosite la runtime.

### 4.6 Pornirea aplicației

```bash
# Terminal 1 — Backend
cd backend
flask run --port 8000

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Accesează aplicația la [http://localhost:5173](http://localhost:5173).

---

## 5. Harta rutelor API

| Metodă     | Rută                                  | Descriere                             |
| ---------- | ------------------------------------- | ------------------------------------- |
| `POST`     | `/api/auth/register`                  | Înregistrare utilizator               |
| `POST`     | `/api/auth/login`                     | Autentificare, setare cookie JWT      |
| `POST`     | `/api/auth/logout`                    | Deconectare, ștergere cookie          |
| `GET`      | `/api/auth/me`                        | Utilizatorul curent din cookie        |
| `GET`      | `/api/movies`                         | Listare filme (paginat, sortare, gen) |
| `GET`      | `/api/movies/<id>`                    | Detalii film                          |
| `GET`      | `/api/movies/search`                  | Căutare filme                         |
| `GET`      | `/api/movies/<id>/trailer`            | Cheie trailer YouTube                 |
| `GET`      | `/api/tv`                             | Listare seriale                       |
| `GET`      | `/api/tv/<id>`                        | Detalii serial                        |
| `GET`      | `/api/tv/search`                      | Căutare seriale                       |
| `GET`      | `/api/recommendations/movie/<id>`     | Recomandări content-based film        |
| `GET`      | `/api/recommendations/tv/<id>`        | Recomandări content-based serial      |
| `GET`      | `/api/user_recommendations/movies`    | Recomandări personalizate filme       |
| `GET`      | `/api/user_recommendations/tv`        | Recomandări personalizate seriale     |
| `GET`      | `/api/explain`                        | Explicație AI pentru o recomandare    |
| `POST`     | `/api/chat`                           | Chatbot conversațional                |
| `GET/POST` | `/api/my-list`                        | Citire / adăugare în My List          |
| `DELETE`   | `/api/my-list/<tmdb_id>/<media_type>` | Eliminare din My List                 |
| `GET`      | `/api/onboarding/movies`              | Filme filtrate pentru onboarding      |
| `GET`      | `/api/onboarding/tv`                  | Seriale filtrate pentru onboarding    |
| `POST`     | `/api/onboarding/complete`            | Finalizare onboarding                 |
| `POST`     | `/api/reset-preferences`              | Resetare preferințe utilizator        |

---

## 6. Provocări tehnice și soluțiile adoptate

| Provocare                                | Soluție                                                                 |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| Autentificare cross-origin în producție  | Cookie `SameSite=None; Secure=True` în producție, `SameSite=Lax` în dev |
| Cold-start pentru utilizatori noi        | Flux de onboarding cu colectare preferințe explicite                    |
| Semnal de recomandare slab (binar)       | Colecție separată `interactions` cu greutăți `seen/like/love`           |
| Latență la calculul similarității        | Modele TF-IDF precomputate offline, lookup O(1) la runtime              |
| Genuri diferite pentru filme vs. seriale | Mapare frontend separată pe tipul de conținut                           |
| Drag triggering navigare la click        | Flag `didDrag` pentru distincție drag vs. click                         |
| Halucinații AI în explicații             | Fallback la mesaj generic; RAG planificat ca îmbunătățire viitoare      |
| Conținut mixt film/serial în componente  | `mediaType` transmis explicit top-down, niciodată inferit               |

---

## 7. Status

| Componentă                             | Status        |
| -------------------------------------- | ------------- |
| Backend API                            | ✅ Complet    |
| Frontend UI                            | ✅ Complet    |
| Autentificare JWT                      | ✅ Complet    |
| My List (Watched + Watchlist)          | ✅ Complet    |
| Recomandări content-based              | ✅ Complet    |
| Recomandări colaborative ponderate     | ✅ Complet    |
| Sistem hibrid adaptiv                  | ✅ Complet    |
| Onboarding (cold-start)                | ✅ Complet    |
| Trailere YouTube (modal)               | ✅ Complet    |
| Căutare combinată filme + seriale      | ✅ Complet    |
| Explicații AI per recomandare          | ✅ Complet    |
| Chatbot conversațional AI              | ✅ Complet    |
| Deployment producție (Vercel + Render) | ✅ Complet    |
| Caching (Redis / React Query)          | 🔲 Planificat |
| Virtualizare liste                     | 🔲 Planificat |
| RAG pentru reducerea halucinațiilor    | 🔲 Planificat |

---

## 8. Tehnologii utilizate

| Categorie    | Tehnologie                                                 |
| ------------ | ---------------------------------------------------------- |
| Frontend     | React 18, TypeScript, Tailwind CSS, Vite, React Router     |
| Backend      | Flask, PyMongo, scikit-learn, python-dotenv, PyJWT, bcrypt |
| Baza de date | MongoDB Atlas                                              |
| AI / ML      | Groq API, LLaMA 3.1 8B Instant, TF-IDF (scikit-learn)      |
| Deployment   | Vercel (frontend), Render (backend)                        |
| CI/CD        | GitHub Actions                                             |
| Date externe | TMDB API                                                   |
