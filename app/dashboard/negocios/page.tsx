'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

interface OSI {
  id: string
  nro_osi: string
  nombre_empresa: string
  estado: 'active' | 'inactive'
}

export default function NegociosPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [osis, setOsis] = useState<OSI[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingOsi, setEditingOsi] = useState<OSI | null>(null)
  const [formData, setFormData] = useState({
    nro_osi: '',
    nombre_empresa: '',
    estado: 'active' as 'active' | 'inactive'
  })
  const supabase = createClient() // Create client once

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

  const handleCreate = async () => {
    const { error } = await supabase.from("osi").insert([formData])
    
    if (!error) {
      // Refresh list
      const { data: osiData } = await supabase.from("osi").select("*")
      setOsis(osiData || [])
      
      // Reset form
      setFormData({ nro_osi: '', nombre_empresa: '', estado: 'active' })
      setShowAddForm(false)
    } else {
      console.error('Error creating OSI:', error.message)
    }
  }

  const handleUpdate = async () => {
    if (!editingOsi) return
    
    const { error } = await supabase.from("osi")
      .update(formData)
      .eq("id", editingOsi.id)
    
    if (!error) {
      // Refresh list
      const { data: osiData } = await supabase.from("osi").select("*")
      setOsis(osiData || [])
      
      // Reset form
      setEditingOsi(null)
      setFormData({ nro_osi: '', nombre_empresa: '', estado: 'active' })
    } else {
      console.error('Error updating OSI:', error.message)
    }
  }

  const handleDelete = async (id: string) => {
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

  const startEdit = (osi: OSI) => {
    setEditingOsi(osi)
    setFormData({
      nro_osi: osi.nro_osi,
      nombre_empresa: osi.nombre_empresa,
      estado: osi.estado
    })
  }

  const cancelEdit = () => {
    setEditingOsi(null)
    setFormData({ nro_osi: '', nombre_empresa: '', estado: 'active' })
  }

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

  if (!user) {
    return null
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
              onClick={() => setShowAddForm(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
            >
              + Nueva OSI
            </button>
          </div>
        </div>

        {/* Add/Edit Form */}
        {(showAddForm || editingOsi) && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingOsi ? 'Editar OSI' : 'Nueva OSI'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número OSI
                </label>
                <input
                  type="text"
                  value={formData.nro_osi}
                  onChange={(e) => setFormData({...formData, nro_osi: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ej: OSI-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre Empresa
                </label>
                <input
                  type="text"
                  value={formData.nombre_empresa}
                  onChange={(e) => setFormData({...formData, nombre_empresa: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Nombre de la empresa"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <select
                  value={formData.estado}
                  onChange={(e) => setFormData({...formData, estado: e.target.value as 'active' | 'inactive'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={editingOsi ? handleUpdate : handleCreate}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
              >
                {editingOsi ? 'Actualizar' : 'Crear'}
              </button>
              <button
                onClick={editingOsi ? cancelEdit : () => setShowAddForm(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* OSI List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {osis.map((osi) => (
            <div
              key={osi.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg min-h-[120px]"
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
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(osi)}
                      className="text-indigo-600 hover:text-indigo-800 text-sm"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(osi.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Eliminar
                    </button>
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
