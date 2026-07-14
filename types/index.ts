// Global types for OSI system

export interface Empresa {
  id: string;
  razon_social: string;
  rif: string;
  direccion_fiscal: string;
  codigo_cliente: string;
}

export interface Servicio {
  id: number;
  nombre: string;
}

export interface Usuario {
  id: number;
  nombre_apellido: string;
}

export interface CatalogoServicio {
  id: number;
  nombre: string;
}

export interface Contacto {
  id: number;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  email2: string;
}

export interface OSI {
  id: number
  nro_osi: string
  nro_orden_compra: string | null
  tipo_servicio: string | null
  nro_presupuesto: string | null
  ejecutivo_negocios: number | null
  cliente_nombre_empresa: string | null
  tema: string | null
  fecha_emision: Date | null
  fecha_servicio: Date | null
  participantes_max: number | null
  detalle_sesion: string | null
  certificado_impreso: boolean | null
  carnet_impreso: boolean | null
  observaciones_adicionales: string | null
  costo_honorarios: number | null
  nro_horas: number | null
  costo_total: number | null
  costo_impresion_material: number | null
  costo_traslado: number | null
  costo_logistica_comida: number | null
  costo_otros: number | null
  estado: 'pendiente' | 'active' | 'activo' | 'inactive' | 'cerrado' | null
  empresa_id: number | null
  persona_contacto_id: number | null
  direccion_fiscal: number | null
  direccion_envio: string | null
  direccion_ejecucion: string | null
  nro_sesiones: number | null
  fecha_ejecucion1: Date | null
  fecha_ejecucion2: Date | null
  fecha_ejecucion3: Date | null
  fecha_ejecucion4: Date | null
  fecha_ejecucion5: Date | null
  codigo_cliente: number | null
  contacto_id: number | null
  detalle_capacitacion: string | null
}

export interface CertificateGeneration {
  id?: string;
  osi_id: string;
  osi_data?: OSI;
  certificate_title: string;
  certificate_subtitle?: string;
  passing_grade?: number; // Minimum score to pass (default 14, editable)
  course_topic_id: string;
  course_topic_data?: CourseTopic;
  participants: CertificateParticipant[];
  location: string;
  date: string;
  created_at?: string;
  updated_at?: string;
}

export interface CertificateParticipant {
  id?: string;
  name: string;
  id_number: string;
  score?: number;
}

export interface CourseTopic {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
}
