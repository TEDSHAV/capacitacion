export interface Empresa {
  id: string;
  razon_social: string;
  rif: string;
  direccion_fiscal: string;
  codigo_cliente: string;
}

export interface Curso {
  id: string;
  nombre: string;
  contenido_curso: string;
  cliente_asociado?: string;
  tipo_servicio?: number;
  created_at: string;
  empresas?: {
    razon_social: string;
  };
}

export interface GestionCursosClientProps {
  user: any;
  empresas: Empresa[];
  cursos: Curso[] | undefined;
}
