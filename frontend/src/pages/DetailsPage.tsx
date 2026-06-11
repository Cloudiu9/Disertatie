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
import { SkeletonDetails } from "../components/Skeletons";

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
  const [skeletonFading, setSkeletonFading] = useState(false);

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
    setSkeletonFading(false); // reset on navigation

    fetch(`${baseApi}/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setItem(d);
        setSkeletonFading(true); // 1. fade skeleton out
        setTimeout(() => setLoading(false), 400); // 2. unmount after
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
      <div
        className={`transition-opacity duration-400 ${
          skeletonFading ? "opacity-0" : "opacity-100"
        }`}
      >
        <SkeletonDetails />
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
      {/* HERO */}
      <div
        className="relative w-full bg-cover bg-center min-h-[50vh] sm:min-h-[60vh] lg:min-h-[70vh] flex items-end"
        style={{
          backgroundImage: backdropUrl ? `url(${backdropUrl})` : undefined,
        }}
      >
        {/* responsive height gradient transition */}
        <div className="absolute inset-0 bg-linear-to-t from-black via-black/60 to-black/10" />

        {/* CONTENT CONTAINER - Snaps to bottom on desktop via parent flex items-end */}
        <div className="relative z-10 w-full mx-auto max-w-screen-2xl px-4 sm:px-6 pt-32 pb-10">
          {/* LAYOUT SWITCH */}
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-center lg:items-end">
            {/* POSTER */}
            <img
              src={posterUrl}
              className="w-40 sm:w-52 lg:w-60 rounded-lg shadow-2xl mx-auto lg:mx-0 transform lg:translate-y-6 z-20 border border-white/10"
              alt={item.title}
            />

            {/* CONTENT */}
            <div className="flex-1 min-w-0 w-full">
              {/* TITLE */}
              <h1 className="text-2xl sm:text-3xl lg:text-5xl font-extrabold mb-3 text-center lg:text-left tracking-tight drop-shadow-md">
                {item.title}
              </h1>

              {/* META */}
              <div className="mb-3 flex justify-center lg:justify-start">
                <MovieMeta
                  year={item.year}
                  rating={item.rating}
                  runtime={item.runtime}
                  seasons={"seasons" in item ? item.seasons : undefined}
                  episodes={"episodes" in item ? item.episodes : undefined}
                />
              </div>

              {/* GENRES */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-2 mb-4">
                {item.genres.map((g) => (
                  <span
                    key={g}
                    className="bg-white/10 px-2.5 py-1 rounded text-xs sm:text-sm font-medium backdrop-blur-xs"
                  >
                    {g}
                  </span>
                ))}
              </div>

              {/* OVERVIEW */}
              {item.overview && (
                <p className="text-gray-300 max-w-3xl text-sm sm:text-base text-center lg:text-left leading-relaxed drop-shadow-xs">
                  {item.overview}
                </p>
              )}

              {/* ACTIONS */}
              <div className="mt-6 flex flex-col sm:flex-row flex-wrap gap-3 justify-center lg:justify-start">
                {/* PLAY */}
                <button
                  onClick={playTrailer}
                  className="bg-white text-black hover:bg-white/90 active:scale-98 transition px-6 py-2.5 rounded font-semibold w-full sm:w-auto shadow-md"
                >
                  {loadingTrailer ? "Loading..." : "Play"}
                </button>

                {/* WATCHLIST */}
                <button
                  onClick={toggleWatchlist}
                  className="bg-white/20 hover:bg-white/30 active:scale-98 transition px-5 py-2.5 rounded font-semibold w-full sm:w-auto truncate backdrop-blur-xs"
                >
                  {inWatchlist ? "✓ Watchlist" : "+ Watchlist"}
                </button>

                {/* WATCHED MENU */}
                <div className="relative w-full sm:w-auto">
                  <button
                    onClick={() => setActionMenuOpen((prev) => !prev)}
                    className="bg-red-600 hover:bg-red-500 active:scale-98 transition px-5 py-2.5 rounded font-semibold w-full sm:w-auto"
                  >
                    {inWatched ? "✓ Watched" : "Watched"}
                  </button>
                  {actionMenuOpen && (
                    <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-full sm:w-44 rounded-lg border border-white/10 bg-black/95 shadow-xl overflow-hidden z-20 backdrop-blur-md">
                      <button
                        onClick={() => addToWatched("seen")}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition"
                      >
                        Seen
                      </button>
                      <button
                        onClick={() => addToWatched("like")}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition"
                      >
                        Like
                      </button>
                      <button
                        onClick={() => addToWatched("love")}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition"
                      >
                        Love
                      </button>
                      <div className="h-px bg-white/10 my-1" />
                      {inWatched && (
                        <button
                          onClick={removeFromWatched}
                          className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* STATUS */}
              {inWatched && watchedItem?.interaction && (
                <p className="mt-3 text-sm text-gray-400 text-center lg:text-left italic">
                  Marked as: {watchedItem.interaction}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* RECOMMENDATIONS */}
      <div className="mt-10">
        {recommendations.length > 0 && (
          <MovieRow
            title="Recommended"
            movies={recommendations.filter((r) => r.tmdb_id !== item.tmdb_id)}
            disableFetch
            mediaType={mediaType}
            variant="recommendation"
            showExplanation={true}
            sourceTmdbId={item.tmdb_id}
            sourceMediaType={mediaType}
          />
        )}
      </div>
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-8">
        <Link
          to={mediaType === "tv" ? "/tv" : "/"}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ← Back
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

export default DetailsPage;
