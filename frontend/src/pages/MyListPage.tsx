import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { Movie } from "../types/Movie";
import type { TVShow } from "../types/TVShow";

import { fetchMyList, removeFromMyList } from "../api/myList";

import { toast } from "react-hot-toast";

import MovieCard from "../components/MovieCard";
import { SkeletonGrid } from "../components/Skeletons";

type Item = Movie | TVShow;

function MyListPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const movies = items.filter((i) => i.media_type === "movie");
  const tvShows = items.filter((i) => i.media_type === "tv");

  useEffect(() => {
    fetchMyList()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = async (tmdb_id: number, mediaType: "movie" | "tv") => {
    try {
      await removeFromMyList(tmdb_id, mediaType);

      setItems((prev) =>
        prev.filter(
          (i) => !(i.tmdb_id === tmdb_id && i.media_type === mediaType),
        ),
      );

      toast.success("Removed");
    } catch {
      toast.error("Remove failed");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black pt-24 pb-12 px-8 space-y-12">
        <div className="h-10 w-48 bg-gray-700 rounded animate-pulse" />
        <SkeletonGrid />
        <SkeletonGrid />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <h1 className="text-4xl font-bold text-white mb-4">
            Your List is Empty
          </h1>

          <p className="text-gray-400 mb-8">
            Add movies and TV shows to build your personal recommendations.
          </p>

          <button
            onClick={() => navigate("/onboarding")}
            className="bg-red-600 hover:bg-red-500 px-6 py-3 rounded-lg font-semibold text-white transition cursor-pointer"
          >
            Start Personalizing
          </button>
        </div>
      </div>
    );
  }

  async function resetPreferences() {
    const confirmReset = confirm(
      "Reset all preferences and restart onboarding?",
    );

    if (!confirmReset) return;

    const res = await fetch("/api/reset-preferences", {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) {
      toast.error("Reset failed");
      return;
    }

    toast.success("Preferences reset");

    navigate("/onboarding");
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="pt-24 pb-12">
        {/* Header section cu titlu și buton aliniate */}
        <div className="px-8 mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
              My List
            </h1>
            <p className="text-gray-400 text-lg">{items.length} items</p>
          </div>

          <button
            onClick={resetPreferences}
            className="text-sm text-gray-400 hover:text-white underline pb-1 whitespace-nowrap"
          >
            Reset Preferences
          </button>
        </div>

        <div className="px-8 space-y-12">
          {movies.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold text-white mb-6">
                Movies ({movies.length})
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-6 [&>*]:w-full [&_img]:w-full [&_img]:aspect-[2/3] [&_img]:h-auto">
                {movies.map((item) => (
                  <MovieCard
                    key={`movie-${item.tmdb_id}`}
                    movie={item}
                    mediaType="movie"
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            </div>
          )}

          {tvShows.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold text-white mb-6">
                TV Shows ({tvShows.length})
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-6 [&>*]:w-full [&_img]:w-full [&_img]:aspect-[2/3] [&_img]:h-auto">
                {tvShows.map((item) => (
                  <MovieCard
                    key={`tv-${item.tmdb_id}`}
                    movie={item}
                    mediaType="tv"
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MyListPage;
