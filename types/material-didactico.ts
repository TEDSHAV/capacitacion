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
  created_by: string | null;
  created_at: string;
  updated_at: string;
  download_url?: string;
  curso_nombre?: string;
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
