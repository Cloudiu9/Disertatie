import { useEffect, useRef, useState } from "react";
import { fetchGenres } from "../api/movies";
import MovieRow from "../components/MovieRow";
import Hero from "../components/HeroBanner";
import UserRecommendationsRow from "../components/UserRecommendationsRow";

function MoviesPage() {
  const [genres, setGenres] = useState<string[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  useEffect(() => {
    fetchGenres().then(setGenres);
  }, []);

  return (
    <div className="space-y-12 pb-12">
      <Hero />
      <UserRecommendationsRow />
      <MovieRow title="Popular Now" sort="popularity" />
      <MovieRow title="Top Rated" sort="rating" />
      <MovieRow title="Newest Releases" sort="year" />

      {/* Genre Selector */}
      <section className="space-y-4 px-6">
        <h2 className="text-lg font-semibold text-white">Browse by Genre</h2>
        <div className="flex justify-center">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700">
            {genres.map((genre) => {
              const active = selectedGenre === genre;
              return (
                <button
                  key={genre}
                  onClick={() => setSelectedGenre(active ? null : genre)}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap
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
        </div>
      </section>

      {/* Persistent Genre Row with fixed height container */}
      <div className={selectedGenre ? "min-h-[400px]" : ""}>
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
