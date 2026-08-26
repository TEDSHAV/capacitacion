export default function GeneracionPersonalizadaLoading() {
  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <div className="h-7 w-56 bg-gray-200 rounded animate-pulse" />
        <div className="mt-2 h-4 w-80 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="space-y-4">
          <div>
            <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
            <div className="mt-2 h-10 w-full bg-gray-100 rounded animate-pulse" />
          </div>
          <div>
            <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
            <div className="mt-2 h-10 w-full bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-24 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
