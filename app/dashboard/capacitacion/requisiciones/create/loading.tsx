export default function CreateRequisicionLoading() {
  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8 flex items-center gap-4">
        <div className="h-9 w-9 bg-gray-200 rounded animate-pulse" />
        <div>
          <div className="h-7 w-56 bg-gray-200 rounded animate-pulse" />
          <div className="mt-2 h-4 w-72 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="h-40 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-56 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-72 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-10 w-48 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  );
}
