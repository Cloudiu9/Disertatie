import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  sendChatMessage,
  type ChatMessage,
  type ChatResult,
} from "../api/chat";

const IMAGE_BASE = "https://image.tmdb.org/t/p/w200";

// Mini card rendered inside the chat — simpler than MovieCard,
// no drag logic needed here
function MiniCard({ item }: { item: ChatResult }) {
  const navigate = useNavigate();
  const poster = item.poster_path
    ? `${IMAGE_BASE}${item.poster_path}`
    : "/placeholder-poster.png";

  return (
    <div
      onClick={() =>
        navigate(
          item.media_type === "tv"
            ? `/tv/${item.tmdb_id}`
            : `/movies/${item.tmdb_id}`,
        )
      }
      className="shrink-0 w-22.5 cursor-pointer group"
    >
      <img
        src={poster}
        alt={item.title}
        className="w-22.5 h-33.75 object-cover rounded-md
                   group-hover:scale-105 transition-transform duration-200"
        onError={(e) => {
          e.currentTarget.src = "/placeholder-poster.png";
        }}
      />
      <p className="text-white text-[10px] mt-1 line-clamp-2 leading-tight">
        {item.title}
      </p>
    </div>
  );
}

type Turn = {
  role: "user" | "assistant";
  content: string;
  results?: ChatResult[];
};

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom whenever a new turn arrives
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, loading]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const historyForApi = (): ChatMessage[] =>
    turns.map((t) => ({ role: t.role, content: t.content }));

  const handleSend = async () => {
    const message = input.trim();
    if (!message || loading) return;

    const userTurn: Turn = { role: "user", content: message };
    setTurns((prev) => [...prev, userTurn]);
    setInput("");
    setLoading(true);

    try {
      const data = await sendChatMessage(message, historyForApi());
      const assistantTurn: Turn = {
        role: "assistant",
        content: data.reply,
        results: data.results,
      };
      setTurns((prev) => [...prev, assistantTurn]);
    } catch {
      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong — please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open recommendation chat"
        className="
          fixed bottom-6 right-6 z-50
          w-14 h-14 rounded-full
          bg-indigo-600 hover:bg-indigo-500
          text-white text-2xl
          flex items-center justify-center
          shadow-lg transition-colors duration-200
        "
      >
        {open ? "✕" : "✦"}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="
            fixed bottom-24 right-6 z-50
            w-90 max-w-[calc(100vw-24px)]
            h-130 max-h-[70vh]
            bg-gray-900 border border-gray-700
            rounded-2xl shadow-2xl
            flex flex-col overflow-hidden
          "
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2">
            <span className="text-indigo-400 text-lg">✦</span>
            <span className="text-white font-semibold text-sm">
              What do you want to watch?
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            {/* Greeting shown before any messages */}
            {turns.length === 0 && (
              <div className="text-center text-gray-400 text-sm mt-8 space-y-2">
                <p className="text-2xl">🎬</p>
                <p>Describe a mood, genre, or a title you loved.</p>
                <p className="text-xs text-gray-500">
                  Try: "something tense like Parasite" or "a short comfort show"
                </p>
              </div>
            )}

            {turns.map((turn, i) => (
              <div key={i} className="space-y-2">
                {/* Bubble */}
                <div
                  className={`flex ${
                    turn.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <p
                    className={`
                      max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-snug
                      ${
                        turn.role === "user"
                          ? "bg-indigo-600 text-white rounded-br-sm"
                          : "bg-gray-800 text-gray-100 rounded-bl-sm"
                      }
                    `}
                  >
                    {turn.content}
                  </p>
                </div>

                {/* Inline movie cards */}
                {turn.results && turn.results.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin cursor-grab active:cursor-grabbing scrollbar-thumb-gray-700">
                    {turn.results.map((item) => (
                      <MiniCard
                        key={`${item.media_type}-${item.tmdb_id}`}
                        item={item}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-2">
                  <span className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div className="px-3 py-3 border-t border-gray-700 flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
              placeholder="e.g. something like Inception..."
              className="
                flex-1 bg-gray-800 text-white text-sm
                rounded-xl px-3 py-2
                border border-gray-600 focus:border-indigo-500
                outline-none placeholder-gray-500
                disabled:opacity-50
              "
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="
                bg-indigo-600 hover:bg-indigo-500
                disabled:opacity-40 disabled:cursor-not-allowed
                text-white rounded-xl px-3 py-2 text-sm font-medium
                transition-colors duration-150 whitespace-nowrap
              "
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
