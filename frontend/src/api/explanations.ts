// AFTER
export async function fetchExplanation(
  tmdbId: number,
  mediaType: "movie" | "tv",
  sourceTmdbId?: number,
  sourceMediaType?: "movie" | "tv",
): Promise<string> {
  let url = `/api/explain?tmdb_id=${tmdbId}&media_type=${mediaType}`;
  if (sourceTmdbId && sourceMediaType) {
    url += `&source_tmdb_id=${sourceTmdbId}&source_media_type=${sourceMediaType}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch explanation");
  const data = await res.json();
  return data.explanation as string;
}
