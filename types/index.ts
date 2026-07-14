// Global types for OSI system

export interface Empresa {
  id: string;
  razon_social: string;
  rif: string;
  direccion_fiscal: string;
  codigo_cliente: string;
  estado?: 'active' | 'inactive';
}

// Alias for Empresa for consistency
export type Company = Empresa;

export interface Curso {
  id: number;
  nombre: string;
  contenido: string | null;
  horas_estimadas: number | null;
  cliente_asociado: number | null;
  created_at: string | null;
  is_active: boolean;
  nota_aprobatoria: number | null;
  emite_carnet: boolean | null;
  empresas?: {
    razon_social: string;
  } | null;
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
  executive_name?: string
  cliente_nombre_empresa: string | null
  rif: string | null
  tema: string | null
  fecha_emision: Date | null
  fecha_servicio: Date | null
  nro_sesiones: number | null
  fecha_ejecucion1: Date | null
  fecha_ejecucion2: Date | null
  fecha_ejecucion3: Date | null
  fecha_ejecucion4: Date | null
  fecha_ejecucion5: Date | null
  participantes_max: number | null
  detalle_sesion: string | null
  certificado_impreso: boolean | null
  carnet_impreso: boolean | null
  observaciones_adicionales: string | null
  detalle_capacitacion: string | null
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
  direccion_fiscal: string | null
  direccion_envio: string | null
  direccion_ejecucion: string | null
  codigo_cliente: string | null
  contacto_id: number | null
  is_active: boolean
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
  course_content?: string; // Prepopulated course content from OSI
  participants: CertificateParticipant[];
  location: string;
  date: string;
  created_at?: string;
  updated_at?: string;
  horas_estimadas?: number;
  facilitator_id?: string; // ID of selected facilitator (includes signature)
  sha_signature_id?: string; // ID of SHA representative signature (separate from facilitator)
}

export interface CourseTopic {
  id: string;
  name: string;
  description?: string;
  contenido_curso?: string; // Course content from catalogo_servicios
  cliente_asociado?: number; // Client ID associated with this course (number from DB)
  created_at?: string;
  nota_aprobatoria?: number; // Passing grade from cursos table
  horas_estimadas?: number; // Estimated hours from cursos table
}

export interface CertificateParticipant {
  id?: string;
  name: string;
  id_type?: string; // V- for Venezuelan ID, E- for foreign ID
  id_number: string;
  score?: number;
}

export interface Signature {
  id: string;
  name: string;
  type: SignatureType;
  image_url: string;
  created_at: string;
  updated_at: string;
}

export enum SignatureType {
  FACILITADOR = "facilitador",
  REPRESENTANTE_SHA = "representante_sha"
}

export interface Facilitador {
  id: number;
  fuente: string | null;
  ano_ingreso: number | null;
  nombre_apellido: string;
  cedula: string | null;
  rif: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  nivel_tecnico: string | null;
  formacion_docente_certificada: boolean | null;
  tipo_impacto: string | null;
  notas_observaciones: string | null;
  id_estado_base: number | null;
  id_ciudad_base: number | null;
  id_estado_geografico: number | null;
  id_estatus: number | null;
  temas_cursos: string[];
  ficha_tecnica: string | null;
  calificacion: number | null;
  url_curriculum: string | null;
  firma_id: number | null;
  fecha_creacion: string | null;
  fecha_actualizacion: string | null;
}

// Keep the old interface for backward compatibility
export interface Facilitator {
  id: string;
  name: string;
  id_number: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  course_topics: string[]; // Array of course topics they can teach
  technical_knowledge: string; // Text area for technical knowledge
  resume_url?: string; // URL to uploaded resume file
  rating?: number; // Rating for future implementation
  signature_id?: string; // Link to signature if available
  created_at: string;
  updated_at: string;
}

export interface CertificateFormProps {
  certificateData: CertificateGeneration;
  selectedOSI: OSI | null;
  selectedCourseTopic: CourseTopic | null;
  courseTopics: CourseTopic[];
  isGenerating?: boolean;
  onDataChange: (field: keyof CertificateGeneration, value: any) => void;
  onParticipantsChange: (participants: CertificateParticipant[]) => void;
  onGenerate: () => void;
}

export interface LocationSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export interface PlantillaCertificado {
  id: number
  nombre: string
  archivo: string
  created_at: string
  is_active: boolean
}

