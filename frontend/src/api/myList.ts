import type { Movie } from "../types/Movie";

const API_BASE = "http://127.0.0.1:5000/api";

export async function fetchMyList(): Promise<Movie[]> {
  const res = await fetch(`${API_BASE}/my-list`, {
    credentials: "include",
  });

  if (!res.ok) throw new Error("Unauthorized");
  return res.json();
}

export async function addToMyList(tmdb_id: number) {
  const res = await fetch(`${API_BASE}/my-list`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tmdb_id }),
  });

  if (!res.ok) throw new Error("Add failed");
}

export async function removeFromMyList(tmdb_id: number) {
  const res = await fetch(`${API_BASE}/my-list/${tmdb_id}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!res.ok) throw new Error("Remove failed");
}
