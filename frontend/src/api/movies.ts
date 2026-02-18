import type { Movie } from "../types/Movie";

export async function fetchMovies(
  page = 1,
  limit = 10,
  sort = "rating",
  genre?: string,
): Promise<{ results: Movie[]; total: number }> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sort,
  });

  if (genre) params.append("genre", genre);

  const res = await fetch(`/api/movies?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch movies");
  return res.json();
}

export async function fetchGenres(): Promise<string[]> {
  const res = await fetch("/api/genres");
  if (!res.ok) throw new Error("Failed to fetch genres");
  return res.json();
}
