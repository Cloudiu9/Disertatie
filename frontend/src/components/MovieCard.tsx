import { useNavigate } from "react-router-dom";
import type { Movie } from "../types/Movie";

type Props = {
  movie: Movie;
  didDrag: React.MutableRefObject<boolean>;
  small?: boolean;
};

const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

function MovieCard({ movie, didDrag, small }: Props) {
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

  return (
    <div
      onClick={handleClick}
      draggable={false}
      className={`
        cursor-pointer select-none
        ${
          small
            ? "min-w-[95px] sm:min-w-[110px] lg:min-w-[150px]"
            : "min-w-[130px] sm:min-w-[150px] lg:min-w-[230px]"
        }
      `}
    >
      <img
        src={posterUrl}
        alt={movie.title}
        draggable={false}
        className={`
          rounded-md object-cover transition-transform duration-300 hover:scale-105
          ${
            small
              ? "h-[140px] w-[95px] sm:h-[160px] sm:w-[110px] lg:h-[200px] lg:w-[150px]"
              : "h-[200px] w-[130px] sm:h-[225px] sm:w-[150px] lg:h-[315px] lg:w-[230px]"
          }
        `}
      />
    </div>
  );
}

export default MovieCard;
