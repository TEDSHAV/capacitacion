'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

interface Department {
  id: string
  name: string
  description: string
  color: string
}

const departments: Department[] = [
  {
    id: 'negocios',
    name: 'Negocios',
    description: 'Business development and client relations',
    color: 'bg-blue-500'
  },
  {
    id: 'administracion',
    name: 'Administración',
    description: 'Administrative operations and management',
    color: 'bg-green-500'
  },
  {
    id: 'capacitacion',
    name: 'Capacitación',
    description: 'Training and employee development',
    color: 'bg-purple-500'
  },
  {
    id: 'marketing',
    name: 'Marketing',
    description: 'Marketing strategies and campaigns',
    color: 'bg-orange-500'
  },
  {
    id: 'servicios-tecnicos',
    name: 'Servicios Técnicos',
    description: 'Technical support and services',
    color: 'bg-red-500'
  }
]

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
    }

    checkAuth()

    // Listen for auth changes
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: any, session: any) => {
        if (!session?.user) {
          router.push('/login')
        } else {
          setUser(session.user)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router])

  const handleDepartmentClick = (departmentId: string) => {
    router.push(`/dashboard/${departmentId}`)
  }

  if (!user) {
    return null // Will be handled by auth check
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
          {departments.map((department) => (
            <div
              key={department.id}
              onClick={() => handleDepartmentClick(department.id)}
              className="cursor-pointer transform transition-all duration-200 hover:scale-105"
            >
              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg">
                <div className={`h-2 ${department.color}`}></div>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {department.name}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {department.description}
                  </p>
                  <div className="mt-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Ver Módulos
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
