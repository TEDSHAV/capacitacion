// Global types for OSI system

export interface Empresa {
  id: string;
  razon_social: string;
  rif: string;
  direccion_fiscal: string;
  codigo_cliente: string;
  estado?: "active" | "inactive";
}

// Alias for Empresa for consistency
export type Company = Empresa;

// Document generation types
export interface TemplateParticipant {
  index: number;
  nombre_apellido: string;
  cedula: string;
  puntuacion?: string;
  condicion?: string;
  numero_control: string;
}

export interface TemplateData {
  fecha: string;
  nombre_cliente: string;
  titulo_curso: string;
  ciudad: string;
  dia: string;
  mes: string;
  anio: string;
  nro_osi: string;
  nombre_firmante: string;
  cargo_firmante: string;
  nombre_recibido?: string;
  cargo_recibido?: string;
  localidad?: string;
  localidad_cliente?: string;
  fecha_ejecucion?: string;
  participantes: TemplateParticipant[];
}

export interface DocumentGenerationOptions {
  includeCertificacionCompetencias?: boolean;
  includeNotaEntrega?: boolean;
  includeValidacionDatos?: boolean;
  recibidoData?: {
    nombre: string;
    cargo: string;
  };
}

export interface Curso {
  id: number;
  nombre: string;
  contenido: string | null;
  horas_estimadas: number | null;
  created_at: string | null;
  is_active: boolean;
  nota_aprobatoria: number | null;
  emite_carnet: boolean | null;
  empresas?: { razon_social: string; rif?: string | null } | null;
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
  nivel_educacion: string;
  formacion_docente_certificada: boolean;
  alcance: string;
  notas_observaciones: string;
  id_estado_geografico: number | null;
  id_ciudad: number | null;
  temas_cursos: string[];
  calificacion: number | null;
  firma_id: number | null;
  tiene_curriculum: boolean;
  tiene_certificaciones: boolean;
  tiene_foto_perfil: boolean;
  ano_ingreso: number | null;
}

export interface State {
  id: number;
  nombre_estado: string;
  capital_estado: string | null;
}

export interface City {
  id: number;
  nombre_ciudad: string;
  id_estado: number;
  cat_estados_venezuela?: {
    id: number;
    nombre_estado: string;
  };
}

export interface CourseTopic {
  id: string; // catalogo_servicios.id — used for OSI course matching
  cursos_id?: number | null; // cursos.id — required for FK constraints on certificados & carnets
  nombre: string;
  name: string; // Alias for nombre for compatibility
  description?: string;
  contenido_curso?: string; // Course content from catalogo_servicios
  created_at?: string;
  nota_aprobatoria?: number; // Passing grade from cursos table
  horas_estimadas?: number; // Estimated hours from cursos table
  emite_carnet?: boolean; // Whether course emits card/certificate
  id_plantilla_certificado?: number; // Preferred certificate template for this course
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
  cities: City[];
  loadingStates: boolean;
  loadingCities: boolean;
  onAddCity: (stateId: number, cityName: string) => Promise<void>;
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
  signatureFile: File | null;
  onFileSelect: (
    event: React.ChangeEvent<HTMLInputElement>,
    fileType: "signature",
  ) => void;
}

export interface OSI {
  id: number;
  nro_osi: string;
  nro_orden_compra: string | null;
  tipo_servicio: string | null;
  nro_presupuesto: string | null;
  ejecutivo_negocios: number | null;
  executive_name?: string;
  cliente_nombre_empresa: string | null;
  rif: string | null;
  id_curso: number | null;
  fecha_emision: Date | null;
  nro_sesiones: number | null;
  fecha_ejecucion1: Date | null;
  fecha_ejecucion2: Date | null;
  fecha_ejecucion3: Date | null;
  fecha_ejecucion4: Date | null;
  fecha_ejecucion5: Date | null;
  participantes_max: number | null;
  detalle_sesion: string | null;
  certificado_impreso: boolean | null;
  carnet_impreso: boolean | null;
  observaciones_adicionales: string | null;
  detalle_capacitacion: string | null;
  costo_honorarios: number | null;
  nro_horas: number | null;
  costo_total: number | null;
  costo_impresion_material: number | null;
  costo_traslado: number | null;
  costo_logistica_comida: number | null;
  costo_otros: number | null;
  estado: "pendiente" | "active" | "activo" | "inactive" | "cerrado" | null;
  empresa_id: number | null;
  persona_contacto_id: number | null;
  direccion_fiscal: string | null;
  direccion_envio: string | null;
  direccion_ejecucion: string | null;
  codigo_cliente: string | null;
  contacto_id: number | null;
  is_active: boolean;
  tema?: string | null;
  fecha_servicio?: Date | string | null;
  contacto_email?: string | null;
  contacto_telefono?: string | null;
}

