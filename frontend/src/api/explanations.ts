export async function fetchExplanation(
  tmdbId: number,
  mediaType: "movie" | "tv",
): Promise<string> {
  const res = await fetch(
    `/api/explain?tmdb_id=${tmdbId}&media_type=${mediaType}`,
  );
  if (!res.ok) throw new Error("Failed to fetch explanation");
  const data = await res.json();
  return data.explanation as string;
}
