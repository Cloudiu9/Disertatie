import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { fetchExplanation } from "../api/explanations";

type CardItem = {
  tmdb_id: number;
  title: string;
  poster_path?: string;
};

type Props = {
  movie: CardItem;
  didDrag?: React.RefObject<boolean>;
  variant?: "default" | "compact" | "recommendation" | "list";
  onRemove?: (
    tmdbId: number,
    mediaType: "movie" | "tv",
    section?: "watched" | "watchlist",
  ) => void;
  mediaType: "movie" | "tv";
  section?: "watched" | "watchlist";
  interaction?: "seen" | "like" | "love";
  showExplanation?: boolean; // only true when rendered inside a recommendations row
  sourceTmdbId?: number;
  sourceMediaType?: "movie" | "tv";
};

const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

function MovieCard({
  movie,
  didDrag,
  variant = "default",
  onRemove,
  mediaType,
  section,
  interaction,
  showExplanation = false,
  sourceTmdbId,
  sourceMediaType,
}: Props) {
  const navigate = useNavigate();

  const [explanation, setExplanation] = useState<string | null>(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (didDrag?.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const path =
      mediaType === "tv" ? `/tv/${movie.tmdb_id}` : `/movies/${movie.tmdb_id}`;
    navigate(path);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.(movie.tmdb_id, mediaType, section);
  };

  // AI Explanation
  const handleWhyClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (explanation || loadingExplanation) return;
    setLoadingExplanation(true);
    try {
      const text = await fetchExplanation(
        movie.tmdb_id,
        mediaType,
        sourceTmdbId, // undefined on recommendation rows → user-based
        sourceMediaType, // undefined on recommendation rows → user-based
      );
      setExplanation(text);
    } catch {
      setExplanation("Recommended based on your taste profile.");
    } finally {
      setLoadingExplanation(false);
    }
  };

  const posterUrl = movie.poster_path
    ? `${IMAGE_BASE_URL}${movie.poster_path}`
    : "/placeholder-poster.png";

  const ringClass =
    interaction === "seen"
      ? "ring-4 ring-blue-400"
      : interaction === "like"
        ? "ring-4 ring-yellow-400"
        : interaction === "love"
          ? "ring-4 ring-red-500"
          : "";

  const sizeClasses = {
    default:
      "h-[200px] w-[130px] sm:h-[225px] sm:w-[150px] lg:h-[315px] lg:w-[230px]",
    compact: "h-[200px] w-[130px] lg:h-[240px] lg:w-[160px]",
    recommendation: "h-[195px] w-[130px] lg:h-[300px] lg:w-[200px]",
    list: "w-full aspect-[2/3]",
  };

  const containerWidth =
    variant === "list"
      ? "w-full"
      : variant === "recommendation"
        ? "min-w-[120px] lg:min-w-[172px]"
        : variant === "compact"
          ? "min-w-[130px] lg:min-w-[160px]"
          : "min-w-[130px] sm:min-w-[150px] lg:min-w-[230px]";

  return (
    <div
      onClick={handleClick}
      draggable={false}
      className={`group relative cursor-pointer select-none ${containerWidth}`}
    >
      {/* Remove button */}
      {onRemove && (
        <button
          onClick={handleRemove}
          className="
            absolute top-1 right-3
            bg-black/70 hover:bg-black
            text-white rounded-full
            w-7 h-7 text-sm
            flex items-center justify-center
            z-10
          "
        >
          ×
        </button>
      )}

      {/* Poster */}
      <img
        src={posterUrl}
        alt={movie.title}
        draggable={false}
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = "/placeholder-poster.png";
        }}
        className={`
          rounded-md object-cover
          transition-transform duration-300 hover:scale-105
          ${ringClass}
          ${sizeClasses[variant]}
        `}
      />

      {/* Why? overlay — only on recommendation cards */}
      {showExplanation && variant === "recommendation" && (
        <div
          className="
            absolute bottom-0 left-0 right-0
            rounded-b-md
            bg-linear-to-t from-black/90 via-black/60 to-transparent
            px-2 py-2
            flex flex-col items-center justify-end
            opacity-0 group-hover:opacity-100
            transition-opacity duration-200
            pointer-events-none group-hover:pointer-events-auto
          "
          style={{ minHeight: "40%" }}
        >
          {explanation ? (
            // Explanation text — shown after fetch
            <p className="text-white text-[10px] lg:text-xs leading-snug text-center">
              {explanation}
            </p>
          ) : (
            // Why? button — shown before fetch
            <button
              onClick={handleWhyClick}
              disabled={loadingExplanation}
              className="
                mt-auto
                bg-white/15 hover:bg-white/25
                text-white text-[10px] lg:text-xs font-medium
                px-2 py-1 rounded-full
                border border-white/30
                transition-colors duration-150
                disabled:opacity-50 disabled:cursor-not-allowed
                whitespace-nowrap
              "
            >
              {loadingExplanation ? "Thinking…" : "✦ Why this?"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default MovieCard;
