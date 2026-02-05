import { PlayIcon, InformationCircleIcon } from "@heroicons/react/24/solid";

type HeroMovie = {
  title: string;
  overview: string;
  backdropUrl: string;
  year: number;
  rating: number;
};

const heroMovie: HeroMovie = {
  title: "Dune: Part Two",
  overview:
    "Paul Atreides unites with the Fremen while on a warpath of revenge against the conspirators who destroyed his family.",
  backdropUrl:
    "https://image.tmdb.org/t/p/original/9wJO4MBzkqgUZemLTGEsgUbYyP6.jpg",
  year: 2024,
  rating: 8.6,
};

function HeroBanner() {
  return (
    <section className="relative h-[75vh] w-full text-white">
      {/* Background image */}
      <img
        src={heroMovie.backdropUrl}
        alt={heroMovie.title}
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent" />

      {/* Content */}
      <div className="relative z-10 flex h-full max-w-screen-2xl flex-col justify-center px-6 md:px-12">
        <h1 className="max-w-xl text-4xl font-extrabold md:text-6xl">
          {heroMovie.title}
        </h1>

        <div className="mt-4 flex items-center gap-4 text-sm text-gray-300">
          <span>{heroMovie.year}</span>
          <span className="font-semibold text-green-400">
            ⭐ {heroMovie.rating}
          </span>
        </div>

        <p className="mt-4 max-w-xl text-sm leading-relaxed text-gray-200 md:text-base">
          {heroMovie.overview}
        </p>

        {/* Actions */}
        <div className="mt-6 flex gap-4">
          <button className="flex items-center gap-2 rounded bg-white px-6 py-2 font-semibold text-black hover:bg-white/90 transition">
            <PlayIcon className="h-5 w-5" />
            Play
          </button>

          <button className="flex items-center gap-2 rounded bg-gray-500/70 px-6 py-2 font-semibold hover:bg-gray-500/50 transition">
            <InformationCircleIcon className="h-5 w-5" />
            More Info
          </button>
        </div>
      </div>
    </section>
  );
}

export default HeroBanner;
