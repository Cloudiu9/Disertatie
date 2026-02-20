import { useNavigate } from "react-router-dom";
import type { Movie } from "../types/Movie";

type Props = {
  movie: Movie;
  didDrag: React.MutableRefObject<boolean>;
  variant?: "default" | "compact" | "recommendation";
};

const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

function MovieCard({ movie, didDrag, variant = "default" }: Props) {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    if (didDrag.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    navigate(`/movies/${movie.tmdb_id}`);
  };

  const posterUrl = movie.poster_path
    ? `${IMAGE_BASE_URL}${movie.poster_path}`
    : "/placeholder-poster.png";

  const sizeClasses = {
    default:
      "h-[200px] w-[130px] sm:h-[225px] sm:w-[150px] lg:h-[315px] lg:w-[230px]",

    compact: "h-[200px] w-[130px] lg:h-[240px] lg:w-[160px]",

    recommendation:
      // Mobile = compact
      // Desktop = full recommendation
      "h-[195px] w-[130px] lg:h-[300px] lg:w-[200px]",
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
      className={`cursor-pointer select-none ${containerWidth}`}
    >
      <img
        src={posterUrl}
        alt={movie.title}
        draggable={false}
        className={`
          ${sizeClasses[variant]}
          rounded-md object-cover transition-transform duration-300 hover:scale-105
        `}
      />
    </div>
  );
}

export default MovieCard;
