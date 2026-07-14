'use client'

import { useRouter } from 'next/navigation'

interface Department {
  id: string
  nombre_departamento: string
  color: string
}

interface DashboardClientProps {
  user: any
  departamentos: Department[]
}

export default function DashboardClient({ user, departamentos }: DashboardClientProps) {
  const router = useRouter()

  const handleDepartmentClick = (departmentId: string) => {
    router.push(`/dashboard/${departmentId}`)
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-gray-600">No autenticado</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Bienvenido al Panel de Administración
          </h1>
          <p className="mt-2 text-gray-600">
            Selecciona un departamento para administrar sus módulos y recursos
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departamentos.map((department) => (
            <div
              key={department.id}
              onClick={() => handleDepartmentClick(department.id)}
              className="cursor-pointer transform transition-all duration-200 hover:scale-105"
            >
              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg">
                <div className={`h-2 ${department.color}`}></div>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">
                    {department.nombre_departamento}
                  </h3>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )


  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Bienvenido al Panel de Administración
          </h1>
          <p className="mt-2 text-gray-600">
            Selecciona un departamento para administrar sus módulos y recursos
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departamentos.map((department) => (
            <div
              key={department.id}
              onClick={() => handleDepartmentClick(department.id)}
              className="cursor-pointer transform transition-all duration-200 hover:scale-105"
            >
              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg">
                <div className={`h-2 ${department.color}`}></div>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">
                    {department.nombre_departamento}
                  </h3>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

