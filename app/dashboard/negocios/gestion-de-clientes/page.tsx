'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

interface Cliente {
  id: number
  nombre_empresa: string
  rif: string
  direccion_fiscal: string
  telefono: string
  email: string
  persona_contacto: string
  estado: 'active' | 'inactive'
  fecha_creacion: string
}

export default function GestionDeClientesPage() {
  const router = useRouter()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/login')
          return
        }

        // Fetch clientes data from Supabase
        const { data: clientesData } = await supabase.from("clientes").select("*")
        setClientes(clientesData || [])
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: any, session: any) => {
        if (!session?.user) {
          router.push('/login')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-white min-h-screen">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-white">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Gestión de Clientes
            </h1>
            <p className="mt-2 text-gray-600">
              Administración de clientes y empresas
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard/negocios/gestion-de-clientes/new')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors shadow-md"
            style={{ backgroundColor: 'var(--primary-blue)' }}
          >
            + Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Clientes List */}
      {clientes.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gray-50 rounded-lg p-8">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay clientes registrados</h3>
            <p className="text-gray-500 mb-4">Comienza registrando tu primer cliente</p>
            <button
              onClick={() => router.push('/dashboard/negocios/gestion-de-clientes/new')}
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors shadow-md"
              style={{ backgroundColor: 'var(--primary-blue)' }}
            >
              + Crear Primer Cliente
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clientes.map((cliente) => (
            <div
              key={cliente.id}
              onClick={() => router.push(`/dashboard/negocios/gestion-de-clientes/${cliente.id}`)}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg cursor-pointer transform transition-all duration-200 hover:scale-105 h-64 flex flex-col w-full"
            >
              <div className={`h-2 flex-shrink-0 ${cliente.estado === 'active' ? 'bg-green-500' : 'bg-gray-500'}`}></div>
              <div className="p-6 flex-1 flex flex-col w-full overflow-hidden">
                <div className="flex justify-between items-start mb-4 flex-shrink-0" style={{ minHeight: '80px' }}>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <h3 className="text-xl font-semibold text-gray-900 truncate leading-tight">
                      {cliente.nombre_empresa}
                    </h3>
                    <p className="text-gray-800 text-sm mt-1 font-medium truncate leading-tight">
                      RIF: {cliente.rif}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ml-2 ${getStatusColor(cliente.estado)}`}>
                    {cliente.estado === 'active' ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                
                <div className="space-y-2 mb-4 flex-1 overflow-hidden">
                  <p className="text-gray-700 text-sm truncate">
                    <span className="font-medium">Contacto:</span> {cliente.persona_contacto}
                  </p>
                  {cliente.telefono && (
                    <p className="text-gray-700 text-sm truncate">
                      <span className="font-medium">Teléfono:</span> {cliente.telefono}
                    </p>
                  )}
                  {cliente.email && (
                    <p className="text-gray-700 text-sm truncate">
                      <span className="font-medium">Email:</span> {cliente.email}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end pt-4 border-t border-gray-100 mt-auto flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/dashboard/negocios/gestion-de-clientes/${cliente.id}`)
                    }}
                    className="text-blue-600 hover:text-blue-900 text-sm font-medium flex items-center flex-shrink-0"
                  >
                    Ver detalles
                    <svg className="w-4 h-4 ml-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
