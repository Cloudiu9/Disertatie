import { useEffect, useState } from "react";
import type { Movie } from "../types/Movie";
import { fetchMovies } from "../api/movies";
import MovieCard from "./MovieCard";
import { useDragScroll } from "../hooks/useDragScroll";

type Props = {
  title: string;
  sort: string;
};

function MovieRow({ title, sort }: Props) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const drag = useDragScroll();

  useEffect(() => {
    fetchMovies(1, 20, sort).then((data) => {
      setMovies(data.results);
    });
  }, [sort]);

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
        {movies.map((movie) => (
          <MovieCard key={movie.tmdb_id} movie={movie} didDrag={drag.didDrag} />
        ))}
      </div>
    </section>
  );
}

export default MovieRow;
