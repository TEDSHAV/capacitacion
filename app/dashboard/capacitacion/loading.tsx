export default function CapacitacionLoading() {
  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="mt-2 h-4 w-96 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
            <div className="mt-3 h-8 w-16 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
