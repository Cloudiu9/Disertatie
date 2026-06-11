interface GenreSelectorProps {
  genres: string[];
  selectedGenre: string | null;
  onSelect: (genre: string | null) => void;
  title?: string;
}

export default function GenreSelector({
  genres,
  selectedGenre,
  onSelect,
  title = "Browse by Genre",
}: GenreSelectorProps) {
  return (
    <section className="space-y-4 px-4 sm:px-6">
      <h2 className="text-base sm:text-lg font-semibold text-white text-center sm:text-left">
        {title}
      </h2>

      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-center gap-3">
        {genres.map((genre) => {
          const active = selectedGenre === genre;
          return (
            <button
              key={genre}
              onClick={() => onSelect(active ? null : genre)}
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
  );
}
