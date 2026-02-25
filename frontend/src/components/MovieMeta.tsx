type Props = {
  year?: number | string | null;
  rating?: number | null;
  large?: boolean;
};

function getRatingColor(score: number) {
  if (score <= 5) return "text-red-500";
  if (score <= 6.5) return "text-orange-400";
  if (score <= 8) return "text-green-500";
  return "text-sky-500";
}

export default function MovieMeta({ year, rating, large }: Props) {
  if (year == null && rating == null) return null;

  const formattedRating = rating != null ? Number(rating).toFixed(1) : null;

  return (
    <div
      className={`flex items-center gap-6 ${
        large ? "text-xl md:text-2xl" : "text-lg"
      } font-semibold`}
    >
      {year && <span className="text-gray-300">{year}</span>}

      {formattedRating && (
        <span className={getRatingColor(Number(formattedRating))}>
          {formattedRating}
        </span>
      )}
    </div>
  );
}
