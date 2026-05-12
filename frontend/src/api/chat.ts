export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatResult = {
  tmdb_id: number;
  title: string;
  poster_path?: string;
  media_type: "movie" | "tv";
  rating?: number;
};

export type ChatResponse = {
  reply: string;
  results: ChatResult[];
};

export async function sendChatMessage(
  message: string,
  history: ChatMessage[],
): Promise<ChatResponse> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) throw new Error("Chat request failed");
  return res.json();
}
