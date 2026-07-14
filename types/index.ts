// Global types for OSI system

// SENIAT Verification Types
export type SeniatVerificationStatus =
  | "pending"
  | "verified"
  | "not_found"
  | "error";

export interface ParticipantVerificationResult {
  rif: string;
  ocrName: string;
  seniatName?: string;
  status: SeniatVerificationStatus;
  error?: string;
}

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
  nacionalidad?: "venezolano" | "extranjero";
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
  contenido_curso: string | null;
  carga_horaria_std: number | null;
  created_at: string | null;
  esta_activo: boolean;
  nota_aprobatoria: number | null;
  emite_carnet: boolean | null;
  subtitulo: string | null;
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
  // Banking information
  banco: string;
  nro_cuenta: string;
  tipo_cuenta: "Ahorros" | "Corriente" | "";
  telefono_pago_movil: string;
  cedula_titular: string;
}

export interface Bank {
  id: number;
  nombre: string;
  codigo: string | null;
  is_active: boolean;
}

export interface BankDetailsSectionProps {
  formData: FacilitadorFormData;
  handleInputChange: (
    field: keyof FacilitadorFormData,
    value: FacilitadorFormData[keyof FacilitadorFormData],
  ) => void;
  banks: Bank[];
  loadingBanks: boolean;
  onAddBank: (bankName: string) => Promise<void>;
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
  nombre: string;
  name: string; // Alias for nombre for compatibility
  description?: string;
  contenido_curso?: string; // Course content from catalogo_servicios
  created_at?: string;
  nota_aprobatoria?: number; // Passing grade from catalogo_servicios
  horas_estimadas?: number; // Estimated hours from catalogo_servicios
  emite_carnet?: boolean; // Whether course emits card/certificate from catalogo_servicios
  subtitulo?: string; // Subtitle from catalogo_servicios
  id_plantilla_certificado?: number; // Preferred certificate template for this course
}

export interface PersonalInfoSectionProps {
  formData: FacilitadorFormData;
  handleInputChange: (
    field: keyof FacilitadorFormData,
    value: FacilitadorFormData[keyof FacilitadorFormData],
  ) => void;
}

export interface ProfessionalInfoSectionProps {
  formData: FacilitadorFormData;
  handleInputChange: (
    field: keyof FacilitadorFormData,
    value: FacilitadorFormData[keyof FacilitadorFormData],
  ) => void;
  states: State[];
  loadingStates: boolean;
}

export interface LocationSectionProps {
  formData: FacilitadorFormData;
  handleInputChange: (
    field: keyof FacilitadorFormData,
    value: FacilitadorFormData[keyof FacilitadorFormData],
  ) => void;
  states: State[];
  cities: City[];
  loadingStates: boolean;
  loadingCities: boolean;
  onAddCity: (stateId: number, cityName: string) => Promise<void>;
}

export interface CourseTopicsSectionProps {
  formData: FacilitadorFormData;
  handleInputChange: (
    field: keyof FacilitadorFormData,
    value: FacilitadorFormData[keyof FacilitadorFormData],
  ) => void;
  courseTopics: CourseTopic[];
  loadingCourseTopics: boolean;
}

