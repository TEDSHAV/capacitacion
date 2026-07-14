export interface Company {
  id: string;
  razon_social: string;
  rif: string;
  direccion_fiscal: string;
  codigo_cliente: string;
}

export interface CapacitacionClientProps {
  user: any;
  companies: Company[];
}
