/**
 * Regulatory & Corporate Compliance Documents for Facilitadores
 * SHA DE VENEZUELA, C.A.
 */

export type ComplianceDocumentCode =
  | "identificacion_peligros"
  | "notificacion_riesgos"
  | "politica_operativa";

export interface ComplianceDocumentDefinition {
  code: ComplianceDocumentCode;
  title: string;
  shortTitle: string;
  badgeText: string;
  category: "Seguridad y Salud" | "Legal y Prevención" | "Operativa y Calidad";
  version: string;
  date: string;
  requiresPhysicalDelivery: boolean;
  isReadOnly: boolean;
  canPrint: boolean;
  pdfUrl: string;
  description: string;
  legalFramework: string;
  summaryBulletPoints: string[];
}

export interface FacilitadorComplianceRecord {
  id?: number;
  facilitador_id: number;
  document_code: ComplianceDocumentCode;
  document_title: string;
  document_version: string;
  acknowledged: boolean;
  acknowledged_at: string | null;
  signer_name: string | null;
  signer_cedula: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  fisico_entregado: boolean;
  fisico_entregado_at: string | null;
  fisico_entregado_recibido_por: string | null;
  metadata?: Record<string, unknown>;
}

export interface FacilitadorComplianceSummary {
  facilitador_id: number;
  nombre_apellido: string;
  cedula: string;
  email?: string | null;
  telefono?: string | null;
  estado_geografico?: string | null;
  is_active: boolean;
  total_documents: number;
  acknowledged_count: number;
  is_fully_compliant: boolean;
  physical_pending_count: number;
  documents: Record<ComplianceDocumentCode, FacilitadorComplianceRecord | null>;
}

export interface ComplianceGlobalStats {
  totalFacilitadores: number;
  compliantCount: number;
  partialCount: number;
  nonCompliantCount: number;
  complianceRate: number;
  physicalPendingCount: number;
}

export const COMPLIANCE_DOCUMENTS: Record<ComplianceDocumentCode, ComplianceDocumentDefinition> = {
  identificacion_peligros: {
    code: "identificacion_peligros",
    title: "Identificación de Peligros y Evaluación de Riesgos",
    shortTitle: "Evaluación de Riesgos (NPP)",
    badgeText: "Lectura y Conformidad",
    category: "Seguridad y Salud",
    version: "2026-01",
    date: "29/09/2026",
    requiresPhysicalDelivery: false,
    isReadOnly: true,
    canPrint: false,
    pdfUrl: "/compliance/identificacion-peligros-evaluacion-riesgos.pdf",
    description:
      "Matriz detallada de 13 páginas de identificación de procesos peligrosos, factores de riesgo y principios de prevención para facilitadores en traslados, sesiones y emergencias.",
    legalFramework:
      "LOPCYMAT Arts. 53, 56, 57, 58 • C.R.B.V. Art. 127 • L.O.A. Arts. 4 y 80 • Norma Técnica NT-03-2016 • PSST SHA de Venezuela, C.A.",
    summaryBulletPoints: [
      "Evaluación de traslados domicilio-centro de trabajo y locaciones de clientes.",
      "Prevención de riesgos en el dictado de sesiones (ergonómicos, físicos, tecnológicos).",
      "Medidas de control para actividades externas y respuesta ante emergencias.",
      "Compromiso expreso de cumplimiento preventivo y reporte de condiciones inseguras.",
    ],
  },
  notificacion_riesgos: {
    code: "notificacion_riesgos",
    title: "Notificación de Riesgos y Principios de Prevención",
    shortTitle: "Notificación de Riesgos",
    badgeText: "Firma Digital + Físico",
    category: "Legal y Prevención",
    version: "2026-01",
    date: "29/09/2026",
    requiresPhysicalDelivery: true,
    isReadOnly: false,
    canPrint: true,
    pdfUrl: "/compliance/notificacion-riesgos-principios-prevencion.pdf",
    description:
      "Comunicación patronal formal emitida por la Presidencia de SHA de Venezuela, C.A. sobre inducción y principios preventivos bajo la LOPCYMAT y LOTTT.",
    legalFramework:
      "LOPCYMAT Art. 53 numeral 1 y Art. 56 numerales 3 y 4 • LOTTT Art. 156.",
    summaryBulletPoints: [
      "Notificación escrita formal de procesos peligrosos y factores de riesgo del puesto.",
      "Acreditación de inducción verbal y escrita de seguridad y salud en el trabajo.",
      "Firma digital en plataforma y consignación obligatoria del documento físico firmado y con huella en oficinas.",
    ],
  },
  politica_operativa: {
    code: "politica_operativa",
    title: "Política General de Actuación, Confidencialidad y Gestión Operativa para Facilitadores",
    shortTitle: "Política Operativa",
    badgeText: "Firma Digital + Físico",
    category: "Operativa y Calidad",
    version: "Rev. 00",
    date: "29/09/2026",
    requiresPhysicalDelivery: true,
    isReadOnly: false,
    canPrint: true,
    pdfUrl: "/compliance/politica-general-actuacion-facilitadores.pdf",
    description:
      "Normas de conducta, imagen corporativa, reporte y entregables en PRISMA, confidencialidad de datos, política de redes sociales y facturación fiscal.",
    legalFramework:
      "Sistema de Gestión de Calidad ISO 9001:2015 • Normas Operativas Internas SHA de Venezuela, C.A. • SENIAT.",
    summaryBulletPoints: [
      "Puntualidad rigurosa (30 minutos de anticipación) e identificación formal a nombre de SHA.",
      "Gestión de entregables: listas firmadas y encuestas cargadas el mismo día en PRISMA.",
      "Acuerdo de estricta confidencialidad sobre información técnica y comercial.",
      "Entrega física obligatoria firmada en oficina o casillero ZOOM de evaluaciones originales.",
    ],
  },
};
