export default function RequisicionEditLoading() {
  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="mt-2 h-4 w-80 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="space-y-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}>
              <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
              <div className="mt-2 h-10 w-full bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
          <div className="flex gap-3 pt-4">
            <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-24 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
