import type { Movie } from "../types/Movie";
import type { TVShow } from "../types/TVShow";

export type MyListItem = Movie | TVShow;

export async function fetchMyList(): Promise<MyListItem[]> {
  const res = await fetch("/api/my-list", {
    credentials: "include",
  });

  if (!res.ok) throw new Error("Unauthorized");

  return res.json();
}

export async function addToMyList(tmdb_id: number, mediaType: "movie" | "tv") {
  const res = await fetch("/api/my-list", {
    method: "POST",

    credentials: "include",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      tmdb_id,
      media_type: mediaType,
    }),
  });

  if (!res.ok) throw new Error("Add failed");
}

export async function removeFromMyList(
  tmdb_id: number,
  mediaType: "movie" | "tv",
  section: "watched" | "watchlist" = "watchlist",
) {
  const res = await fetch(
    `/api/my-list/${tmdb_id}/${mediaType}?section=${section}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );

  if (!res.ok) throw new Error("Remove failed");
}
