type Props = {
  year?: number | string | null;
  rating?: number | null;
  large?: boolean;
  runtime?: number | null; // minutes for movies, avg episode runtime for TV
  seasons?: number | null; // TV only
  episodes?: number | null; // TV only
  showTmdb?: boolean;
};

function getRatingColor(score: number) {
  if (score <= 5) return "text-red-500";
  if (score <= 6.5) return "text-orange-400";
  if (score <= 8) return "text-green-500";
  return "text-sky-500";
}

function formatRuntime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function MovieMeta({
  year,
  rating,
  large,
  runtime,
  seasons,
  episodes,
  showTmdb,
}: Props) {
  if (year == null && rating == null) return null;

  const formattedRating = rating != null ? Number(rating).toFixed(1) : null;

  const metaParts: React.ReactNode[] = [];

  if (year)
    metaParts.push(
      <span key="year" className="text-gray-300">
        {year}
      </span>,
    );

  if (seasons != null) {
    const label = `${seasons} Season${seasons !== 1 ? "s" : ""}${episodes != null ? ` · ${episodes} eps` : ""}`;
    metaParts.push(
      <span key="seasons" className="text-gray-300">
        {label}
      </span>,
    );
  } else if (runtime != null && runtime > 0) {
    metaParts.push(
      <span key="runtime" className="text-gray-300">
        {formatRuntime(runtime)}
      </span>,
    );
  }

  if (formattedRating) {
    metaParts.push(
      <span key="rating" className="flex items-center gap-1.5">
        {showTmdb && (
          <span
            style={{ backgroundColor: "rgba(28, 184, 216)" }}
            className="text-white text-xs font-extrabold px-1.5 py-0.5 rounded leading-none"
          >
            TMDb
          </span>
        )}
        <span className={getRatingColor(Number(formattedRating))}>
          {formattedRating}
        </span>
      </span>,
    );
  }

  return (
    <div
      className={`flex items-center gap-2 ${large ? "text-xl md:text-2xl" : "text-lg"} font-semibold`}
    >
      {metaParts.map((part, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <span className="text-gray-600">·</span>}
          {part}
        </span>
      ))}
    </div>
  );
}
