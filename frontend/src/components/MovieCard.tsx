import { useNavigate } from "react-router-dom";
import type { Movie } from "../types/Movie";

type Props = {
  movie: Movie;
  didDrag: React.MutableRefObject<boolean>;
  variant?: "default" | "compact" | "recommendation";
  onRemove?: (tmdb_id: number) => void;
  mediaType: "movie" | "tv";
};

const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

function MovieCard({
  movie,
  didDrag,
  variant = "default",
  onRemove,
  mediaType,
}: Props) {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    if (didDrag.current) {
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
    onRemove?.(movie.tmdb_id);
  };

  const posterUrl = movie.poster_path
    ? `${IMAGE_BASE_URL}${movie.poster_path}`
    : "/placeholder-poster.png";

  const sizeClasses = {
    default:
      "h-[200px] w-[130px] sm:h-[225px] sm:w-[150px] lg:h-[315px] lg:w-[230px]",

    compact: "h-[200px] w-[130px] lg:h-[240px] lg:w-[160px]",

    recommendation: "h-[195px] w-[130px] lg:h-[300px] lg:w-[200px]",
  };

  const containerWidth =
    variant === "recommendation"
      ? "min-w-[130px] lg:min-w-[195px]"
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
            absolute top-2 right-2
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
        className={`
          rounded-md object-cover
          transition-transform duration-300 hover:scale-105
          ${sizeClasses[variant]}
        `}
      />
    </div>
  );
}

export default MovieCard;
