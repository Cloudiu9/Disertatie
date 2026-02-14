import { useEffect, useState } from "react";
import { fetchRecommendations } from "../api/user_recommendations";
import type { Movie } from "../types/Movie";
import MovieCard from "./MovieCard";
import { useDragScroll } from "../hooks/useDragScroll";

export default function UserRecommendationsRow() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const drag = useDragScroll();

  useEffect(() => {
    fetchRecommendations().then((data) => {
      setMovies(data);
      setLoading(false);
    });
  }, []);

  if (!loading && movies.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="px-6 text-lg font-semibold text-white">
        Recommended For You
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
          : movies.map((movie) => (
              <MovieCard
                key={movie.tmdb_id}
                movie={movie}
                didDrag={drag.didDrag}
              />
            ))}
      </div>
    </section>
  );
}
