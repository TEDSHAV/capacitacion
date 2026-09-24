export type TipoMaterial =
  | "presentacion_pptx"
  | "presentacion_pdf"
  | "material_imprimible"
  | "guia_participante"
  | "guia_facilitador"
  | "evaluacion"
  | "otro";

export interface MaterialDidactico {
  id: string;
  id_curso: number | null;
  id_osi: number | null;
  tipo_material: TipoMaterial;
  titulo: string;
  descripcion: string | null;
  archivo_nombre: string;
  b2_key: string;
  file_size_bytes: number;
  file_size_formatted: string;
  mime_type: string | null;
  es_optimizado: boolean;
  tamano_original_bytes: number | null;
  version: number;
  visible_facilitador: boolean;
  is_latest: boolean;
  parent_material_id: string | null;
  version_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  download_url?: string;
  curso_nombre?: string;
  sugerencias_count?: number;
}

export interface MaterialKitInfo {
  cursoId: number | null;
  cursoNombre: string;
  osiId: number;
  osiNumber: string;
  empresaNombre: string;
  materiales: MaterialDidactico[];
  presentacionPptx?: MaterialDidactico;
  presentacionPdf?: MaterialDidactico;
  materialesImprimibles: MaterialDidactico[];
  evaluaciones: MaterialDidactico[];
  otros: MaterialDidactico[];
}

export type TipoSugerencia =
  | "mejora"
  | "error_contenido"
  | "mejora_visual"
  | "actualizacion_norma"
  | "otro";

export type EstadoSugerencia = "pendiente" | "revisada" | "implementada" | "descartada";

export interface MaterialSugerencia {
  id: string;
  id_material: string;
  id_curso: number | null;
  id_osi: number | null;
  facilitador_id: number | null;
  facilitador_nombre: string;
  diapositiva_nro: number | null;
  tipo_sugerencia: TipoSugerencia;
  comentario: string;
  estado: EstadoSugerencia;
  created_at: string;
  updated_at?: string;
  material_titulo?: string;
  archivo_nombre?: string;
}
