export async function fetchMovieRecommendations() {
  const res = await fetch("/api/user_recommendations/movies", {
    credentials: "include",
  });

  if (!res.ok) return [];

  return res.json();
}

export async function fetchTVRecommendations() {
  const res = await fetch("/api/user_recommendations/tv", {
    credentials: "include",
  });

  if (!res.ok) return [];

  return res.json();
}
