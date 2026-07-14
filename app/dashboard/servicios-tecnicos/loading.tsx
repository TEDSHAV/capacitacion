export default function ServiciosTecnicosLoading() {
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-white min-h-screen">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Cargando Servicios Técnicos...</p>
          </div>
        </div>
      </div>
    </div>
  )
}
