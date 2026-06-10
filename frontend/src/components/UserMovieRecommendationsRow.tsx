import { useEffect, useState } from "react";
import { fetchMovieRecommendations } from "../api/user_recommendations";
import type { Movie } from "../types/Movie";
import MovieCard from "./MovieCard";
import { useDragScroll } from "../hooks/useDragScroll";

// Fisher-Yates shuffle — returns a new shuffled array, never mutates the original
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function UserMovieRecommendationsRow() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  const drag = useDragScroll();

  useEffect(() => {
    fetchMovieRecommendations().then((data) => {
      setMovies(shuffle(data));
      setLoading(false);
    });
  }, []);

  if (!loading && movies.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="px-6 text-lg font-semibold text-white">
        Recommended Movies For You
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
          : movies.map((movie) => (
              <MovieCard
                key={movie.tmdb_id}
                movie={movie}
                didDrag={drag.didDrag}
                mediaType="movie"
                variant="recommendation"
                showExplanation={true}
              />
            ))}
      </div>
    </section>
  );
}