export interface AdditionalInfoSectionProps {
  formData: FacilitadorFormData;
  handleInputChange: (
    field: keyof FacilitadorFormData,
    value: FacilitadorFormData[keyof FacilitadorFormData],
  ) => void;
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

export type PaperSize = "letter" | "half-letter-custom";

export interface CertificateRequest {
  participant: CertificateParticipant;
  certificateData: CertificateGeneration;
  templateImage: string;
  sealImage?: string;
  controlNumbers?: ControlNumbers;
  isPreview?: boolean;
  certificateId?: number; // Actual certificate database ID for QR code generation
  singlePage?: boolean; // Whether to generate single-page certificate
  paperSize?: PaperSize; // Preference for paper size
  skipQR?: boolean; // Option to skip QR code generation/rendering
  preloadedAssets?: {
    facilitator?: Facilitador;
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
  facilitator_data?: Facilitador; // Full facilitator data
  sha_signature_id?: string; // ID of SHA representative signature (separate from facilitator)
  sha_signature_data?: Signature; // Full SHA signature data
  fecha_vencimiento?: string; // Certificate expiration date
  id_estado?: number; // Venezuelan state ID for certificate record
  id_plantilla_certificado?: number; // Certificate template ID
  id_plantilla_carnet?: number; // Carne template ID
  plantilla_certificado_archivo?: string; // Certificate template file name for generation
  generate_documents?: boolean; // Whether to generate additional documents
  include_previous_participants?: boolean; // Whether to include historical participants in additional documents
  paperSize?: PaperSize; // Preferred paper size for printing
  manual_mode?: boolean; // Whether using manual OSI input mode
  manual_osi_data?: ManualOSIInput; // Manual OSI input data when in manual mode
  is_custom?: boolean; // Whether this is a custom-generated certificate (affects seal, SHA label, duration prefix)
  id_sede?: number | null; // Sede ID for certificate record (from OSI or manual selection)
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
  seniatVerification?: ParticipantVerificationResult;
  dbId?: number;
  dbOriginalName?: string;
  dbOriginalIdNumber?: string;
}

export interface Signature {
  id: number;
  nombre: string;
  tipo: string;
  url_imagen?: string; // Legacy field, kept for backward compatibility
  imagen_base64?: string; // New field for base64 storage
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
  // Banking information
  banco?: string;
  nro_cuenta?: string;
  tipo_cuenta?: string;
  telefono_pago_movil?: string;
  cedula_titular?: string;
  firmas?: {
    id: number;
    nombre: string;
    url_imagen?: string; // Legacy field, kept for backward compatibility
    imagen_base64?: string; // New field for base64 storage
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
  onDataChange: (
    field: keyof CertificateGeneration,
    value: CertificateGeneration[keyof CertificateGeneration],
  ) => void;
  onParticipantsChange: (participants: CertificateParticipant[]) => void;
  onGenerate: () => void;
  onPreview?: () => Promise<boolean>;
}

export interface LocationSearchProps {
  value: string;
  onChange: (value: string) => void;
  highlight?: boolean;
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
  osiId?: number;
  facilitadorId?: number;
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
  user: User;
  stats?: DashboardStats;
}

export interface GestionCursosClientProps {
  user: User;
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
  cursos?: Curso[];
  filteredCursos?: Curso[];
  empresaSearchTerm?: string;
  temaSearchTerm?: string;
  setEmpresaSearchTerm?: (term: string) => void;
  setTemaSearchTerm?: (term: string) => void;
  updateFormData?: (field: string, value: unknown) => void;
}

// Common OSI component props
export interface ServiceDetailsProps {
  formData: Record<string, unknown>;
  isEditing: boolean;
  isNew: boolean;
  updateFormData: (field: string, value: unknown) => void;
}

export interface ExecutionDatesProps {
  formData: Record<string, unknown>;
  isEditing: boolean;
  isNew: boolean;
  updateFormData: (field: string, value: unknown) => void;
}

export interface CostCalculationProps {
  formData: Record<string, unknown>;
  isEditing: boolean;
  isNew: boolean;
  updateFormData: (field: string, value: unknown) => void;
}

export interface AdditionalInfoProps {
  formData: Record<string, unknown>;
  isEditing: boolean;
  isNew: boolean;
  updateFormData: (field: string, value: unknown) => void;
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
  user: User;
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
  id_ciudad?: number | null;
  id_sede?: number | null; // Sede ID from empresa_sedes (via v_osi_formato_completo.id_sede)
  sede?: string | null; // Sede name from v_osi_formato_completo.sede
  id_facilitador?: number | null; // Facilitator ID for certificate generation
  detalle_capacitacion?: string;
  detalle_sesion?: string;
  codigo_cliente?: number | null;
  is_active: boolean;
  curso_nombre?: string; // Mapped from v_osi_formato_completo.servicio (catalogo_servicios.nombre)
  tema?: string | null;
  has_certificates?: boolean;
}

// Manual OSI input type for certificate generation without database OSI record
export interface ManualOSIInput {
  osi_number?: string; // Manual OSI number (no validation)
  company_id?: string; // Selected from empresas dropdown (string because Empresa.id is string)
  company_name?: string; // Manual company name input
  city_id?: number; // Selected from cat_ciudades dropdown (used for document generation)
  sede_id?: number; // Selected from empresa_sedes dropdown (optional, for portal filtering)
  sede_nombre?: string; // Sede name for display/snapshot
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
  user: User;
}

// Reportes interfaces
export interface ReportesClientProps {
  user: User;
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
  // Missing fields for complete format
  cliente_rif?: string | null;
  direccion_fiscal?: string | null;
  direccion_envio?: string | null;
  persona_contacto?: string | null;
  contacto_telefono?: string | null;
  contacto_email?: string | null;
  participantes_ejecucion?: number | null;
  horas_honorarios_instructor?: number | null;
  tarifa_hora_honorarios?: number | null;
  costo_hospedaje?: number | null;
  dias_hospedaje_facilitador?: number | null;
  dias_logistica_facilitador?: number | null;
  pretensiones_totales?: string | null;
  certificado_impreso?: boolean | null;
  carnet_impreso?: boolean | null;
  pop_incluido?: boolean | null;
  traslado_externo?: number | null;
  sesiones_programadas?: unknown[] | null;
  // Computed fields
  status_name?: string;
  status_color?: string;
  status_order?: number;
  num_participants?: number;
  is_manual_batch?: boolean;
  has_acknowledgment?: boolean;
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

export interface OSIAttachment {
  id: string;
  osi_id: number;
  facilitador_id: number | null;
  storage_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
  updated_at: string;
  publicUrl?: string;
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
  parsed_snapshot?: Record<string, unknown>;
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

export interface BatchUpdateData {
  certificate_title?: string;
  certificate_subtitle?: string;
  date?: string;
  fecha_vencimiento?: string;
  location?: string;
  horas_estimadas?: string;
  id_facilitador?: string;
}

export interface BatchUpdateResult {
  success: boolean;
  message: string;
  updatedCount: number;
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
  id_plantilla_carnet: number | null;
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
  catalogo_servicios?: {
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
  subtitulo_curso?: string | null;
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

// Control Sequence Configuration Types
export interface ControlSequenceConfig {
  id: string;
  nro_libro: number;
  nro_hoja: number;
  nro_linea: number;
  nro_control: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  notes?: string;
}

export interface ControlSequenceFormData {
  nro_libro: number;
  nro_hoja: number;
  nro_linea: number;
  nro_control: number;
  notes?: string;
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
  subtitulo_curso?: string | null;
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
  courseCount: number;
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
  totalCoursesTaught: number;
  topCourses: Array<{ name: string; count: number; avgScore: number; courseCount: number }>;
  topCompanies: Array<{ name: string; count: number; courseCount: number }>;
  monthlyTrend: MonthlyTrendPoint[];
  // Carnets metrics
  totalCarnets: number;
  activeCarnets: number;
  expiringSoonCarnets: number;
  expiredCarnets: number;
  carnetsThisMonth: number;
}

export interface CursoReportItem {
  id: number;
  nombre: string;
  totalCertificates: number;
  avgScore: number;
  totalHours: number;
  facilitadoresCount: number;
  facilitadores: Array<{ id: number; nombre: string; certs: number; courseCount: number }>;
  lastActivity: string | null;
  courseCount: number;
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
  courseNames: string[];
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

// Survey Types
export interface CourseSatisfactionSurvey {
  id?: string;
  id_osi: number;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  q5: number;
  q6: number;
  q7: number;
  q8: number;
  q9: number;
  q10: number;
  attendance_reasons: string[];
  created_at?: string;
}

export interface SurveyFormData {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  q5: number;
  q6: number;
  q7: number;
  q8: number;
  q9: number;
  q10: number;
  attendance_reasons: {
    company_requirement: boolean;
    job_growth: boolean;
    personal_development: boolean;
  };
}

export interface SurveyOSIData {
  id_osi: number;
  nro_osi: string;
  nombre_empresa: string;
  servicio: string;
  fecha_inicio_real: string;
  facilitador_nombre?: string;
}

// Carnets Metrics Types
export interface CarnetsMetrics {
  totalCarnets: number;
  activeCarnets: number;
  inactiveCarnets: number;
  expiringSoon: number;
  expired: number;
  averageCarnetsPerCertificate: number;
  templateUsage: TemplateUsageStats[];
  monthlyGeneration: MonthlyCarnetData[];
}

export interface TemplateUsageStats {
  templateId: number;
  templateName: string;
  count: number;
  percentage: number;
  lastUsed: string | null;
}

export interface MonthlyCarnetData {
  month: string;
  year: number;
  count: number;
  activeCount: number;
}

export interface CarnetReportItem {
  id: number;
  templateName: string;
  totalGenerated: number;
  activeCount: number;
  averageExpiryDays: number;
  lastGenerated: string;
  expiringSoonCount: number;
  expiredCount: number;
}

// Planificación de Servicios Types
export interface ControlServiciosEjecutados {
  id?: number;
  id_osi?: number | null;

  // Requisition specific fields
  corresponde_a?: string | null;
  fecha_solicitud?: string | null;
  tipo_solicitud?: "Interno" | "Externo" | null;
  nro_correlativo?: string | null;
  tipo_servicio?: "Servicio Técnico" | "Capacitación" | null;
  gerencia_solicitante?: string | null;
  solicitante?: string | null;
  prioridad?: "Alta" | "Media" | "Baja" | null;

  // Auto-populated from OSI
  numero_osi?: string | null;
  nombre_curso?: string | null;
  fecha_osi?: string | null;
  monto_x_traslado_mt?: number | null;
  horas_honorarios_h?: number | null;
  costo_por_hora?: number | null;
  gasto_impresion_i?: number | null;

  // Details Table Data
  dias_traslado?: number | null;
  impresion_total?: number | null;
  honorarios_total?: number | null;
  informe_final_total?: number | null;

  // Facilitator details
  cod_facilitador?: number | null;
  facilitador?: string | null;
  cedula_facilitador?: string | null;
  rif_facilitador?: string | null;
  banco_facilitador?: string | null;
  nro_cuenta_facilitador?: string | null;

  observaciones?: string | null;

  // Metadata
  created_at?: string;
  updated_at?: string;

  // Relationship data
  v_osi_formato_completo?: {
    nro_osi: string | null;
    nombre_empresa: string | null;
    servicio: string | null;
  };
  facilitadores?: {
    nombre_apellido: string;
    cedula: string | null;
    rif: string | null;
  };
}

export interface RequisicionItem {
  id: string;
  cant: number;
  unidad: string;
  descripcion: string;
  costo_unitario: number;
  total: number;
}

export interface ControlServiciosFormData {
  selectedOSI?: OSIFullData | null;
  corresponde_a: string;
  fecha_solicitud: string;
  tipo_solicitud: "Interno" | "Externo" | "";
  nro_correlativo: string;
  tipo_servicio: "Servicio Técnico" | "Capacitación" | "";
  gerencia_solicitante: string;
  solicitante: string;
  prioridad: "Alta" | "Media" | "Baja" | "";

  // Details - Fixed Items Quantities
  cant_traslado: number;
  cant_impresion: number;
  cant_honorarios: number;
  cant_informe_final: number;

  // Details - Values
  dias_traslado: number | null;
  costo_traslado: number | null;
  impresion_total: number | null;
  honorarios_horas: number | null;
  honorarios_costo_hora: number | null;
  honorarios_total: number | null;
  informe_final_total: number | null;

  // Additional dynamic items
  additional_items: RequisicionItem[];

  // Facilitator
  cod_facilitador: string;
  facilitador: string;
  cedula_facilitador: string;
  rif_facilitador: string;
  banco: string;
  nro_cuenta: string;

  observaciones: string;
}

// Full OSI data from v_osi_formato_completo view for control servicios
export interface OSIFullData {
  id_osi: number;
  nro_osi: string | null;
  fecha_emision?: string | null;
  fecha_inicio_real?: string | null;
  codigo_cliente?: number | null;
  participantes_ejecucion?: number | null;
  servicio: string | null;
  costo_traslado: number | null;
  horas_honorarios_instructor: number | null;
  tarifa_hora_honorarios: number | null;
  costo_impresion_material: number | null;
}

// ─── Client Portal Types ───

export interface ClienteCredential {
  id: number;
  empresa_id: number;
  username: string;
  display_name: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
  id_ciudad?: number | null;
  id_sede?: number[] | null;
}

export interface ClienteSession {
  id: number;
  empresa_id: number;
  empresa_nombre: string;
  username: string;
  display_name: string | null;
  id_ciudad?: number | null;
  id_sede?: number[] | null;
  logo_url?: string | null;
}

export interface EmpresaLogo {
  id: number;
  empresa_id: number;
  logo_url: string;
  storage_path: string;
  uploaded_at: string | null;
}

export interface ClienteCertificateFilters {
  searchTerm?: string;
  courseId?: number;
  stateId?: number;
  cityId?: number;
  sedeId?: number;
  dateFrom?: string;
  dateTo?: string;
  type: "all" | "certificates" | "carnets";
  nroOsi?: number;
}

export interface ClienteMetrics {
  totalCertificates: number;
  totalCarnets: number;
  totalParticipants: number;
  courseWithMostParticipants: {
    courseId: number;
    courseName: string;
    count: number;
  } | null;
  certificatesByCourse: {
    courseId: number;
    courseName: string;
    count: number;
  }[];
}

export interface ClienteBatchSummary {
  nro_osi: number;
  course_name: string;
  fecha_emision: string;
  participant_count: number;
  certificate_ids: number[];
}

export interface ClienteCertificateRow {
  id: number;
  participant_nombre: string;
  participant_cedula: string;
  participant_nacionalidad: string;
  course_nombre: string;
  course_id: number;
  course_emite_carnet: boolean;
  fecha_emision: string;
  fecha_vencimiento: string;
  is_active: boolean;
  nro_osi: number;
  state_nombre_estado: string;
  state_id: number;
  company_razon_social: string;
  calificacion: number;
  total_count: number;
}

export interface ClienteCarnetRow {
  id: number;
  nombre_participante: string;
  cedula_participante: string;
  titulo_curso: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  is_active: boolean;
  id_empresa: number | null;
  id_certificado: number | null;
  id_osi: number | null;
}

export interface ClienteFilterOptions {
  courses: { id: number; nombre: string }[];
  states: { id: number; nombre_estado: string }[];
  cities: { id: number; nombre_ciudad: string }[];
  sedes: { id: number; nombre_sede: string }[];
}
