export default function ReportesLoading() {
  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="mt-2 h-4 w-80 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
            <div className="mt-3 h-20 bg-gray-100 rounded animate-pulse" />
            <div className="mt-3 h-9 w-full bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
