import { useEffect, useState } from "react";

type Movie = {
  id: number;
  title: string;
  year: number;
  rating: number;
};

function App() {
  const [movies, setMovies] = useState<Movie[]>([]);

  useEffect(() => {
    fetch("http://127.0.0.1:5000/api/movies")
      .then((res) => res.json() as Promise<Movie[]>)
      .then((data) => setMovies(data));
  }, []);

  return (
    <div
      style={{
        padding: "20px",
        color: "white",
        background: "#111",
        minHeight: "100vh",
      }}
    >
      <h1>Movies</h1>
      <ul>
        {movies.map((movie) => (
          <li key={movie.id}>
            {movie.title} ({movie.year}) ⭐ {movie.rating}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
