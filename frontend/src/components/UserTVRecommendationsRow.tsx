import { useEffect, useState } from "react";
import { fetchTVRecommendations } from "../api/user_recommendations";
import MovieCard from "./MovieCard";
import { useDragScroll } from "../hooks/useDragScroll";
import type { TVShow } from "../types/TVShow";

// Fisher-Yates shuffle — returns a new shuffled array, never mutates the original
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function UserTVRecommendationsRow() {
  const [shows, setShows] = useState<TVShow[]>([]);
  const [loading, setLoading] = useState(true);
  const drag = useDragScroll();

  useEffect(() => {
    fetchTVRecommendations().then((data) => {
      setShows(shuffle(data));
      setLoading(false);
    });
  }, []);

  if (!loading && shows.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="px-6 text-lg font-semibold text-white">
        Recommended TV Shows For You
      </h2>
      <div
        ref={drag.ref as React.RefObject<HTMLDivElement>}
        // eslint-disable-next-line react-hooks/refs
        {...drag.handlers}
        className="
          flex gap-4 px-6
          overflow-x-auto overflow-y-hidden
          scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent
          cursor-grab active:cursor-grabbing
        "
      >
        {loading
          ? Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="h-56.25 w-37.5 rounded bg-gray-800 animate-pulse shrink-0"
              />
            ))
          : shows.map((show) => (
              <MovieCard
                key={show.tmdb_id}
                movie={show}
                didDrag={drag.didDrag}
                mediaType="tv"
                variant="recommendation"
                showExplanation={true}
              />
            ))}
      </div>
    </section>
  );
}
