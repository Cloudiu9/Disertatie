import { useEffect, useState } from "react";
import { fetchGenres } from "../api/movies";
import MovieRow from "../components/MovieRow";
import Hero from "../components/HeroBanner";
import UserMovieRecommendationsRow from "../components/UserMovieRecommendationsRow";
import { SkeletonHero, SkeletonRow } from "../components/Skeletons";

function MoviesPage() {
  const [genres, setGenres] = useState<string[]>([]);
  const [loadingGenres, setLoadingGenres] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [skeletonFading, setSkeletonFading] = useState(false); // NEW

  useEffect(() => {
    fetchGenres()
      .then(setGenres)
      .finally(() => {
        setSkeletonFading(true); // 1. start fade-out
        setTimeout(() => setLoadingGenres(false), 400); // 2. unmount after transition
      });
  }, []);

  return (
    <div className="space-y-12 pb-12 animate-fadeIn">
      {loadingGenres ? (
        <div
          className={`transition-opacity duration-400 ${
            skeletonFading ? "opacity-0" : "opacity-100"
          }`}
        >
          <SkeletonHero />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : (
        <div className="animate-fadeIn">
          {" "}
          {/* already fades in */}
          <Hero />
          <UserMovieRecommendationsRow />
          <MovieRow title="Popular Now" sort="popularity" />
          <MovieRow title="Top Rated" sort="rating" />
          <MovieRow title="Newest Releases" sort="year" />
        </div>
      )}

      {/* Genre Selector */}
      <section className="space-y-4 px-4 sm:px-6">
        <h2 className="text-base sm:text-lg font-semibold text-white text-center sm:text-left">
          Browse by Genre
        </h2>

        <div className="flex flex-col sm:flex-row sm:justify-center gap-3">
          {genres.map((genre) => {
            const active = selectedGenre === genre;

            return (
              <button
                key={genre}
                onClick={() => setSelectedGenre(active ? null : genre)}
                className={`
            px-4 py-2 rounded-full text-sm font-medium
            transition-all duration-200
            ${
              active
                ? "bg-red-600 text-white scale-105"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }
          `}
              >
                {genre}
              </button>
            );
          })}
        </div>
      </section>

      {/* Persistent Genre Row with fixed height container */}
      <div className={selectedGenre ? "min-h-100" : ""}>
        <div
          className={`
            transition-all duration-500
            ${selectedGenre ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}
          `}
        >
          {selectedGenre && (
            <MovieRow
              title={`${selectedGenre} Movies`}
              sort="popularity"
              genre={selectedGenre}
              disableFetch={false}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default MoviesPage;
