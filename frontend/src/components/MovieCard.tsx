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
      className={`${small ? "min-w-[110px]" : "min-w-[230px]"} cursor-pointer select-none`}
    >
      <img
        src={posterUrl}
        alt={movie.title}
        draggable={false}
        className={`${
          small
            ? "h-[315px] w-[230px] min-h-[160px] min-w-[110px]"
            : "h-[315px] w-[230px] min-h-[315px] min-w-[230px]"
        } rounded-md object-cover transition-transform duration-300 hover:scale-105`}
      />
    </div>
  );
}

export default MovieCard;
