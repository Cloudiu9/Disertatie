import { useEffect, useRef, useState } from "react";
import type { Movie } from "../types/Movie";
import { fetchMovies } from "../api/movies";
import { fetchTV } from "../api/tv";
import MovieCard from "./MovieCard";
import { useDragScroll } from "../hooks/useDragScroll";

type Props = {
  title: string;
  sort?: string;
  genre?: string;
  mediaType?: "movie" | "tv";
  movies?: Movie[];
  disableFetch?: boolean;
  variant?: "default" | "compact" | "recommendation";
  onRemove?: (tmdb_id: number) => void;
};

function MovieRow({
  title,
  sort,
  genre,
  mediaType = "movie",
  movies: injectedMovies,
  disableFetch,
  variant,
  onRemove,
}: Props) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(!injectedMovies);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const drag = useDragScroll();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  function fetchPage(p: number) {
    if (mediaType === "tv") {
      return fetchTV(p, 20, sort, genre);
    }

    return fetchMovies(p, 20, sort, genre);
  }

  useEffect(() => {
    if (disableFetch) return;

    setLoading(true);
    setPage(1);

    fetchPage(1).then((data) => {
      setMovies(data.results);
      setHasMore(data.results.length === 20);
      setLoading(false);
    });
  }, [sort, genre, disableFetch, mediaType]);

  useEffect(() => {
    if (!hasMore || disableFetch) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          const nextPage = page + 1;

          setLoading(true);

          fetchPage(nextPage).then((data) => {
            setMovies((prev) => [...prev, ...data.results]);
            setHasMore(data.results.length === 20);
            setPage(nextPage);
            setLoading(false);
          });
        }
      },
      {
        root: drag.ref.current,
        threshold: 0.5,
      },
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [page, hasMore, loading, sort, genre, disableFetch, mediaType]);

  useEffect(() => {
    if (injectedMovies) {
      setMovies(injectedMovies);
    }
  }, [injectedMovies]);

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
        {movies.map((movie) => (
          <MovieCard
            key={movie.tmdb_id}
            movie={movie}
            mediaType={mediaType}
            didDrag={drag.didDrag}
            variant={variant}
            onRemove={onRemove}
          />
        ))}

        {hasMore && <div ref={sentinelRef} className="w-10" />}
      </div>
    </section>
  );
}

export default MovieRow;
