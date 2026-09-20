export default function CapacitacionLoading() {
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="h-8 w-64 bg-gray-200 rounded-lg animate-pulse" />
        <div className="mt-2 h-4 w-96 max-w-full bg-gray-100 rounded animate-pulse" />
      </div>

      {/* Quick Action banner skeleton */}
      <div className="mb-8 rounded-2xl bg-gray-100 h-28 animate-pulse border border-gray-200/60" />

      {/* Main 3 Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs flex flex-col justify-between h-48 animate-pulse"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-gray-200 mb-4" />
              <div className="h-5 w-40 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-52 bg-gray-100 rounded" />
            </div>
            <div className="h-4 w-28 bg-gray-100 rounded self-end" />
          </div>
        ))}
      </div>
    </div>
  );
}
