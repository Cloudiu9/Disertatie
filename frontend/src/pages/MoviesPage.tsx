import { useEffect, useState } from "react";
import { fetchGenres } from "../api/movies";
import MovieRow from "../components/MovieRow";
import Hero from "../components/HeroBanner";
import UserMovieRecommendationsRow from "../components/UserMovieRecommendationsRow";
import { SkeletonHero, SkeletonRow } from "../components/Skeletons";
import GenreSelector from "../components/GenreSelector";

function MoviesPage() {
  const [genres, setGenres] = useState<string[]>([]);
  const [loadingGenres, setLoadingGenres] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [skeletonFading, setSkeletonFading] = useState(false);

  useEffect(() => {
    fetchGenres()
      .then(setGenres)
      .finally(() => {
        setSkeletonFading(true);
        setTimeout(() => setLoadingGenres(false), 400);
      });
  }, []);

  return (
    <div className="space-y-12 pb-12">
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
        <div className="animate-fadeIn space-y-12">
          <Hero />
          <UserMovieRecommendationsRow />
          <MovieRow title="Popular Now" sort="popularity" />
          <MovieRow title="Top Rated" sort="rating" />
          <MovieRow title="Newest Releases" sort="year" />
        </div>
      )}

      {/* Genre Selector */}
      <GenreSelector
        genres={genres}
        selectedGenre={selectedGenre}
        onSelect={setSelectedGenre}
      />

      {/* Persistent Genre Row with fixed height container */}
      <div className={selectedGenre ? "min-h-100" : ""}>
        <div
          className={`
            transition-all duration-500
            ${
              selectedGenre
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4 pointer-events-none"
            }
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
