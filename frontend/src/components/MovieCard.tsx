import { useNavigate } from "react-router-dom";
import type { Movie } from "../types/Movie";

type Props = {
  movie: Movie;
  didDrag: React.MutableRefObject<boolean>;
};

const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

function MovieCard({ movie, didDrag }: Props) {
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
      className="min-w-[185px] cursor-pointer select-none"
    >
      <img
        src={posterUrl}
        alt={movie.title}
        draggable={false}
        className="h-[300px] w-[300px] rounded-md object-cover transition-transform duration-300 hover:scale-105"
      />
    </div>
  );
}

export default MovieCard;
