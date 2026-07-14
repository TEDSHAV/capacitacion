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
}

// Facilitator Search Component Types
export interface FacilitatorSearchProps {
  selectedFacilitatorId?: string;
  onFacilitatorChange: (id: string) => void;
  placeholder?: string;
}

export interface FacilitatorOption {
  id: string;
  nombre_apellido: string;
  direccion?: string;
  temas_cursos?: string[];
}

export interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: FacilitatorOption[];
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

// Facilitator Form Types
export interface FacilitadorFormData {
  fuente: string;
  fecha_ingreso: string;
  nombre_apellido: string;
  cedula: string;
  rif: string;
  email: string;
  telefono: string;
  direccion: string;
  nivel_tecnico: string;
  formacion_docente_certificada: boolean;
  alcance: string;
  notas_observaciones: string;
  id_estado_base: number | null;
  id_ciudad_base: number | null;
  id_estado_geografico: number | null;
  id_estatus: number | null;
  temas_cursos: string[];
  ficha_tecnica: string;
  calificacion: number | null;
  url_curriculum: string;
  firma_id: number | null;
  tiene_curriculum: boolean;
  tiene_certificaciones: boolean;
  tiene_foto_perfil: boolean;
}

export interface State {
  id: number;
  nombre_estado: string;
  capital_estado: string | null;
}

export interface CourseTopic {
  id: string;
  nombre: string;
  name: string; // Alias for nombre for compatibility
  description?: string;
  contenido_curso?: string; // Course content from catalogo_servicios
  cliente_asociado?: number; // Client ID associated with this course (number from DB)
  created_at?: string;
  nota_aprobatoria?: number; // Passing grade from cursos table
  horas_estimadas?: number; // Estimated hours from cursos table
  emite_carnet?: boolean; // Whether course emits card/certificate
}

export interface PersonalInfoSectionProps {
  formData: FacilitadorFormData;
  handleInputChange: (field: keyof FacilitadorFormData, value: any) => void;
}

export interface ProfessionalInfoSectionProps {
  formData: FacilitadorFormData;
  handleInputChange: (field: keyof FacilitadorFormData, value: any) => void;
  states: State[];
  loadingStates: boolean;
}

export interface LocationSectionProps {
  formData: FacilitadorFormData;
  handleInputChange: (field: keyof FacilitadorFormData, value: any) => void;
  states: State[];
  loadingStates: boolean;
}

export interface CourseTopicsSectionProps {
  formData: FacilitadorFormData;
  handleInputChange: (field: keyof FacilitadorFormData, value: any) => void;
  courseTopics: CourseTopic[];
  loadingCourseTopics: boolean;
}

export interface AdditionalInfoSectionProps {
  formData: FacilitadorFormData;
  handleInputChange: (field: keyof FacilitadorFormData, value: any) => void;
}

export interface FileUploadSectionProps {
  resumeFile: File | null;
  signatureFile: File | null;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>, fileType: "resume" | "signature") => void;
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
  id_curso: number | null
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

export interface CertificateRequest {
  participant: CertificateParticipant;
  certificateData: CertificateGeneration;
  templateImage: string;
  sealImage?: string;
  controlNumbers?: ControlNumbers;
  isPreview?: boolean;
  certificateId?: number; // Actual certificate database ID for QR code generation
}

export interface ControlNumbers {
  nro_libro: number;
  nro_hoja: number;
  nro_linea: number;
  nro_control: number;
}

export interface CertificateGeneration {
  id?: string;
  osi_id: string;
  osi_data?: CertificateOSI;
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
  horas_estimadas?: number;
  facilitator_id?: string; // ID of selected facilitator (includes signature)
  facilitator_data?: any; // Full facilitator data
  sha_signature_id?: string; // ID of SHA representative signature (separate from facilitator)
  sha_signature_data?: any; // Full SHA signature data
  fecha_vencimiento?: string; // Certificate expiration date
  id_estado?: number; // Venezuelan state ID for certificate record
  id_plantilla_certificado?: number; // Certificate template ID
}

export interface CertificateParticipant {
  id?: string;
  name: string;
  id_type?: string; // V- for Venezuelan ID, E- for foreign ID
  id_number: string;
  nacionalidad?: 'venezolano' | 'extranjero'; // Nationality: venezolano or extranjero
  score?: number;
}

export interface Signature {
  id: number;
  nombre: string;
  tipo: string;
  url_imagen: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
  is_active: boolean;
}

export enum SignatureType {
  FACILITADOR = "facilitador",
  REPRESENTANTE_SHA = "representante_sha"
}

