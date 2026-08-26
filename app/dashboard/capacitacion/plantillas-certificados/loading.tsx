export default function PlantillasCertificadoLoading() {
  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <div className="h-7 w-56 bg-gray-200 rounded animate-pulse" />
          <div className="mt-2 h-4 w-80 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="h-9 w-40 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="h-32 bg-gray-100 rounded animate-pulse" />
            <div className="mt-3 h-4 w-24 bg-gray-100 rounded animate-pulse" />
            <div className="mt-2 h-8 w-full bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