export interface CertificateRequest {
  participant: CertificateParticipant;
  certificateData: CertificateGeneration;
  templateImage: string;
  sealImage?: string;
  controlNumbers?: ControlNumbers;
  isPreview?: boolean;
  certificateId?: number; // Actual certificate database ID for QR code generation
  singlePage?: boolean; // Whether to generate single-page certificate
  preloadedAssets?: {
    facilitator?: any;
    facilitatorSignature?: string;
    shaSignature?: string;
  };
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
  course_template_id?: string; // Course content template ID from plantillas_cursos
  course_content?: string; // Prepopulated course content from OSI or template
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
  id_plantilla_carnet?: number; // Carne template ID
  plantilla_certificado_archivo?: string; // Certificate template file name for generation
  generate_documents?: boolean; // Whether to generate additional documents
}

export interface CertificateParticipant {
  id?: string;
  name: string;
  idType?: string; // V- for Venezuelan ID, E- for foreign ID
  idNumber: string;
  company?: string;
  score?: number;
  position?: string;
  email?: string;
  phone?: string;
  nationality?: "venezolano" | "extranjero";
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
  REPRESENTANTE_SHA = "representante_sha",
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
  firmas?: {
    id: number;
    nombre: string;
    url_imagen: string;
    tipo: string;
    is_active: boolean;
  } | null;
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
  isEditMode?: boolean;
  generationProgress?: {
    currentPhase: string;
    percentage: number;
    currentCertificate: number;
    totalCertificates: number;
  };
  onDataChange: (field: keyof CertificateGeneration, value: any) => void;
  onParticipantsChange: (participants: CertificateParticipant[]) => void;
  onGenerate: () => void;
}

export interface LocationSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export interface PlantillaCertificado {
  id: number;
  nombre: string;
  archivo: string;
  url_imagen?: string;
  created_at: string;
  updated_at?: string;
  is_active: boolean;
}

export interface PlantillaCarnet {
  id: number;
  nombre: string;
  archivo: string;
  url_imagen?: string;
  tipo?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ParticipantsSectionProps {
  participants: CertificateParticipant[];
  onChange: (participants: CertificateParticipant[]) => void;
  passing_grade?: number;
  isEditMode?: boolean;
}

// Capacitación module interfaces
export interface DashboardStats {
  cursosActivos: number;
  participantes: number;
  certificados: number;
  facilitadores: number;
  certificadosMes: number;
}

export interface CapacitacionClientProps {
  user: any;
  companies: Company[];
  stats?: DashboardStats;
}

export interface GestionCursosClientProps {
  user: any;
  empresas: Empresa[];
  cursos: Curso[] | undefined;
}

// UI component interfaces
export interface ErrorDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  details?: string;
  onClose: () => void;
  variant?: "error" | "warning" | "info";
}

// Utility interfaces
export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

// OSI Component interfaces
export interface OSIActionButtonsProps {
  isNew: boolean;
  isEditing: boolean;
  isLoading: boolean;
  onSave: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export interface OSIFormProps {
  initialData?: OSI;
  isNew: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onDelete: () => void;
  empresas?: Empresa[];
  usuarios?: Usuario[];
  contactos?: Contacto[];
  servicios?: Servicio[];
  filteredEmpresas?: Empresa[];
  cursos?: any[];
  filteredCursos?: any[];
  empresaSearchTerm?: string;
  temaSearchTerm?: string;
  setEmpresaSearchTerm?: (term: string) => void;
  setTemaSearchTerm?: (term: string) => void;
  updateFormData?: (field: string, value: any) => void;
}

// Common OSI component props
export interface ServiceDetailsProps {
  formData: any;
  isEditing: boolean;
  isNew: boolean;
  updateFormData: (field: string, value: any) => void;
}

export interface ExecutionDatesProps {
  formData: any;
  isEditing: boolean;
  isNew: boolean;
  updateFormData: (field: string, value: any) => void;
}

export interface CostCalculationProps {
  formData: any;
  isEditing: boolean;
  isNew: boolean;
  updateFormData: (field: string, value: any) => void;
}

export interface AdditionalInfoProps {
  formData: any;
  isEditing: boolean;
  isNew: boolean;
  updateFormData: (field: string, value: any) => void;
}

export interface OSIEmptyStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
  onCreateNew: () => void;
}

