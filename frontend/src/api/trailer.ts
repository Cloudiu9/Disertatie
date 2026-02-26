export async function fetchTrailer(
  tmdb_id: number,
  type: "movies" | "tv" = "movies",
) {
  const res = await fetch(`/api/${type}/${tmdb_id}/trailer`);

  if (!res.ok) {
    throw new Error("Trailer fetch failed");
  }

  return res.json();
}
