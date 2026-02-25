import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import type { Movie } from "../types/Movie";
import MovieRow from "../components/MovieRow";
import { addToMyList, removeFromMyList } from "../api/myList";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import MovieMeta from "../components/MovieMeta";
import TrailerModal from "../components/TrailerModal";
import { fetchTrailer } from "../api/trailer";

const IMAGE_BASE = "https://image.tmdb.org/t/p";

function MovieDetailsPage() {
  const { id } = useParams();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [inMyList, setInMyList] = useState(false);
  const { user } = useAuth();
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [loadingTrailer, setLoadingTrailer] = useState(false);
  const [prefetchedTrailer, setPrefetchedTrailer] = useState<string | null>(
    null,
  );

  // ==========================
  // Recommendations
  // ==========================

  useEffect(() => {
    if (!id) return;
    setRecommendations([]);
    fetch(`/api/recommendations/movie/${id}`)
      .then((res) => res.json())
      .then(setRecommendations)
      .catch(() => setRecommendations([]));
  }, [id]);

  // ==========================
  // Movie load
  // ==========================

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/movies/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setMovie(data);
        setLoading(false);
      });
  }, [id]);

  // ==========================
  // My List state
  // ==========================

  useEffect(() => {
    if (!movie) return;
    fetch("/api/my-list", { credentials: "include" })
      .then((res) => res.json())
      .then((list: Movie[]) => {
        setInMyList(list.some((m) => m.tmdb_id === movie.tmdb_id));
      })
      .catch(() => setInMyList(false));
  }, [movie]);

  // ==========================
  // Trailer Prefetch
  // ==========================

  useEffect(() => {
    if (!movie) return;
    setPrefetchedTrailer(null);
    fetchTrailer(movie.tmdb_id)
      .then((d) => {
        if (d.key) setPrefetchedTrailer(d.key);
      })
      .catch(() => {});
  }, [movie]);

  // ==========================
  // Loading states
  // ==========================

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        Loading...
      </div>
    );

  if (!movie)
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        Movie not found
      </div>
    );

  // ==========================
  // Images
  // ==========================

  const posterUrl = movie.poster_path
    ? `${IMAGE_BASE}/w500${movie.poster_path}`
    : "/placeholder-poster.png";

  const backdropUrl = movie.backdrop_path
    ? `${IMAGE_BASE}/original${movie.backdrop_path}`
    : undefined;

  // ==========================
  // Trailer handler
  // ==========================

  async function playTrailer() {
    if (!movie) return;
    setLoadingTrailer(true);
    try {
      let key = prefetchedTrailer;
      if (!key) {
        const data = await fetchTrailer(movie.tmdb_id);
        key = data.key;
      }
      if (!key) {
        toast.error("Trailer not available");
        return;
      }
      setTrailerKey(key);
      setTrailerOpen(true);
    } catch {
      toast.error("Trailer error");
    } finally {
      setLoadingTrailer(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* HERO */}
      <div
        className="relative h-[70vh] sm:h-[85vh] w-full bg-cover bg-center bg-[center_30%]"
        style={{
          backgroundImage: backdropUrl ? `url(${backdropUrl})` : undefined,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/20" />

        <div className="relative z-10 mx-auto flex h-full max-w-screen-2xl items-end px-4 sm:px-6 pb-8 sm:pb-12">
          <div className="flex flex-col md:flex-row gap-6 md:gap-8">
            <img
              src={posterUrl}
              alt={movie.title}
              className="hidden md:block w-[180px] lg:w-[220px] rounded-lg shadow-xl"
            />

            <div className="max-w-2xl">
              <h1 className="mb-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold">
                {movie.title}
              </h1>

              <div className="mb-3 text-sm sm:text-base text-gray-300">
                <MovieMeta year={movie.year} rating={movie.rating} />
              </div>

              <div className="mb-3 flex flex-wrap gap-2 text-xs sm:text-sm text-gray-200">
                {movie.genres.map((g) => (
                  <span key={g} className="rounded bg-white/10 px-2 py-1">
                    {g}
                  </span>
                ))}
              </div>

              {movie.overview && (
                <p className="max-w-xl text-xs sm:text-sm leading-relaxed text-gray-200">
                  {movie.overview}
                </p>
              )}

              {/* BUTTONS */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={playTrailer}
                  className="cursor-pointer rounded bg-white px-6 py-2 text-sm font-semibold text-black hover:bg-gray-200 transition"
                >
                  {loadingTrailer ? "Loading" : "Play"}
                </button>

                <button
                  onClick={async () => {
                    if (!user) {
                      toast.error("Login required");
                      return;
                    }
                    try {
                      if (inMyList) {
                        await removeFromMyList(movie.tmdb_id);
                        setInMyList(false);
                        toast.success("Removed");
                      } else {
                        await addToMyList(movie.tmdb_id);
                        setInMyList(true);
                        toast.success("Added");
                      }
                    } catch {
                      toast.error("Action failed");
                    }
                  }}
                  className="cursor-pointer rounded bg-white/20 px-5 py-2 text-xs sm:text-sm font-semibold hover:bg-white/30 transition"
                >
                  {inMyList ? "✓ In My List" : "+ My List"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RECOMMENDATIONS */}
      {recommendations.length > 0 && (
        <MovieRow
          title="Recommended for you"
          movies={recommendations.filter((m) => m.tmdb_id !== movie.tmdb_id)}
          disableFetch
          variant="recommendation"
        />
      )}

      {/* BACK LINK */}
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 py-6 sm:py-8">
        <Link
          to="/"
          className="text-xs sm:text-sm text-gray-400 hover:text-white transition"
        >
          ← Back to browse
        </Link>
      </div>

      {/* TRAILER */}
      {trailerOpen && (
        <TrailerModal
          videoKey={trailerKey}
          onClose={() => setTrailerOpen(false)}
        />
      )}
    </div>
  );
}

export default MovieDetailsPage;