export interface ParticipantsSectionProps {
  participants: CertificateParticipant[];
  onChange: (participants: CertificateParticipant[]) => void;
  passing_grade?: number;
}

// Capacitación module interfaces
export interface CapacitacionClientProps {
  user: any;
  companies: Company[];
}

export interface GestionCursosClientProps {
  user: any;
  empresas: Empresa[];
  cursos: Curso[] | undefined;
}

// UI component interfaces
export interface ErrorDialogProps {
  isOpen: boolean
  title?: string
  message: string
  details?: string
  onClose: () => void
  variant?: 'error' | 'warning' | 'info'
}

// Utility interfaces
export interface LoadingState {
  isLoading: boolean
  message?: string
}

// OSI Component interfaces
export interface OSIActionButtonsProps {
  isNew: boolean
  isEditing: boolean
  isLoading: boolean
  onSave: () => void
  onCancel: () => void
  onEdit: () => void
  onDelete: () => void
}

export interface OSIFormProps {
  initialData?: OSI
  isNew: boolean
  isEditing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
  onDelete: () => void
  empresas?: Empresa[]
  usuarios?: Usuario[]
  contactos?: Contacto[]
  servicios?: Servicio[]
  filteredEmpresas?: Empresa[]
  cursos?: any[]
  filteredCursos?: any[]
  empresaSearchTerm?: string
  temaSearchTerm?: string
  setEmpresaSearchTerm?: (term: string) => void
  setTemaSearchTerm?: (term: string) => void
  updateFormData?: (field: string, value: any) => void
}

// Common OSI component props
export interface ServiceDetailsProps {
  formData: any
  isEditing: boolean
  isNew: boolean
  updateFormData: (field: string, value: any) => void
}

export interface ExecutionDatesProps {
  formData: any
  isEditing: boolean
  isNew: boolean
  updateFormData: (field: string, value: any) => void
}

export interface CostCalculationProps {
  formData: any
  isEditing: boolean
  isNew: boolean
  updateFormData: (field: string, value: any) => void
}

export interface AdditionalInfoProps {
  formData: any
  isEditing: boolean
  isNew: boolean
  updateFormData: (field: string, value: any) => void
}

export interface OSIEmptyStateProps {
  hasFilters: boolean
  onClearFilters: () => void
  onCreateNew: () => void
}

export interface OSIHeaderProps {
  isNew: boolean
  isEditing: boolean
  isLoading: boolean
  osiNumber: string
  onSave: () => void
  onCancel: () => void
  onEdit: () => void
  onDelete: () => void
}

// Dashboard component interfaces
export interface Department {
  id: string;
  nombre: string;
  color?: string;
}

export interface SidebarProps {
  departamentos: Department[];
}

export interface DashboardClientProps {
  user: any;
}

export interface User {
  user_metadata?: {
    name?: string;
  };
  email?: string;
}

export interface StatCard {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  color: string;
}

export interface ActivityItem {
  id: string;
  type: string;
  description: string;
  time: string;
  user: string;
}

// Certificate Generation Interfaces
export interface CertificateData {
  recipientName: string;
  courseName: string;
  completionDate: string;
  instructorName: string;
  certificateId: string;
}

export interface CertificateTemplateProps {
  data: CertificateData;
  svgBackgroundPath?: string;
}

// UI Component Interfaces
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
}

// Capacitación Component Interfaces
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export interface CreateCourseButtonProps {
  onClick: () => void;
  className?: string;
}

export interface EmpresaSearchProps {
  empresas: Empresa[];
  value: string;
  onChange: (empresaId: string, empresaData: Empresa) => void;
  placeholder?: string;
  disabled?: boolean;
}

export interface CourseActionsProps {
  curso: Curso;
  onEdit: (curso: Curso) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export interface OSISearchProps {
  osis: OSI[]
  selectedOSI: OSI | null
  onSelect: (osi: OSI | null) => void
}

export interface CourseTopicSearchProps {
  courseTopics: CourseTopic[]
  selectedCourseTopic: CourseTopic | null
  onSelect: (courseTopic: CourseTopic) => void
  isAutoPopulated?: boolean
}

// Participant interfaces
export interface ParticipanteCertificado {
  id: number;
  nombre: string;
  cedula: string;
  nacionalidad: 'V-' | 'E-';
}

export interface ParticipantFormData {
  nombre: string;
  cedula: string;
  nacionalidad: 'V-' | 'E-';
}

export interface ParticipantsClientProps {
  user: any;
}
