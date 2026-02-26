import { useEffect, useRef, useState } from "react";
import {
  PlayIcon,
  InformationCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/solid";
import { useNavigate } from "react-router-dom";
import type { Movie } from "../types/Movie";
import type { TVShow } from "../types/TVShow";
import { fetchMovies } from "../api/movies";
import { fetchTV } from "../api/tv";
import MovieMeta from "./MovieMeta";
import TrailerModal from "./TrailerModal";
import { fetchTrailer } from "../api/trailer";
import { toast } from "react-hot-toast";

function shuffleArray<T>(array: T[]): T[] {
  return [...array].sort(() => Math.random() - 0.5);
}

type HeroBannerProps = {
  mediaType?: "movie" | "tv";
};

function HeroBanner({ mediaType = "movie" }: HeroBannerProps) {
  type HeroItem = (Movie | TVShow) & { mediaType: "movie" | "tv" };
  const [heroMovies, setHeroMovies] = useState<HeroItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [loadingTrailer, setLoadingTrailer] = useState(false);
  const [prefetchedTrailer, setPrefetchedTrailer] = useState<string | null>(
    null,
  );

  const intervalRef = useRef<number | null>(null);
  const navigate = useNavigate();
  const currentMovie = heroMovies[currentIndex];

  useEffect(() => {
    async function loadHero() {
      const data =
        mediaType === "tv"
          ? await fetchTV(1, 20, "popularity")
          : await fetchMovies(1, 20, "popularity");
      const tagged = data.results.map((m): HeroItem => ({ ...m, mediaType }));
      setHeroMovies(shuffleArray(tagged).slice(0, 5));
    }
    loadHero();
  }, [mediaType]);

  useEffect(() => {
    if (heroMovies.length === 0) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!isHovered) {
      intervalRef.current = window.setInterval(() => {
        setCurrentIndex((prev) =>
          prev === heroMovies.length - 1 ? 0 : prev + 1,
        );
      }, 5000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [heroMovies, isHovered]);

  // Prefetch trailer for current hero movie
  useEffect(() => {
    if (!currentMovie) return;
    setPrefetchedTrailer(null);
    fetchTrailer(currentMovie.tmdb_id)
      .then((d) => d.key && setPrefetchedTrailer(d.key))
      .catch(() => {});
  }, [currentMovie]);

  const playTrailer = async () => {
    if (!currentMovie) return;
    setLoadingTrailer(true);
    try {
      let key = prefetchedTrailer;
      if (!key) {
        const data = await fetchTrailer(currentMovie.tmdb_id);
        key = data.key;
      }
      if (!key) {
        toast.error("Trailer not available");
        return;
      }
      setTrailerKey(key);
      setTrailerOpen(true);
    } catch {
      toast.error("Trailer error");
    } finally {
      setLoadingTrailer(false);
    }
  };

  if (heroMovies.length === 0) return null;

  const next = () =>
    setCurrentIndex((prev) => (prev === heroMovies.length - 1 ? 0 : prev + 1));
  const prev = () =>
    setCurrentIndex((prev) => (prev === 0 ? heroMovies.length - 1 : prev - 1));
  const goTo = (index: number) => setCurrentIndex(index);

  return (
    <section
      className="relative w-full h-[75vh] mt-16 overflow-hidden text-white"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {heroMovies.map((movie, index) => {
        const isActive = index === currentIndex;
        return (
          <div
            key={movie.tmdb_id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${isActive ? "opacity-100 z-10" : "opacity-0 z-0"}`}
          >
            <img
              src={
                movie.backdrop_path
                  ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
                  : "https://via.placeholder.com/1920x1080?text=No+Image"
              }
              alt={movie.title}
              className={`absolute inset-0 h-full w-full object-cover transition-transform duration-[7000ms] ease-out ${isActive ? "scale-105" : "scale-100"}`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent" />

            <div className="relative z-20 flex h-full max-w-screen-2xl flex-col justify-center px-6 md:px-12">
              <h1
                className={`max-w-xl text-4xl font-extrabold md:text-6xl transition-all duration-700 ${isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
              >
                {movie.title}
              </h1>
              <div
                className={`mt-4 transition-all duration-700 delay-150 ${isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
              >
                <MovieMeta year={movie.year} rating={movie.rating} large />
              </div>
              <p
                className={`mt-4 max-w-xl text-sm leading-relaxed text-gray-200 md:text-base transition-all duration-700 delay-300 ${isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
              >
                {movie.overview}
              </p>
              <div
                className={`mt-6 flex gap-4 transition-all duration-700 delay-500 ${isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
              >
                <button
                  onClick={playTrailer}
                  className="flex items-center gap-2 rounded bg-white px-6 py-2 font-semibold text-black hover:bg-white/90 transition cursor-pointer"
                >
                  <PlayIcon className="h-5 w-5" />
                  {loadingTrailer ? "Loading" : "Play"}
                </button>
                <button
                  onClick={() =>
                    navigate(
                      movie.mediaType === "tv"
                        ? `/tv/${movie.tmdb_id}`
                        : `/movies/${movie.tmdb_id}`,
                    )
                  }
                  className="flex items-center gap-2 rounded bg-gray-500/70 px-6 py-2 font-semibold hover:bg-gray-500/50 transition cursor-pointer"
                >
                  <InformationCircleIcon className="h-5 w-5" />
                  More Info
                </button>
              </div>
            </div>
          </div>
        );
      })}

      <button
        onClick={prev}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-30 bg-black/50 hover:bg-black/70 p-3 rounded-full transition cursor-pointer"
      >
        <ChevronLeftIcon className="h-6 w-6 text-white" />
      </button>
      <button
        onClick={next}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-30 bg-black/50 hover:bg-black/70 p-3 rounded-full transition cursor-pointer"
      >
        <ChevronRightIcon className="h-6 w-6 text-white" />
      </button>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-30">
        {heroMovies.map((_, index) => (
          <button
            key={index}
            onClick={() => goTo(index)}
            className={`h-3 w-3 rounded-full transition-all cursor-pointer ${index === currentIndex ? "bg-white scale-110" : "bg-white/40 hover:bg-white/70"}`}
          />
        ))}
      </div>

      {trailerOpen && trailerKey && (
        <TrailerModal
          videoKey={trailerKey}
          onClose={() => setTrailerOpen(false)}
        />
      )}
    </section>
  );
}

export default HeroBanner;
