import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import type { Movie } from "../types/Movie";
import MovieRow from "../components/MovieRow";

const IMAGE_BASE = "https://image.tmdb.org/t/p";

function MovieDetailsPage() {
  const { id } = useParams();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<Movie[]>([]);

  useEffect(() => {
    if (!id) return;

    setRecommendations([]); // hard reset to prevent stale UI

    fetch(`http://127.0.0.1:5000/api/recommendations/movie/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Recommendations fetch failed");
        return res.json();
      })
      .then(setRecommendations)
      .catch(() => setRecommendations([]));
  }, [id]);

  useEffect(() => {
    setLoading(true);

    fetch(`http://127.0.0.1:5000/api/movies/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setMovie(data);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        Loading...
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        Movie not found
      </div>
    );
  }

  const posterUrl = movie.poster_path
    ? `${IMAGE_BASE}/w500${movie.poster_path}`
    : "/placeholder-poster.png";

  const backdropUrl = movie.poster_path
    ? `${IMAGE_BASE}/original${movie.poster_path}`
    : undefined;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Backdrop */}
      <div
        className="relative h-[90vh] w-full bg-cover bg-center bg-[center_30%]"
        style={{
          backgroundImage: backdropUrl ? `url(${backdropUrl})` : undefined,
          // make it less zoomed, potential fix?
          // backgroundSize: "80%",
          // backgroundRepeat: "no-repeat",
        }}
      >
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/20" />

        {/* Content */}
        <div className="relative z-10 mx-auto flex h-full max-w-screen-2xl items-end px-6 pb-12">
          <div className="flex gap-8">
            {/* Poster */}
            <img
              src={posterUrl}
              alt={movie.title}
              className="hidden w-[220px] rounded-lg shadow-xl md:block"
            />

            {/* Info */}
            <div className="max-w-2xl">
              <h1 className="mb-4 text-4xl font-extrabold">{movie.title}</h1>

              <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-gray-300">
                {movie.year && <span>{movie.year}</span>}
                {movie.runtime && <span>{movie.runtime} min</span>}
                <span className="text-green-400">
                  ⭐ {movie.rating.toFixed(1)}
                </span>
              </div>

              <div className="mb-4 flex flex-wrap gap-2 text-sm text-gray-200">
                {movie.genres.map((g) => (
                  <span key={g} className="rounded bg-white/10 px-2 py-1">
                    {g}
                  </span>
                ))}
              </div>

              {movie.overview && (
                <p className="max-w-xl text-sm leading-relaxed text-gray-200">
                  {movie.overview}
                </p>
              )}

              {/* Actions (future-proof) */}
              <div className="mt-6 flex gap-4">
                <button className="rounded bg-white px-6 py-2 text-sm font-semibold text-black hover:bg-gray-200 transition">
                  Play
                </button>
                <button className="rounded bg-white/20 px-6 py-2 text-sm font-semibold hover:bg-white/30 transition">
                  + My List
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {recommendations.length > 0 && (
        <div className="mx-auto max-w-screen-2xl px-6 py-8">
          <MovieRow
            title="Recommended for you"
            movies={recommendations.filter((m) => m.tmdb_id !== movie.tmdb_id)}
            disableFetch
          />
        </div>
      )}

      {/* Back navigation */}
      <div className="mx-auto max-w-screen-2xl px-6 py-8">
        <Link
          to="/"
          className="text-sm text-gray-400 hover:text-white transition"
        >
          ← Back to browse
        </Link>
      </div>
    </div>
  );
}

export default MovieDetailsPage;
