'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

interface Module {
  id: string
  name: string
  description: string
  status: 'active' | 'inactive' | 'pending'
}

const departmentModules: Record<string, Module[]> = {
  negocios: [
    { id: '1', name: 'OSI', description: 'Administración de OSI', status: 'active' },
    { id: '2', name: 'Partnership Management', description: 'Handle business partnerships', status: 'active' },
    { id: '3', name: 'Sales Analytics', description: 'Track and analyze sales performance', status: 'pending' }
  ],
  administracion: [
    { id: '1', name: 'Employee Management', description: 'Manage employee records and HR', status: 'active' },
    { id: '2', name: 'Financial Reports', description: 'Generate and view financial reports', status: 'active' },
    { id: '3', name: 'Compliance Tracking', description: 'Monitor regulatory compliance', status: 'active' }
  ],
  capacitacion: [
    { id: '1', name: 'Generar certificados', description: 'Generación de carnets y certificados', status: 'active' },
    { id: '2', name: 'Administrar plantillas', description: 'Administrar plantillas de cursos según clientes', status: 'inactive' },
    { id: '3', name: 'Certification Tracking', description: 'Track professional certifications', status: 'pending' }
  ],
  marketing: [
    { id: '1', name: 'Campaign Management', description: 'Create and manage marketing campaigns', status: 'active' },
    { id: '2', name: 'Social Media', description: 'Manage social media presence', status: 'active' },
    { id: '3', name: 'Content Creation', description: 'Oversee content creation strategy', status: 'active' }
  ],
  'servicios-tecnicos': [
    { id: '1', name: 'Support Tickets', description: 'Manage technical support requests', status: 'active' },
    { id: '2', name: 'Maintenance Schedule', description: 'Schedule and track maintenance tasks', status: 'active' },
    { id: '3', name: 'Inventory Management', description: 'Manage technical equipment inventory', status: 'inactive' }
  ]
}


export default function DepartmentPage() {
  const router = useRouter()
  const params = useParams()
  const [user, setUser] = useState<any>(null)
  const [modules, setModules] = useState<Module[]>([])

  const department = params.department as string

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      // Load modules for this department
      const deptModules = departmentModules[department] || []
      setModules(deptModules)
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
  }, [router, department])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (!user) {
    return null // Will be handled by auth check
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-indigo-600 hover:text-indigo-900 mb-4 inline-flex items-center"
          >
            ← Volver al Panel
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            Departamento de {department} 
          </h1>
          <p className="mt-2 text-gray-600">
            Administrar módulos y recursos para el departamento {department}
          </p>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Módulos del Departamento
            </h3>
            <div className="space-y-4">
              {modules.map((module) => (
                <div
                  key={module.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-md font-medium text-gray-900">
                        {module.name}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {module.description}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(module.status)}`}>
                        {module.status}
                      </span>
                      <button className="text-indigo-600 hover:text-indigo-900 text-sm">
                        Administrar →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {modules.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Aún no hay módulos disponibles para este departamento.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
