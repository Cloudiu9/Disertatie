import { useEffect, useState } from "react";
import { fetchMovies, searchMovies } from "./api/movies";
import type { Movie } from "./types/Movie";

function App() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("rating");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Movie[]>([]);

  // Fetch paginated movies
  useEffect(() => {
    if (searchQuery) return;

    fetchMovies(page, 10, sort).then((data) => setMovies(data.results));
  }, [page, sort, searchQuery]);

  // Search movies (debounced)
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(() => {
      searchMovies(searchQuery).then(setSearchResults);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const displayedMovies = searchQuery ? searchResults : movies;

  return (
    <div style={{ padding: 20 }}>
      <h1>Movies</h1>

      <input
        type="text"
        placeholder="Search movies..."
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setPage(1);
        }}
        style={{ marginBottom: 10, display: "block" }}
      />

      <select
        value={sort}
        onChange={(e) => setSort(e.target.value)}
        disabled={!!searchQuery}
        style={{ marginBottom: 10 }}
      >
        <option value="rating">Rating</option>
        <option value="popularity">Popularity</option>
        <option value="year">Year</option>
      </select>

      <ul>
        {displayedMovies.map((movie) => (
          <li key={movie.tmdb_id}>
            {movie.title} ({movie.year}) ⭐ {movie.rating}
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

export default App;
