import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import type { Movie } from "../types/Movie";

function MovieDetailsPage() {
  const { id } = useParams();
  const [movie, setMovie] = useState<Movie | null>(null);

  const POSTER_BASE = "https://image.tmdb.org/t/p/w500";

  useEffect(() => {
    fetch(`http://127.0.0.1:5000/api/movies/${id}`)
      .then((res) => res.json())
      .then(setMovie);
  }, [id]);

  if (!movie) return <p>Loading...</p>;

  return (
    <div style={{ padding: 20 }}>
      <Link to="/">← Back</Link>

      <h1>{movie.title}</h1>

      {movie.poster_path && (
        <img
          src={`${POSTER_BASE}${movie.poster_path}`}
          alt={movie.title}
          style={{ width: 300, borderRadius: 8, marginBottom: 20 }}
        />
      )}

      <p>{movie.overview}</p>

      <p>Year: {movie.year}</p>
      <p>Runtime: {movie.runtime} min</p>
      <p>Rating: ⭐ {movie.rating}</p>
      <p>Votes: {movie.votes}</p>
      <p>Popularity: {movie.popularity}</p>
      <p>Genres: {movie.genres.join(", ")}</p>
    </div>
  );
}

export default MovieDetailsPage;
