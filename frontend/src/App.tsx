import { useEffect, useState } from "react";
import { fetchMovies } from "./api/movies";
import type { Movie } from "./types/Movie";

function App() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("rating");

  useEffect(() => {
    fetchMovies(page, 10, sort).then((data) => setMovies(data.results));
  }, [page, sort]);

  return (
    <div style={{ padding: 20 }}>
      <h1>Movies</h1>

      <select
        style={{ backgroundColor: "red" }}
        value={sort}
        onChange={(e) => setSort(e.target.value)}
      >
        <option value="rating">Rating</option>
        <option value="popularity">Popularity</option>
        <option value="year">Year</option>
      </select>

      <ul>
        {movies.map((movie) => (
          <li key={movie.tmdb_id}>
            {movie.title} ({movie.year}) ⭐ {movie.rating}
          </li>
        ))}
      </ul>

      <button onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
      <button onClick={() => setPage((p) => p + 1)}>Next</button>
    </div>
  );
}

export default App;
