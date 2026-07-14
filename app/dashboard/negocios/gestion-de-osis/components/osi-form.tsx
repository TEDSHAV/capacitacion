'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import OSIActionButtons from './OSIActionButtons'

interface Empresa {
  id: string;
  razon_social: string;
  rif: string;
  direccion_fiscal: string;
  codigo_cliente: string;
}

interface Servicio {
  id: number;
  nombre: string;
}

interface Usuario {
  id: number;
  nombre_apellido: string;
}

interface CatalogoServicio {
  id: number;
  nombre: string;
}

interface Contacto {
  id: number;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  email2: string;
}

interface OSIFormProps {
  initialData?: any
  isNew: boolean
  isEditing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
  onDelete: () => void
  empresas?: Empresa[]
  servicios?: Servicio[]
  usuarios?: Usuario[]
  filteredEmpresas?: Empresa[]
  catalogoServicios?: CatalogoServicio[]
  filteredCatalogoServicios?: CatalogoServicio[]
  empresaSearchTerm?: string
  temaSearchTerm?: string
  setEmpresaSearchTerm?: (term: string) => void
  setTemaSearchTerm?: (term: string) => void
  updateFormData?: (field: string, value: any) => void
}

const OSIForm = ({ 
  initialData, 
  isNew, 
  isEditing, 
  onEdit, 
  onCancel, 
  onSave, 
  onDelete 
}: OSIFormProps) => {
  const [formData, setFormData] = useState(initialData || {
    id: 0,
    nro_osi: '',
    nro_orden_compra: '',
    tipo_servicio: '',
    nro_presupuesto: '',
    ejecutivo_negocios: 0,
    cliente_nombre_empresa: '',
    tema: '',
    fecha_emision: null,
    fecha_servicio: null,
    nro_sesiones: 1,
    fecha_ejecucion1: '',
    fecha_ejecucion2: '',
    fecha_ejecucion3: '',
    fecha_ejecucion4: '',
    fecha_ejecucion5: '',
    participantes_max: 0,
    detalle_sesion: '',
    certificado_impreso: false,
    carnet_impreso: false,
    observaciones_adicionales: '',
    detalle_capacitacion: '',
    costo_honorarios: 12,
    nro_horas: 6,
    costo_total: 0,
    costo_impresion_material: 0,
    costo_traslado: 0,
    costo_logistica_comida: 0,
    costo_otros: 0,
    estado: 'pendiente',
    codigo_cliente: '',
    rif: '',
    direccion_fiscal: '',
    direccion_envio: '',
    persona_contacto_id: 0,
    contacto_nombre: '',
    contacto_apellido: '',
    contacto_telefono: '',
    contacto_email: '',
    contacto_email2: '',
    direccion_ejecucion: ''
  })

  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [catalogoServicios, setCatalogoServicios] = useState<CatalogoServicio[]>([])
  const [contactos, setContactos] = useState<Contacto[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredEmpresas, setFilteredEmpresas] = useState<Empresa[]>([])
  const [temaSearchTerm, setTemaSearchTerm] = useState('')
  const [filteredCatalogoServicios, setFilteredCatalogoServicios] = useState<CatalogoServicio[]>([])

  const supabase = createClient()

  useEffect(() => {
    loadEmpresas()
    loadServicios()
    loadUsuarios()
    loadContactos()
  }, [])

  useEffect(() => {
    const filtered = empresas.filter(empresa =>
      empresa.razon_social.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredEmpresas(filtered)
  }, [searchTerm, empresas])

  useEffect(() => {
    if (formData.tipo_servicio) {
      loadCatalogoServicios()
    } else {
      setCatalogoServicios([])
      setFilteredCatalogoServicios([])
    }
  }, [formData.tipo_servicio])

  useEffect(() => {
    if (formData.cliente_nombre_empresa) {
      loadContactos()
    } else {
      setContactos([])
    }
  }, [formData.cliente_nombre_empresa])

  useEffect(() => {
    const filtered = catalogoServicios.filter(servicio =>
      servicio.nombre.toLowerCase().includes(temaSearchTerm.toLowerCase())
    )
    setFilteredCatalogoServicios(filtered)
  }, [temaSearchTerm, catalogoServicios])

  const updateFormData = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }))
  }

  const loadEmpresas = async () => {
    try {
      const { data, error } = await supabase
        .from("empresas")
        .select("id, razon_social, rif, direccion_fiscal, codigo_cliente")
        .order("razon_social")
      
      if (error) throw error
      setEmpresas(data || [])
    } catch (err) {
      console.error('Error loading empresas:', err)
    }
  }

  const loadServicios = async () => {
    try {
      const { data, error } = await supabase
        .from("servicios")
        .select("id, nombre")
        .order("nombre")
      
      if (error) throw error
      setServicios(data || [])
    } catch (err) {
      console.error('Error loading servicios:', err)
    }
  }

  const loadUsuarios = async () => {
    try {
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nombre_apellido")
        .order("nombre_apellido")
      
      if (error) throw error
      setUsuarios(data || [])
    } catch (err) {
      console.error('Error loading usuarios:', err)
    }
  }

  const loadCatalogoServicios = async () => {
    try {
      const { data, error } = await supabase
        .from("catalogo_servicios")
        .select("id, nombre")
        .eq("tipo_servicio", formData.tipo_servicio)
        .order("nombre")
      
      if (error) throw error
      setCatalogoServicios(data || [])
    } catch (err) {
      console.error('Error loading catalogo_servicios:', err)
    }
  }

  const loadContactos = async () => {
    try {
      const { data, error } = await supabase
        .from("contactos")
        .select("id, nombre, apellido, telefono, email, email2")
        .eq("empresa_id", formData.cliente_nombre_empresa)
        .order("nombre")
      
      if (error) throw error
      setContactos(data || [])
    } catch (err) {
      console.error('Error loading contactos:', err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Client Information Section */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 border-b pb-1">Información del Cliente</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Empresa</label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setSearchTerm('')}
                disabled={!isEditing && !isNew}
                tabIndex={!isEditing && !isNew ? -1 : 0}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Buscar empresa..."
              />
              {searchTerm && filteredEmpresas.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {filteredEmpresas.map((empresa) => (
                    <div
                      key={empresa.id}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                      onClick={() => {
                        updateFormData('cliente_nombre_empresa', empresa.razon_social)
                        updateFormData('codigo_cliente', empresa.codigo_cliente)
                        updateFormData('rif', empresa.rif)
                        updateFormData('direccion_fiscal', empresa.direccion_fiscal)
                        setSearchTerm('')
                      }}
                    >
                      <div className="font-medium">{empresa.razon_social}</div>
                      <div className="text-sm text-gray-500">{empresa.rif}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Servicio</label>
            <select
              value={formData.tipo_servicio || ''}
              onChange={(e) => updateFormData('tipo_servicio', e.target.value)}
              disabled={!isEditing && !isNew}
              tabIndex={!isEditing && !isNew ? -1 : 0}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Seleccione un tipo</option>
              {servicios.map((servicio) => (
                <option key={servicio.id} value={servicio.nombre}>
                  {servicio.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tema</label>
            <div className="relative">
              <input
                type="text"
                value={temaSearchTerm}
                onChange={(e) => setTemaSearchTerm(e.target.value)}
                onFocus={() => setTemaSearchTerm('')}
                disabled={!isEditing && !isNew}
                tabIndex={!isEditing && !isNew ? -1 : 0}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Buscar tema..."
              />
              {temaSearchTerm && filteredCatalogoServicios.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {filteredCatalogoServicios.map((servicio, index) => (
                    <div
                      key={servicio.id}
                      data-tema-option={index}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                      onClick={() => {
                        updateFormData('tema', servicio.nombre)
                        setTemaSearchTerm('')
                      }}
                    >
                      <div className="font-medium">{servicio.nombre}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ejecutivo Negocios</label>
            <select
              value={formData.ejecutivo_negocios || ''}
              onChange={(e) => updateFormData('ejecutivo_negocios', e.target.value)}
              disabled={!isEditing && !isNew}
              tabIndex={!isEditing && !isNew ? -1 : 0}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Seleccione un ejecutivo</option>
              {usuarios.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.nombre_apellido}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <OSIActionButtons
        isNew={isNew}
        isEditing={isEditing}
        isLoading={false}
        onSave={onSave}
        onCancel={onCancel}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  )
}

export default OSIForm
