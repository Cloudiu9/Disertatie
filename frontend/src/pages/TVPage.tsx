import { useEffect, useState } from "react";
import MovieRow from "../components/MovieRow";
import Hero from "../components/HeroBanner";
import { fetchTVGenres } from "../api/tv";
import { SkeletonHero, SkeletonRow } from "../components/Skeletons";
import UserTVRecommendationsRow from "../components/UserTVRecommendationsRow";
import GenreSelector from "../components/GenreSelector";

function TVPage() {
  const [genres, setGenres] = useState<string[]>([]);
  const [loadingGenres, setLoadingGenres] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [skeletonFading, setSkeletonFading] = useState(false);

  useEffect(() => {
    fetchTVGenres()
      .then(setGenres)
      .finally(() => {
        setSkeletonFading(true); // 1. fade out
        setTimeout(() => setLoadingGenres(false), 400); // 2. unmount after
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
          <Hero mediaType="tv" />
          <UserTVRecommendationsRow />
          <MovieRow title="Popular TV" sort="popularity" mediaType="tv" />
          <MovieRow title="Top Rated TV" sort="rating" mediaType="tv" />
          <MovieRow title="Newest TV" sort="year" mediaType="tv" />
        </div>
      )}

      {/* Genre Selector */}
      <GenreSelector
        genres={genres}
        selectedGenre={selectedGenre}
        onSelect={setSelectedGenre}
      />

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
              title={`${selectedGenre} TV`}
              sort="popularity"
              genre={selectedGenre}
              mediaType="tv"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default TVPage;
