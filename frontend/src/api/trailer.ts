export async function fetchTrailer(
  tmdb_id: number,
  mediaType: "movie" | "tv" = "movie",
) {
  const base =
    mediaType === "tv"
      ? `/api/tv/${tmdb_id}/trailer`
      : `/api/movies/${tmdb_id}/trailer`;

  const res = await fetch(base);

  if (!res.ok) {
    throw new Error("Trailer fetch failed");
  }

  return res.json();
}
