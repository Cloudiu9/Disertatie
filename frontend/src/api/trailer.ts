export async function fetchTrailer(tmdb_id: number) {
  const res = await fetch(`/api/movies/${tmdb_id}/trailer`);

  if (!res.ok) {
    throw new Error("Trailer fetch failed");
  }

  return res.json();
}
