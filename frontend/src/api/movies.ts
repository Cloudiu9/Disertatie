import type { Movie } from "../types/Movie";

const API_URL = "http://127.0.0.1:5000/api";

export async function fetchMovies(
  page = 1,
  limit = 10,
  sort = "rating",
): Promise<{
  results: Movie[];
  total: number;
}> {
  const res = await fetch(
    `${API_URL}/movies?page=${page}&limit=${limit}&sort=${sort}`,
  );

  if (!res.ok) {
    throw new Error("Failed to fetch movies");
  }

  return res.json();
}

export async function searchMovies(query: string): Promise<Movie[]> {
  if (!query) return [];

  const res = await fetch(
    `${API_URL}/movies/search?q=${encodeURIComponent(query)}`,
  );

  if (!res.ok) {
    throw new Error("Search failed");
  }

  return res.json();
}
