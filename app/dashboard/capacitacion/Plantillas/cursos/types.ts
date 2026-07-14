export interface PlantillaCurso {
  id: number;
  descripcion: string;
  contenido: string;
  id_curso?: number | null;
  id_empresa?: number | null;
  is_active: boolean;
  created_at?: string;
  curso_nombre?: string;
  empresa_nombre?: string;
}
