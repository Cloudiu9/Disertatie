import { useEffect, useState } from "react";
import { fetchMovies, searchMovies } from "../api/movies";
import type { Movie } from "../types/Movie";
import { Link } from "react-router-dom";
import MovieRow from "../components/MovieRow";
import Hero from "../components/HeroBanner";

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
    <div className="space-y-12 pb-12">
      <Hero />

      <MovieRow title="Popular Now" sort="popularity" />
      <MovieRow title="Top Rated" sort="rating" />
      <MovieRow title="Newest Releases" sort="year" />
    </div>
  );
}

export default MoviesPage;
