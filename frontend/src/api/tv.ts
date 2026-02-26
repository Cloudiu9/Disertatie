import type { Movie } from "../types/Movie";

export async function fetchTV(
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

  const res = await fetch(`/api/tv?${params.toString()}`);

  if (!res.ok) throw new Error("Failed to fetch tv");

  return res.json();
}

export async function fetchTVGenres(): Promise<string[]> {
  const res = await fetch("/api/tv/genres");

  if (!res.ok) throw new Error("Failed genres");

  return res.json();
}
