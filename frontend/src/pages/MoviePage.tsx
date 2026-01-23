import { useEffect, useState } from "react";
import { fetchMovies, searchMovies } from "../api/movies";
import type { Movie } from "../types/Movie";
import { Link } from "react-router-dom";

function MoviesPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("rating");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Movie[]>([]);

  // Fetching
  useEffect(() => {
    if (searchQuery) return;
    fetchMovies(page, 10, sort).then((data) => setMovies(data.results));
  }, [page, sort, searchQuery]);

  // Searching
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }

    const t = setTimeout(() => {
      searchMovies(searchQuery).then(setSearchResults);
    }, 300);

    return () => clearTimeout(t);
  }, [searchQuery]);

  const displayedMovies = searchQuery ? searchResults : movies;

  // Highlight + Debounce
  function highlight(text: string, query: string) {
    if (!query) return text;

    const regex = new RegExp(`(${query})`, "ig");

    return text.split(regex).map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <span
          key={i}
          style={{
            backgroundColor: "#ffe066",
            color: "#000",
            padding: "0 2px",
            borderRadius: 3,
          }}
        >
          {part}
        </span>
      ) : (
        part
      ),
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Movies</h1>

      <input
        placeholder="Search..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value.trimStart())}
      />

      <select
        value={sort}
        onChange={(e) => setSort(e.target.value)}
        disabled={!!searchQuery}
      >
        <option value="rating">Rating</option>
        <option value="popularity">Popularity</option>
        <option value="year">Year</option>
      </select>

      <ul>
        {displayedMovies.map((movie) => (
          <li key={movie.tmdb_id}>
            <Link to={`/movies/${movie.tmdb_id}`}>
              {highlight(movie.title, searchQuery)} ({movie.year}) ⭐{" "}
              {movie.rating}
            </Link>
          </li>
        ))}
      </ul>

      {!searchQuery && (
        <>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Prev
          </button>
          <button onClick={() => setPage((p) => p + 1)}>Next</button>
        </>
      )}
    </div>
  );
}

export default MoviesPage;
