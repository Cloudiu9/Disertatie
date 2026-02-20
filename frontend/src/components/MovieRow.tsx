import { useEffect, useState } from "react";
import type { Movie } from "../types/Movie";
import { fetchMovies } from "../api/movies";
import MovieCard from "./MovieCard";
import { useDragScroll } from "../hooks/useDragScroll";

type Props = {
  title: string;
  sort?: string;
  genre?: string;
  movies?: Movie[];
  disableFetch?: boolean;
  small?: boolean;
};

function MovieRow({
  title,
  sort,
  genre,
  movies: injectedMovies,
  disableFetch,
  small,
}: Props) {
  const [movies, setMovies] = useState<Movie[]>(injectedMovies ?? []);
  const [loading, setLoading] = useState(!injectedMovies);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const drag = useDragScroll();

  useEffect(() => {
    if (disableFetch) return;

    setLoading(true);
    setPage(1);

    fetchMovies(1, 20, sort, genre).then((data) => {
      setMovies(data.results);
      setHasMore(data.results.length === 20);
      setLoading(false);
    });
  }, [sort, genre, disableFetch]);

  function loadMore() {
    const nextPage = page + 1;
    setLoading(true);

    fetchMovies(nextPage, 20, sort, genre).then((data) => {
      setMovies((prev) => [...prev, ...data.results]);
      setHasMore(data.results.length === 20);
      setPage(nextPage);
      setLoading(false);
    });
  }

  function MovieSkeleton() {
    return (
      <div
        className={`${
          small
            ? "h-[140px] w-[95px] sm:h-[160px] sm:w-[110px]"
            : "h-[200px] w-[130px] sm:h-[225px] sm:w-[150px]"
        } rounded bg-gray-800 animate-pulse`}
      />
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="px-6 text-base sm:text-lg font-semibold text-white">
        {title}
      </h2>

      <div
        ref={drag.ref}
        {...drag.handlers}
        className="
          flex gap-3 sm:gap-4 px-4 sm:px-6
          overflow-x-auto overflow-y-hidden
          scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent
          cursor-grab active:cursor-grabbing
        "
      >
        {loading && movies.length === 0
          ? Array.from({ length: 10 }).map((_, i) => <MovieSkeleton key={i} />)
          : movies.map((movie) => (
              <MovieCard
                key={movie.tmdb_id}
                movie={movie}
                didDrag={drag.didDrag}
                small={small}
              />
            ))}
      </div>

      {hasMore && !disableFetch && (
        <div className="flex justify-center">
          <button
            onClick={loadMore}
            className="mt-2 px-5 py-2 bg-gray-800 hover:bg-gray-700 text-sm text-white rounded transition"
          >
            {loading ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </section>
  );
}

export default MovieRow;
