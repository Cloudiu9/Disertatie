import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type MediaItem = {
  tmdb_id: number;
  poster_path: string;
  title?: string;
  name?: string;
};

const GENRES = [
  "Action",
  "Comedy",
  "Drama",
  "Thriller",
  "Sci-Fi",
  "Fantasy",
  "Adventure",
  "Animation",
];

export default function OnboardingPage() {
  const navigate = useNavigate();

  const [genres, setGenres] = useState<string[]>([]);
  const [movies, setMovies] = useState<MediaItem[]>([]);
  const [tvShows, setTvShows] = useState<MediaItem[]>([]);

  const [selectedMovies, setSelectedMovies] = useState<number[]>([]);
  const [selectedTV, setSelectedTV] = useState<number[]>([]);

  useEffect(() => {
    if (genres.length === 0) return;

    const query = genres.map((g) => `genres=${g}`).join("&");

    fetch(`/api/onboarding/movies?${query}`, { credentials: "include" })
      .then((res) => res.json())
      .then(setMovies);

    fetch(`/api/onboarding/tv?${query}`, { credentials: "include" })
      .then((res) => res.json())
      .then(setTvShows);
  }, [genres]);

  function toggleMovie(id: number) {
    setSelectedMovies((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleTV(id: number) {
    setSelectedTV((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function submit() {
    if (selectedMovies.length < 3 || selectedTV.length < 3) {
      alert("Select at least 3 movies and 3 TV shows");
      return;
    }

    await fetch("/api/onboarding/complete", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        movies: selectedMovies,
        tv: selectedTV,
        genres: genres,
      }),
    });

    navigate("/");
  }

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 text-white">
      <h1 className="text-3xl font-bold mb-6">Choose Your Favorite Genres</h1>

      <div className="flex gap-3 flex-wrap mb-10">
        {GENRES.map((g) => (
          <button
            key={g}
            onClick={() =>
              setGenres((prev) =>
                prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g],
              )
            }
            className={`px-4 py-2 rounded ${
              genres.includes(g) ? "bg-red-600" : "bg-gray-700"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {genres.length > 0 && (
        <>
          <h2 className="text-2xl font-semibold mb-4">
            Pick at least 3 Movies
          </h2>

          <div className="grid grid-cols-6 gap-4 mb-10">
            {movies.map((m) => (
              <img
                key={m.tmdb_id}
                src={`https://image.tmdb.org/t/p/w300${m.poster_path}`}
                className={`cursor-pointer rounded ${
                  selectedMovies.includes(m.tmdb_id)
                    ? "ring-4 ring-red-500"
                    : ""
                }`}
                onClick={() => toggleMovie(m.tmdb_id)}
              />
            ))}
          </div>

          <h2 className="text-2xl font-semibold mb-4">
            Pick at least 3 TV Shows
          </h2>

          <div className="grid grid-cols-6 gap-4 mb-10">
            {tvShows.map((t) => (
              <img
                key={t.tmdb_id}
                src={`https://image.tmdb.org/t/p/w300${t.poster_path}`}
                className={`cursor-pointer rounded ${
                  selectedTV.includes(t.tmdb_id) ? "ring-4 ring-red-500" : ""
                }`}
                onClick={() => toggleTV(t.tmdb_id)}
              />
            ))}
          </div>

          <button
            onClick={submit}
            className="bg-red-600 px-6 py-3 rounded text-lg"
          >
            Finish Setup
          </button>
        </>
      )}
    </div>
  );
}
