import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

import MovieRow from "../components/MovieRow";
import MovieMeta from "../components/MovieMeta";
import TrailerModal from "../components/TrailerModal";

import { fetchTrailer } from "../api/trailer";
import { addToMyList, fetchMyList, removeFromMyList } from "../api/myList";

import { useAuth } from "../context/AuthContext";

import type { Movie } from "../types/Movie";
import type { TVShow } from "../types/TVShow";

import { toast } from "react-hot-toast";

const IMAGE_BASE = "https://image.tmdb.org/t/p";

type Props = {
  mediaType: "movie" | "tv";
};

type Item = Movie | TVShow;

type SavedItem = {
  tmdb_id: number;
  media_type: "movie" | "tv";
  section?: "watched" | "watchlist";
  interaction?: "seen" | "like" | "love";
};

function DetailsPage({ mediaType }: Props) {
  const { id } = useParams();
  const { user } = useAuth();

  const [item, setItem] = useState<Item | null>(null);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<Item[]>([]);

  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [loadingTrailer, setLoadingTrailer] = useState(false);
  const [prefetchedTrailer, setPrefetchedTrailer] = useState<string | null>(
    null,
  );

  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  const baseApi = mediaType === "tv" ? "/api/tv" : "/api/movies";
  const recApi = `/api/recommendations/${mediaType}`;

  const resolvedMediaType: "movie" | "tv" = item?.media_type ?? mediaType;

  // =========================
  // STATE CHECKS
  // =========================

  const inWatchlist =
    !!item &&
    savedItems.some(
      (m) =>
        m.tmdb_id === item.tmdb_id &&
        m.media_type === resolvedMediaType &&
        m.section === "watchlist",
    );

  const watchedItem =
    item &&
    savedItems.find(
      (m) =>
        m.tmdb_id === item.tmdb_id &&
        m.media_type === resolvedMediaType &&
        m.section === "watched",
    );

  const inWatched = !!watchedItem;

  // =========================
  // FETCH DATA
  // =========================

  useEffect(() => {
    if (!id) return;

    setLoading(true);

    fetch(`${baseApi}/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setItem(d);
        setLoading(false);
      });
  }, [baseApi, id, mediaType]);

  useEffect(() => {
    if (!id) return;

    fetch(`${recApi}/${id}`)
      .then((r) => r.json())
      .then(setRecommendations)
      .catch(() => setRecommendations([]));
  }, [id, mediaType, recApi]);

  useEffect(() => {
    if (!item) return;

    fetchTrailer(item.tmdb_id, mediaType)
      .then((d) => d.key && setPrefetchedTrailer(d.key))
      .catch(() => {});
  }, [item, mediaType]);

  useEffect(() => {
    if (!user) return;

    fetchMyList()
      .then((data) => setSavedItems(data as SavedItem[]))
      .catch(() => setSavedItems([]));
  }, [user, id]);

  // =========================
  // ACTIONS
  // =========================

  async function refreshList() {
    const data = await fetchMyList();
    setSavedItems(data as SavedItem[]);
  }

  async function toggleWatchlist() {
    if (!item) return;

    if (inWatched) {
      toast.error("Already marked as Watched");
      return;
    }

    if (!user) {
      toast.error("Login required");
      return;
    }

    try {
      if (inWatchlist) {
        await removeFromMyList(item.tmdb_id, resolvedMediaType, "watchlist");
        toast.success("Removed from Watchlist");
      } else {
        await addToMyList(item.tmdb_id, resolvedMediaType, "watchlist");
        toast.success("Added to Watchlist");
      }

      await refreshList();
    } catch {
      toast.error("Action failed");
    }
  }

  async function addToWatched(interaction: "seen" | "like" | "love") {
    if (!item) return;

    if (!user) {
      toast.error("Login required");
      return;
    }

    try {
      await addToMyList(
        item.tmdb_id,
        resolvedMediaType,
        "watched",
        interaction,
      );

      toast.success(`Marked as ${interaction}`);
      setActionMenuOpen(false);

      await refreshList();
    } catch {
      toast.error("Action failed");
    }
  }

  async function removeFromWatched() {
    if (!item) return;

    if (!user) {
      toast.error("Login required");
      return;
    }

    try {
      await removeFromMyList(item.tmdb_id, resolvedMediaType, "watched");
      toast.success("Removed from Watched");
      setActionMenuOpen(false);

      await refreshList();
    } catch {
      toast.error("Action failed");
    }
  }

  async function playTrailer() {
    if (!item) return;

    setLoadingTrailer(true);

    try {
      let key = prefetchedTrailer;

      if (!key) {
        const d = await fetchTrailer(item.tmdb_id, mediaType);
        key = d.key;
      }

      if (!key) {
        toast.error("Trailer not available");
        return;
      }

      setTrailerKey(key);
      setTrailerOpen(true);
    } finally {
      setLoadingTrailer(false);
    }
  }

  // =========================
  // UI STATES
  // =========================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        Loading...
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        Not found
      </div>
    );
  }

  const posterUrl = item.poster_path
    ? `${IMAGE_BASE}/w500${item.poster_path}`
    : "/placeholder-poster.png";

  const backdropUrl = item.backdrop_path
    ? `${IMAGE_BASE}/original${item.backdrop_path}`
    : undefined;

  // =========================
  // RENDER
  // =========================

  return (
    <div className="min-h-screen bg-black text-white">
      <div
        className="relative h-[80vh] w-full bg-cover bg-center"
        style={{
          backgroundImage: backdropUrl ? `url(${backdropUrl})` : undefined,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/20" />

        <div className="relative z-10 mx-auto flex h-full max-w-screen-2xl items-end px-6 pb-12">
          <div className="flex gap-8">
            <img src={posterUrl} className="w-[220px] rounded-lg shadow-xl" />

            <div className="max-w-2xl">
              <h1 className="text-4xl font-extrabold mb-3">{item.title}</h1>

              <div className="text-gray-300 mb-3">
                <MovieMeta year={item.year} rating={item.rating} />
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {item.genres.map((g) => (
                  <span
                    key={g}
                    className="bg-white/10 px-2 py-1 rounded text-sm"
                  >
                    {g}
                  </span>
                ))}
              </div>

              {item.overview && (
                <p className="text-gray-200 max-w-xl">{item.overview}</p>
              )}

              <div className="flex gap-3 mt-6 items-start">
                <button
                  onClick={playTrailer}
                  className="bg-white text-black px-6 py-2 rounded font-semibold cursor-pointer"
                >
                  {loadingTrailer ? "Loading" : "Play"}
                </button>

                <button
                  onClick={toggleWatchlist}
                  className="bg-white/20 px-5 py-2 rounded font-semibold cursor-pointer"
                >
                  {inWatchlist ? "✓ In Watchlist" : "+ Watchlist"}
                </button>

                <div className="relative">
                  <button
                    onClick={() => setActionMenuOpen((prev) => !prev)}
                    className="bg-red-600 hover:bg-red-500 px-5 py-2 rounded font-semibold cursor-pointer"
                  >
                    {inWatched ? "✓ Watched" : "Watched"}
                  </button>

                  {actionMenuOpen && (
                    <div className="absolute left-0 mt-2 w-44 rounded-lg border border-white/10 bg-black/95 shadow-xl overflow-hidden z-20">
                      <button
                        onClick={() => addToWatched("seen")}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-white/10"
                      >
                        Seen
                      </button>
                      <button
                        onClick={() => addToWatched("like")}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-white/10"
                      >
                        Like
                      </button>
                      <button
                        onClick={() => addToWatched("love")}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-white/10"
                      >
                        Love
                      </button>

                      <div className="h-px bg-white/10 my-1" />

                      <button
                        onClick={removeFromWatched}
                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
                      >
                        Remove from Watched
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {inWatched && watchedItem?.interaction && (
                <p className="mt-3 text-sm text-gray-400">
                  Marked as: {watchedItem.interaction}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10">
        {recommendations.length > 0 && (
          <MovieRow
            title="Recommended"
            movies={recommendations.filter((r) => r.tmdb_id !== item.tmdb_id)}
            disableFetch
            mediaType={mediaType}
            variant="recommendation"
          />
        )}
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-8">
        <Link
          to={mediaType === "tv" ? "/tv" : "/"}
          className="text-gray-400 hover:text-white"
        >
          ← Back
        </Link>
      </div>

      {trailerOpen && (
        <TrailerModal
          videoKey={trailerKey}
          onClose={() => setTrailerOpen(false)}
        />
      )}
    </div>
  );
}

export default DetailsPage;
