export async function fetchRecommendations() {
  const res = await fetch("/api/user_recommendations", {
    credentials: "include",
  });

  if (!res.ok) return [];

  return res.json();
}
