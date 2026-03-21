function SkeletonHero() {
  return <div className="w-full h-[60vh] bg-gray-800 animate-pulse" />;
}

function SkeletonRow({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-4">
      <div className="h-5 w-40 bg-gray-700 rounded animate-pulse ml-6" />

      <div className="flex gap-4 px-6 overflow-hidden">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="h-[315px] w-[230px] bg-gray-800 rounded-md animate-pulse"
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
          className="w-full aspect-[2/3] bg-gray-800 rounded-md animate-pulse"
        />
      ))}
    </div>
  );
}

export { SkeletonHero, SkeletonRow, SkeletonGrid };