export interface OSIHeaderProps {
  isNew: boolean;
  isEditing: boolean;
  isLoading: boolean;
  osiNumber: string;
  onSave: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onDelete: () => void;
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

// Simplified OSI type for certificate generation (sourced from v_osi_formato_completo)
export interface CertificateOSI {
  id: string;
  nro_osi: string;
  tipo_servicio: string;
  nro_presupuesto?: number | null;
  ejecutivo_negocios?: string | null; // Full name from view (ejecutivo.nombre_apellido)
  cliente_nombre_empresa: string;
  id_curso: number | null; // Not in ECC chain; populated via name match fallback
  id_servicio?: number | null; // catalogo_servicios.id from the view
  fecha_servicio?: string;
  empresa_id: number;
  direccion_fiscal?: string;
  direccion_envio?: string;
  direccion_ejecucion?: string;
  nro_sesiones?: number | null;
  fecha_ejecucion1?: string;
  fecha_ejecucion2?: string;
  fecha_emision?: string;
  nro_horas?: number | null;
  id_estado?: number | null;
  id_facilitador?: number | null; // Facilitator ID for certificate generation
  detalle_capacitacion?: string;
  detalle_sesion?: string;
  codigo_cliente?: number | null;
  is_active: boolean;
  curso_nombre?: string; // Mapped from v_osi_formato_completo.servicio (catalogo_servicios.nombre)
  tema?: string | null;
  has_certificates?: boolean;
}

export interface CertificateTemplateProps {
  data: CertificateData;
  svgBackgroundPath?: string;
}

// UI Component Interfaces
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "outline"
    | "secondary"
    | "destructive"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
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
  osis: CertificateOSI[];
  selectedOSI: CertificateOSI | null;
  onSelect: (osi: CertificateOSI | null) => void;
  allCourses?: CourseTopic[];
  disabled?: boolean;
}

export interface CourseTopicSearchProps {
  courseTopics: CourseTopic[];
  selectedCourseTopic: CourseTopic | null;
  onSelect: (courseTopic: CourseTopic) => void;
  isAutoPopulated?: boolean;
}

// Participant interfaces
export interface ParticipanteCertificado {
  id: number;
  nombre: string;
  cedula: string;
  nacionalidad: "venezolano" | "extranjero";
}

export interface ParticipantFormData {
  nombre: string;
  cedula: string;
  nacionalidad: "venezolano" | "extranjero";
}

export interface ParticipantsClientProps {
  user: any;
}

// Reportes interfaces
export interface ReportesClientProps {
  user: any;
  states: State[];
  courses?: CourseTopic[];
}

export interface FacilitadorStateStatsProps {
  selectedState: string;
  selectedCourse?: string;
}

export interface FacilitadorHoursStatsProps {
  selectedState: string;
  selectedCourse?: string;
}

export interface CourseStatsProps {
  selectedState?: string;
  selectedCourse?: string;
}

export interface CourseStat {
  id: string;
  nombre: string;
  totalHours: number;
  totalCertificates: number;
  facilitadores: CourseFacilitator[];
  isActive: boolean;
}

export interface CourseFacilitator {
  id: number;
  nombre_apellido: string;
  totalHours: number;
  totalCertificates: number;
  estado_nombre: string;
  is_active: boolean;
  certificates: CertificateInfo[];
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
  id_estado_geografico: number | null;
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
    osis: OSI[];
    filteredOsis: OSI[];
    totalCount: number;
    loading: boolean;
    searchTerm: string;
    selectedMonth: string;
    selectedStatus: string;
    selectedLocation: string;
    recentFilter: string;
    currentPage: number;
    itemsPerPage: number;
    setSearchTerm: (value: string) => void;
    setSelectedMonth: (value: string) => void;
    setSelectedStatus: (value: string) => void;
    setSelectedLocation: (value: string) => void;
    setRecentFilter: (value: string) => void;
    setCurrentPage: (value: number) => void;
    setItemsPerPage: (value: number) => void;
    clearAllFilters: () => void;
    hasActiveFilters: boolean;
    monthOptions: { value: string; label: string }[];
  }) => React.ReactNode;
}

export interface OptimizedOSITableProps {
  osis: OSI[];
  onOSIClick: (osi: OSI) => void;
  getStatusColor: (status: string) => string;
}

export interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string;
  threshold?: number;
  rootMargin?: string;
}

export interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
}

