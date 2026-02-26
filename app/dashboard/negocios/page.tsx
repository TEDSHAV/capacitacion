'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

interface OSI {
  id: number
  nro_osi: string
  nombre_empresa: string
  empresa_rif: string
  nro_orden_compra: string
  pedido: string
  tipo_servicio: string
  fecha_emision: string
  nro_presupuesto: string
  ejecutivo_negocios: string
  cliente_nombre_empresa: string
  cliente_codigo: string
  direccion_ejecucion: string
  direccion_envio: string
  direccion_fiscal_cliente: string
  persona_contacto: string
  telefono_contacto: string
  email_contacto: string
  tema: string
  fecha_servicio: string
  participantes_max: number
  detalle_sesion: string
  certificado_impreso: boolean
  carnet_impreso: boolean
  observaciones_adicionales: string
  costo_honorarios_hora: number
  costo_impresion_material: number
  costo_traslado: number
  costo_logistica_comida: number
  costo_otros: number
  estado: 'pendiente' | 'active' | 'inactive'
}

export default function NegociosPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [osis, setOsis] = useState<OSI[]>([])

  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      // Fetch OSI data from Supabase
      const { data: osiData } = await supabase.from("osi").select("*")
      setOsis(osiData || [])
    }

    checkAuth()

    // Listen for auth changes
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

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta OSI?')) return
    
    const { error } = await supabase.from("osi").delete().eq("id", id)
    
    if (!error) {
      // Refresh list
      const { data: osiData } = await supabase.from("osi").select("*")
      setOsis(osiData || [])
    } else {
      console.error('Error deleting OSI:', error.message)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="mb-8">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-indigo-600 hover:text-indigo-900 mb-4 inline-flex items-center"
        >
          ← Volver al Panel
        </button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Departamento de Negocios
            </h1>
            <p className="mt-2 text-gray-600">
              Administración de OSI
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard/negocios/osi/new')}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          >
            + Nueva OSI
          </button>
        </div>
      </div>

      {/* OSI List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {osis.map((osi) => (
          <div
            key={osi.id}
            onClick={() => router.push(`/dashboard/negocios/osi/${osi.nro_osi}`)}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg min-h-[120px] cursor-pointer transform hover:scale-105 transition-all duration-200"
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {osi.nro_osi}
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                {osi.nombre_empresa}
              </p>
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(osi.estado)}`}>
                  {osi.estado}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/dashboard/negocios/osi/${osi.nro_osi}`)
                  }}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                >
                  Editar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
