import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type MediaItem = {
  tmdb_id: number;
  poster_path: string;
  title?: string;
  name?: string;
};

type Interaction = "seen" | "like" | "love";

const GENRE_MAP = {
  Action: {
    movie: ["Action", "Adventure"],
    tv: ["Action & Adventure"],
  },
  Comedy: {
    movie: ["Comedy"],
    tv: ["Comedy"],
  },
  Drama: {
    movie: ["Drama"],
    tv: ["Drama"],
  },
  Thriller: {
    movie: ["Thriller", "Crime"],
    tv: ["Crime", "Mystery"],
  },
  "Sci-Fi": {
    movie: ["Science Fiction"],
    tv: ["Sci-Fi & Fantasy"],
  },
  Fantasy: {
    movie: ["Fantasy"],
    tv: ["Sci-Fi & Fantasy"],
  },
  Adventure: {
    movie: ["Adventure"],
    tv: ["Action & Adventure"],
  },
  Animation: {
    movie: ["Animation"],
    tv: ["Animation"],
  },

  // NEW (fix coverage gaps)
  Documentary: {
    movie: ["Documentary"],
    tv: ["Documentary"],
  },
  Mystery: {
    movie: ["Mystery"],
    tv: ["Mystery"],
  },
  Family: {
    movie: ["Family"],
    tv: ["Family", "Kids"],
  },
};

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-5 mb-12">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="aspect-[2/3] rounded-lg bg-gray-800 animate-pulse"
        />
      ))}
    </div>
  );
}

function nextInteraction(current?: Interaction): Interaction | undefined {
  if (!current) return "seen";
  if (current === "seen") return "like";
  if (current === "like") return "love";
  return undefined;
}

export default function OnboardingPage() {
  const navigate = useNavigate();

  type GenreKey = keyof typeof GENRE_MAP;

  const [genres, setGenres] = useState<GenreKey[]>([]);
  const [movies, setMovies] = useState<MediaItem[]>([]);
  const [tvShows, setTvShows] = useState<MediaItem[]>([]);

  const [moviesLoading, setMoviesLoading] = useState(false);
  const [tvLoading, setTvLoading] = useState(false);

  const [movieInteractions, setMovieInteractions] = useState<
    Record<number, Interaction>
  >({});

  const [tvInteractions, setTvInteractions] = useState<
    Record<number, Interaction>
  >({});

  useEffect(() => {
    if (genres.length === 0) return;

    const movieGenres = genres.flatMap((g) => GENRE_MAP[g].movie);
    const tvGenres = genres.flatMap((g) => GENRE_MAP[g].tv);

    console.log("MOVIE GENRES:", movieGenres);
    console.log("TV GENRES:", tvGenres);

    const movieQuery = movieGenres
      .map((g) => `genres=${encodeURIComponent(g)}`)
      .join("&");
    const tvQuery = tvGenres
      .map((g) => `genres=${encodeURIComponent(g)}`)
      .join("&");

    setMoviesLoading(true);
    setTvLoading(true);

    fetch(`/api/onboarding/movies?${movieQuery}`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setMovies(data);
        setMoviesLoading(false);
      })
      .catch(() => setMoviesLoading(false));

    fetch(`/api/onboarding/tv?${tvQuery}`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setTvShows(data);
        setTvLoading(false);
      })
      .catch(() => setTvLoading(false));
  }, [genres]);

  function toggleMovie(id: number) {
    setMovieInteractions((prev) => {
      const next = nextInteraction(prev[id]);
      const copy = { ...prev };

      if (!next) delete copy[id];
      else copy[id] = next;

      return copy;
    });
  }

  function toggleTV(id: number) {
    setTvInteractions((prev) => {
      const next = nextInteraction(prev[id]);
      const copy = { ...prev };

      if (!next) delete copy[id];
      else copy[id] = next;

      return copy;
    });
  }

  async function submit() {
    if (
      Object.keys(movieInteractions).length < 3 ||
      Object.keys(tvInteractions).length < 3
    ) {
      alert("Interact with at least 3 movies and 3 TV shows");
      return;
    }

    await fetch("/api/onboarding/complete", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        movies: movieInteractions,
        tv: tvInteractions,
        genres: genres,
      }),
    });

    navigate("/");
  }

  function ringColor(interaction?: Interaction) {
    if (interaction === "seen") return "ring-4 ring-blue-400";
    if (interaction === "like") return "ring-4 ring-yellow-400";
    if (interaction === "love") return "ring-4 ring-red-500";
    return "";
  }

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-10 text-white">
      <h1 className="text-4xl font-bold mt-10 mb-2">What are you into?</h1>

      <p className="text-gray-400 mb-8 text-sm leading-relaxed">
        Pick some genres, then rate what you've watched. We'll use your taste to
        build your recommendations.
      </p>

      <div className="flex flex-wrap gap-3 mb-10">
        {[
          {
            color: "bg-blue-400",
            label: "1 click",
            desc: "Seen it",
            myList: false,
          },
          {
            color: "bg-yellow-400",
            label: "2 clicks",
            desc: "Like",
            myList: true,
          },
          {
            color: "bg-red-500",
            label: "3 clicks",
            desc: "Love",
            myList: true,
          },
          {
            color: "bg-gray-500",
            label: "4th click",
            desc: "Remove",
            myList: false,
          },
        ].map(({ color, label, desc, myList }) => (
          <div
            key={label}
            className="flex items-center gap-3 bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-400"
          >
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${color}`} />
            <span>
              <span className="text-white font-medium">{label}</span>
              {" — "}
              {desc}
              {myList && (
                <span className="ml-1.5 text-xs text-gray-500">
                  · added to My List
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap mb-12">
        {(Object.keys(GENRE_MAP) as GenreKey[]).map((g) => (
          <button
            key={g}
            onClick={() =>
              setGenres((prev) =>
                prev.includes(g as GenreKey)
                  ? prev.filter((x) => x !== g)
                  : [...prev, g as GenreKey],
              )
            }
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              genres.includes(g)
                ? "bg-red-600"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {genres.length > 0 && (
        <>
          <section className="mb-14">
            <h2 className="text-2xl font-semibold mb-5">Rate Movies</h2>
            {moviesLoading ? (
              <SkeletonGrid />
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-5 mb-12">
                {movies.map((m) => (
                  <img
                    key={m.tmdb_id}
                    src={`https://image.tmdb.org/t/p/w342${m.poster_path}`}
                    className={`cursor-pointer rounded-lg transition transform hover:scale-105 ${ringColor(
                      movieInteractions[m.tmdb_id],
                    )}`}
                    onClick={() => toggleMovie(m.tmdb_id)}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="mb-14">
            <h2 className="text-2xl font-semibold mb-5">Rate TV Shows</h2>
            {tvLoading ? (
              <SkeletonGrid />
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-5 mb-12">
                {tvShows.map((t) => (
                  <img
                    key={t.tmdb_id}
                    src={`https://image.tmdb.org/t/p/w342${t.poster_path}`}
                    className={`cursor-pointer rounded-lg transition transform hover:scale-105 ${ringColor(
                      tvInteractions[t.tmdb_id],
                    )}`}
                    onClick={() => toggleTV(t.tmdb_id)}
                  />
                ))}
              </div>
            )}
          </section>

          <div className="flex justify-center">
            <button
              onClick={submit}
              className="bg-red-600 hover:bg-red-500 px-8 py-3 rounded-lg text-lg font-semibold transition cursor-pointer"
            >
              Finish Setup
            </button>
          </div>
        </>
      )}
    </div>
  );
}
