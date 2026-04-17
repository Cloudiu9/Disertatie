import { useNavigate } from "react-router-dom";
// import type { Movie } from "../types/Movie";

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
}: Props) {
  const navigate = useNavigate();

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

  // For scroll carousels (compact/recommendation), keep fixed sizing
  // so they don't collapse inside a non-grid flex container.
  // For "default" (used in grids), go fully fluid.
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
      className={`relative cursor-pointer select-none ${containerWidth}`}
    >
      {onRemove && (
        <button
          onClick={handleRemove}
          className="
            absolute top-1 right-3
            bg-black/70 hover:bg-black
            text-white
            rounded-full
            w-7 h-7
            text-sm
            flex items-center justify-center
            z-10
          "
        >
          ×
        </button>
      )}
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
    </div>
  );
}

export default MovieCard;
