export default function ViewRequisicionLoading() {
  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8 flex justify-between items-center max-w-5xl mx-auto">
        <div className="flex items-center gap-4">
          <div className="h-9 w-9 bg-gray-200 rounded animate-pulse" />
          <div>
            <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="mt-2 h-4 w-64 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
        <div className="h-9 w-40 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-32 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}
