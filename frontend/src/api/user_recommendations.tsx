export async function fetchMovieRecommendations(limit = 24) {
  const res = await fetch(`/api/user_recommendations/movies?limit=${limit}`, {
    credentials: "include",
  });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchTVRecommendations(limit = 24) {
  const res = await fetch(`/api/user_recommendations/tv?limit=${limit}`, {
    credentials: "include",
  });
  if (!res.ok) return [];
  return res.json();
}
