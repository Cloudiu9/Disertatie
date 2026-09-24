import { useEffect, useState } from "react";

function LoadingMessage() {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const startTime = Date.now();

    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (elapsedSeconds < 3) {
    return <LoadingStatus title="Loading" subtitle="Just a moment…" />;
  }

  if (elapsedSeconds < 10) {
    return (
      <LoadingStatus
        title="Getting things ready"
        subtitle="Your movies are almost here…"
      />
    );
  }

  if (elapsedSeconds < 30) {
    return (
      <LoadingStatus
        title="Waking things up"
        subtitle="This can take a little longer on the first visit…"
      />
    );
  }

  return (
    <LoadingStatus
      title="Almost there"
      subtitle="The server is taking a little longer to wake up…"
    />
  );
}

function LoadingStatus({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <div className="mb-4 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
        <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse [animation-delay:300ms]" />
      </div>

      <p className="text-md font-medium tracking-wide text-white">{title}</p>

      <p className="mt-1 text-sm text-gray-400">{subtitle}</p>
    </div>
  );
}

function MoviesSkeleton() {
  return (
    <div className="space-y-8">
      <SkeletonHero />

      <LoadingMessage />

      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </div>
  );
}

function SkeletonHero() {
  return (
    <div className="w-full h-[60vh] bg-gray-800 animate-pulse rounded-sm" />
  );
}
function SkeletonRow({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-4">
      <div className="h-5 w-40 bg-gray-700 rounded animate-pulse ml-6" />

      <div className="flex gap-4 px-6 overflow-hidden">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="h-78.75 w-57.5 bg-gray-800 rounded-md animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

function SkeletonGrid({ count = 14 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="w-full aspect-2/3 bg-gray-800 rounded-md animate-pulse"
        />
      ))}
    </div>
  );
}

function SkeletonDetails() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Backdrop area */}
      <div className="relative h-[80vh] w-full bg-gray-900 animate-pulse">
        <div className="absolute inset-0 bg-linear-to-t from-black via-black/70 to-black/20" />

        <div className="relative z-10 mx-auto flex h-full max-w-screen-2xl items-end px-6 pb-12">
          <div className="flex gap-8">
            {/* Poster */}
            <div className="w-55 min-w-55 h-82.5 bg-gray-800 rounded-lg" />

            {/* Info panel */}
            <div className="max-w-2xl w-full space-y-4">
              {/* Title */}
              <div className="h-9 w-72 bg-gray-700 rounded" />

              {/* Meta: year · runtime · rating */}
              <div className="flex gap-4">
                <div className="h-5 w-12 bg-gray-700 rounded" />
                <div className="h-5 w-16 bg-gray-700 rounded" />
                <div className="h-5 w-10 bg-gray-700 rounded" />
              </div>

              {/* Genre tags */}
              <div className="flex gap-2">
                <div className="h-7 w-20 bg-gray-700 rounded" />
                <div className="h-7 w-16 bg-gray-700 rounded" />
                <div className="h-7 w-24 bg-gray-700 rounded" />
              </div>

              {/* Overview lines */}
              <div className="space-y-2 pt-1">
                <div className="h-4 w-full bg-gray-700 rounded" />
                <div className="h-4 w-[90%] bg-gray-700 rounded" />
                <div className="h-4 w-[75%] bg-gray-700 rounded" />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <div className="h-10 w-24 bg-gray-700 rounded" />
                <div className="h-10 w-32 bg-gray-700 rounded" />
                <div className="h-10 w-28 bg-gray-700 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations row */}
      <div className="mt-10">
        <SkeletonRow />
      </div>
    </div>
  );
}

export {
  SkeletonHero,
  SkeletonRow,
  SkeletonGrid,
  SkeletonDetails,
  MoviesSkeleton,
};