export interface Facilitador {
  id: number;
  fuente: string | null;
  fecha_ingreso: string | null;
  nombre_apellido: string;
  cedula: string | null;
  rif: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  nivel_tecnico: string | null;
  formacion_docente_certificada: boolean | null;
  alcance: string | null;
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
  is_active: boolean;
  tiene_curriculum: boolean | null;
  tiene_certificaciones: boolean | null;
  tiene_foto_perfil: boolean | null;
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
  selectedOSI: CertificateOSI | null;
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

// Simplified OSI type for certificate generation
export interface CertificateOSI {
  id: string;
  nro_osi: string;
  nro_orden_compra?: string;
  tipo_servicio: string;
  nro_presupuesto?: string;
  ejecutivo_negocios: number;
  cliente_nombre_empresa: string;
  tema?: string;
  id_curso: number | null;
  fecha_servicio?: string;
  empresa_id: number;
  direccion_fiscal?: string;
  direccion_envio?: string;
  direccion_ejecucion?: string;
  nro_sesiones?: number;
  fecha_ejecucion1?: string;
  fecha_ejecucion2?: string;
  fecha_emision?: string;
  nro_horas?: number;
  costo_total?: number;
  detalle_capacitacion?: string;
  detalle_sesion?: string;
  codigo_cliente?: number;
  is_active: boolean;
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
  osis: CertificateOSI[]
  selectedOSI: CertificateOSI | null
  onSelect: (osi: CertificateOSI | null) => void
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
  nacionalidad: 'venezolano' | 'extranjero';
}

export interface ParticipantFormData {
  nombre: string;
  cedula: string;
  nacionalidad: 'venezolano' | 'extranjero';
}

export interface ParticipantsClientProps {
  user: any;
}

// Reportes interfaces
export interface ReportesClientProps {
  user: any;
  states: State[];
}

export interface FacilitadorStateStatsProps {
  selectedState: string;
}

export interface FacilitadorHoursStatsProps {
  selectedState: string;
}

export interface StateStat {
  id: number;
  nombre_estado: string;
  count: number;
}

export interface FacilitadorReport {
  id: number;
  nombre_apellido: string;
  cedula: string | null;
  email: string | null;
  telefono: string | null;
  is_active: boolean;
  id_estatus: number | null;
  id_estado_base: number | null;
  id_estado_geografico: number | null;
  estado_base_nombre: string;
  estado_geografico_nombre: string;
}

export interface CertificateInfo {
  nro_osi: number;
  course_name: string;
  hours: number;
}

export interface FacilitadorHoursStat {
  facilitatorId: number;
  nombre_apellido: string;
  is_active: boolean;
  estado_nombre: string;
  estatus_nombre: string;
  totalHours: number;
  totalCertificates: number;
  osiHours: number;
  totalCombinedHours: number;
  certificates: CertificateInfo[];
}

// Performance Optimization Interfaces
export interface OptimizedDataProviderProps {
  children: (props: {
    osis: OSI[]
    filteredOsis: OSI[]
    totalCount: number
    loading: boolean
    searchTerm: string
    selectedMonth: string
    selectedStatus: string
    selectedLocation: string
    recentFilter: string
    currentPage: number
    itemsPerPage: number
    setSearchTerm: (value: string) => void
    setSelectedMonth: (value: string) => void
    setSelectedStatus: (value: string) => void
    setSelectedLocation: (value: string) => void
    setRecentFilter: (value: string) => void
    setCurrentPage: (value: number) => void
    setItemsPerPage: (value: number) => void
    clearAllFilters: () => void
    hasActiveFilters: boolean
    monthOptions: { value: string; label: string }[]
  }) => React.ReactNode
}

export interface OptimizedOSITableProps {
  osis: OSI[]
  onOSIClick: (osi: OSI) => void
  getStatusColor: (status: string) => string
}

export interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string
  threshold?: number
  rootMargin?: string
}

export interface VirtualizedListProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  overscan?: number
  className?: string
}

export interface DebouncedInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  delay?: number
  className?: string
  type?: string
}

export interface UseOptimizedFetchOptions<T> {
  initialData?: T
  cacheTime?: number
  retryCount?: number
  retryDelay?: number
}

export interface UseOptimizedFetchReturn<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

// Loading Spinner Component Interface
export interface LoadingSpinnerProps {
  message?: string
  color?: 'blue' | 'purple' | 'indigo' | 'green' | 'red'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

// Participant Lookup Interfaces
export interface ParticipantLookup {
  id: number;
  nombre: string;
  cedula: string;
  nacionalidad: string;
  total_records?: number; // Number of participant records with same ID
}

export interface ParticipantCertificate {
  id: number;
  fecha_emision: string;
  fecha_vencimiento?: string;
  calificacion?: number;
  qr_code?: string;
  nro_libro: number;
  nro_hoja: number;
  nro_linea: number;
  nro_control: number;
  cursos?: {
    id: number;
    nombre: string;
    horas_estimadas?: number;
  };
  empresas?: {
    id: number;
    razon_social: string;
    rif: string;
  };
  facilitadores?: {
    id: number;
    nombre_apellido: string;
  };
  parsed_snapshot?: any;
}

export interface ParticipantStatistics {
  totalCertificates: number;
  totalHours: number;
  averageScore: number;
  uniqueCompaniesCount: number;
  uniqueCoursesCount: number;
  uniqueCompanies: string[];
  uniqueCourses: string[];
}

export interface ParticipantLookupResponse {
  participant: ParticipantLookup;
  certificates: ParticipantCertificate[];
  statistics: ParticipantStatistics;
}
