import { useEffect, useState } from "react";
import type { Movie } from "../types/Movie";
import { fetchMovies } from "../api/movies";
import MovieCard from "./MovieCard";
import { useDragScroll } from "../hooks/useDragScroll";

type Props = {
  title: string;
  sort?: string;
  movies?: Movie[];
  disableFetch?: boolean;
};

function MovieRow({
  title,
  sort,
  movies: injectedMovies,
  disableFetch,
}: Props) {
  const [movies, setMovies] = useState<Movie[]>(injectedMovies ?? []);
  const [loading, setLoading] = useState(!injectedMovies);

  const drag = useDragScroll();

  useEffect(() => {
    if (disableFetch) return;

    setLoading(true);

    fetchMovies(1, 20, sort).then((data) => {
      setMovies(data.results);
      setLoading(false);
    });
  }, [sort, disableFetch]);

  function MovieSkeleton() {
    return (
      <div className="h-[225px] w-[150px] rounded bg-gray-800 animate-pulse" />
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="px-6 text-lg font-semibold text-white">{title}</h2>

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
          ? Array.from({ length: 10 }).map((_, i) => <MovieSkeleton key={i} />)
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

export default MovieRow;