export interface DebouncedInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  delay?: number;
  className?: string;
  type?: string;
}

// OSI Management Types
export interface OSIFilters {
  monthIssued?: string;
  companyName?: string;
  nroOsi?: string;
  tipoServicio?: string;
  status?: string;
  dateServiceFrom?: string;
  dateServiceTo?: string;
  dateIssuedFrom?: string;
  dateIssuedTo?: string;
  numParticipantsMin?: number;
  numParticipantsMax?: number;
  numSesionesMin?: number;
  numSesionesMax?: number;
  numHoursMin?: number;
  numHoursMax?: number;
  location?: string;
  ejecutivo?: string;
}

export interface OSIManagement {
  id_osi: number;
  nro_osi: string;
  nombre_empresa: string;
  id_empresa: number;
  id_servicio: number;
  servicio: string;
  tipo_servicio: string;
  ejecutivo_negocios: string;
  fecha_inicio_real: string;
  fecha_fin_real: string;
  fecha_emision: string;
  horas_academicas_ejecucion: number;
  sesiones_ejecucion: number;
  direccion_ejecucion: string;
  contenido_servicio: string;
  codigo_cliente: number;
  nro_presupuesto: number;
  id_estatus: number;
  observaciones_totales?: string | null;
  // Cost fields (capacitacion department only)
  costo_honorarios_instructor?: number | null;
  costo_traslado?: number | null;
  costo_impresion_material?: number | null;
  costo_logistica_comida?: number | null;
  costo_otros?: number | null;
  // Computed fields
  status_name?: string;
  status_color?: string;
  status_order?: number;
  num_participants?: number;
}

export interface OSISearchResult {
  osis: OSIManagement[];
  totalCount: number;
  metrics?: {
    total_hours: number;
    total_sesiones: number;
    unique_companies: number;
  };
}

export interface OSIMetrics {
  total_osis: number;
  by_status: { status: string; count: number }[];
  by_company: { company: string; count: number }[];
  by_month: { month: string; count: number }[];
}

export interface OSIStatus {
  id: number;
  nombre_estado: string;
  color_hex: string;
  orden: number;
  es_estado_final: boolean;
}

export interface OSILifecycleProps {
  currentStatusId: number;
  statuses: OSIStatus[];
  compact?: boolean;
}

export interface UseOptimizedFetchOptions<T> {
  initialData?: T;
  cacheTime?: number;
  retryCount?: number;
  retryDelay?: number;
}

export interface UseOptimizedFetchReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// Loading Spinner Component Interface
export interface LoadingSpinnerProps {
  message?: string;
  color?: "blue" | "purple" | "indigo" | "green" | "red";
  size?: "sm" | "md" | "lg";
  className?: string;
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

// Certificate Management Interfaces
export interface CertificateManagement {
  id: number;
  calificacion: number;
  created_at: string | null;
  fecha_emision: string | null;
  fecha_vencimiento: string | null;
  id_curso: number | null;
  id_empresa: number | null;
  id_estado: number | null;
  id_facilitador: number | null;
  id_participante: number | null;
  id_plantilla_certificado: number | null;
  is_active: boolean;
  nro_control: number;
  nro_hoja: number | null;
  nro_libro: number | null;
  nro_linea: number | null;
  nro_osi: number | null;
  qr_code: string | null;
  snapshot_contenido: string | null;
  // Joined fields
  participantes_certificados?: {
    id: number;
    nombre: string;
    cedula: string;
    nacionalidad: string;
  };
  cursos?: {
    id: number;
    nombre: string;
    contenido: string | null;
    horas_estimadas: number | null;
    nota_aprobatoria: number | null;
    emite_carnet: boolean | null;
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
  cat_estados_venezuela?: {
    id: number;
    nombre_estado: string;
  };
}

export interface CertificateMetrics {
  totalCertificates: number;
  activeCertificates: number;
  expiredCertificates: number;
  certificatesThisMonth: number;
  certificatesThisYear: number;
  totalCompanies: number;
  totalCourses: number;
  totalParticipants: number;
  averageScore: number;
  certificatesByCompany: Array<{
    companyId: number;
    companyName: string;
    count: number;
  }>;
  certificatesByCourse: Array<{
    courseId: number;
    courseName: string;
    count: number;
  }>;
  certificatesByMonth: Array<{
    month: string;
    count: number;
  }>;
}

export interface CertificateFilters {
  searchTerm?: string;
  companyId?: number;
  courseId?: number;
  facilitatorId?: number;
  stateId?: number;
  dateFrom?: string;
  dateTo?: string;
  isActive?: boolean;
  hasExpirationDate?: boolean;
}

export interface CertificateSearchResult {
  certificates: CertificateManagement[];
  totalCount: number;
  metrics: CertificateMetrics;
}

// Carnet System Types
export interface Carnet {
  id: number;
  id_certificado: number | null;
  id_participante: number | null; // Back to number since we use proper sequential IDs
  id_empresa: number | null;
  id_curso: number | null;
  id_osi: number | null;
  titulo_curso: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  nombre_participante: string;
  cedula_participante: string;
  empresa_participante: string | null;
  qr_code: string | null;
  snapshot_contenido: string | null;
  created_at: string;
  is_active: boolean;

