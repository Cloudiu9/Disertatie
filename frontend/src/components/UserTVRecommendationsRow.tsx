import { useEffect, useState } from "react";
import { fetchTVRecommendations } from "../api/user_recommendations";
import MovieCard from "./MovieCard";
import { useDragScroll } from "../hooks/useDragScroll";

export default function UserTVRecommendationsRow() {
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);

  const drag = useDragScroll();

  useEffect(() => {
    fetchTVRecommendations().then((data) => {
      setShows(data);
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
        ref={drag.ref}
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
                className="h-[225px] w-[150px] rounded bg-gray-800 animate-pulse flex-shrink-0"
              />
            ))
          : shows.map((show: any) => (
              <MovieCard
                key={show.tmdb_id}
                movie={show}
                didDrag={drag.didDrag}
                mediaType="tv"
              />
            ))}
      </div>
    </section>
  );
}
