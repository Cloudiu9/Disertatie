import { useEffect, useState } from "react";

import MovieRow from "../components/MovieRow";
import Hero from "../components/HeroBanner";

import { fetchTVGenres } from "../api/tv";

function TVPage() {
  const [genres, setGenres] = useState<string[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  useEffect(() => {
    fetchTVGenres().then(setGenres);
  }, []);

  return (
    <div className="space-y-12 pb-12">
      <Hero mediaType="tv" />

      <MovieRow title="Popular TV" sort="popularity" mediaType="tv" />

      <MovieRow title="Top Rated TV" sort="rating" mediaType="tv" />

      <MovieRow title="Newest TV" sort="year" mediaType="tv" />

      <section className="space-y-4 px-4 sm:px-6">
        <h2 className="text-base sm:text-lg font-semibold text-white text-center sm:text-left">
          Browse TV by Genre
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

      <div className={selectedGenre ? "min-h-[400px]" : ""}>
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
