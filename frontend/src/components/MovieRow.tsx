import { useEffect, useState } from "react";
import type { Movie } from "../types/Movie";
import { fetchMovies } from "../api/movies";
import MovieCard from "./MovieCard";
import { useDragScroll } from "../hooks/useDragScroll";

type Props = {
  title: string;
  sort: "rating" | "popularity" | "year";
};

function MovieRow({ title, sort }: Props) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const drag = useDragScroll();

  useEffect(() => {
    setLoading(true);

    fetchMovies(1, 20, sort).then((data) => {
      setMovies(data.results);
      setLoading(false);
    });
  }, [sort]);

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
