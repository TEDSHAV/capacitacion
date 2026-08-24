export default function RequisicionesLoading() {
  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <div className="h-7 w-64 bg-gray-200 rounded animate-pulse" />
          <div className="mt-2 h-4 w-96 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="h-9 w-40 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="border-b border-gray-200 p-3 flex gap-3">
          <div className="h-9 w-56 bg-gray-100 rounded animate-pulse" />
          <div className="h-9 w-44 bg-gray-100 rounded animate-pulse" />
          <div className="h-9 w-36 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="divide-y divide-gray-100">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-4">
              <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
              <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
              <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
              <div className="h-5 w-20 bg-gray-100 rounded-full animate-pulse" />
              <div className="ml-auto h-8 w-20 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