  // Relationship data for comprehensive tracking
  certificado?: CertificateManagement;
  participante?: CertificateParticipant;
  empresa?: Empresa;
  curso?: Curso;
  osi?: CertificateOSI;
}

export interface CarnetRequest {
  participant: CertificateParticipant;
  carnetData: CarnetGeneration;
  templateImage: string;
  isPreview?: boolean;
  carnetId?: number;
  qrDataURL?: string; // QR code data URL from certificate
}

export interface CarnetGeneration {
  id_certificado: number;
  id_participante: number; // Back to number since we use proper sequential IDs
  id_empresa: number | null;
  id_curso: number | null;
  id_osi: number | null;
  titulo_curso: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  nombre_participante: string;
  cedula_participante: string;
  empresa_participante: string | null;
  nro_control: number;
  qr_code?: string;
  snapshot_contenido?: string;
  id_plantilla_carnet?: number; // Carne template ID used
}

export interface CarnetRelationships {
  certificates: CertificateManagement[];
  carnets: Carnet[];
  osi: CertificateOSI;
  participants: CertificateParticipant[];
  companies: Empresa[];
  courses: Curso[];
}

export interface CarnetFilters {
  searchTerm?: string;
  companyId?: number;
  courseId?: number;
  osiId?: number;
  participantId?: number;
  dateFrom?: string;
  dateTo?: string;
  isActive?: boolean;
  hasExpirationDate?: boolean;
}

export interface CarnetSearchResult {
  carnets: Carnet[];
  totalCount: number;
  relationships?: CarnetRelationships;
}

// OCR Types for Participant Scanning
export interface ExtractedParticipant {
  name: string;
  idNumber: string;
  nationality?: "venezolano" | "extranjero";
  score?: number;
  confidence?: number;
}

// ─── Comprehensive Reportes Module Types ───────────────────────────────────

export interface MonthlyTrendPoint {
  key: string;
  label: string;
  count: number;
}

export interface OverviewMetrics {
  totalCertificates: number;
  activeCertificates: number;
  certificatesThisMonth: number;
  certificatesThisYear: number;
  averageScore: number;
  totalHoursDelivered: number;
  uniqueParticipants: number;
  uniqueFacilitators: number;
  uniqueCourses: number;
  uniqueCompanies: number;
  topCourses: Array<{ name: string; count: number; avgScore: number }>;
  topCompanies: Array<{ name: string; count: number }>;
  monthlyTrend: MonthlyTrendPoint[];
}

export interface CursoReportItem {
  id: number;
  nombre: string;
  totalCertificates: number;
  avgScore: number;
  totalHours: number;
  facilitadoresCount: number;
  facilitadores: Array<{ id: number; nombre: string; certs: number }>;
  lastActivity: string | null;
}

export interface FacilitadorReportItem {
  id: number;
  nombre_apellido: string;
  is_active: boolean;
  estado_nombre: string;
  cedula: string | null;
  email: string | null;
  totalCerts: number;
  totalHours: number;
  uniqueCourses: number;
  avgScore: number;
  lastActivity: string | null;
}

export interface FacilitadoresReportData {
  facilitadores: FacilitadorReportItem[];
  stateStats: Array<{ nombre: string; count: number }>;
}

export interface EmpresaReportItem {
  id: number;
  razon_social: string;
  rif: string;
  totalCerts: number;
  uniqueParticipants: number;
  uniqueCourses: number;
  lastActivity: string | null;
  firstActivity: string | null;
}

export interface TendenciasData {
  monthlyData: Array<{
    key: string;
    label: string;
    year: number;
    month: number;
    count: number;
  }>;
  yearlyTotals: Array<{ year: number; count: number }>;
  stateDistribution: Array<{ nombre: string; count: number }>;
}
