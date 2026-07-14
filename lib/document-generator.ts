// Helper functions that don't require fs/path
export interface DocumentGenerationOptions {
  includeCertificacionCompetencias?: boolean;
  includeNotaEntrega?: boolean;
  includeValidacionDatos?: boolean;
  recibidoData?: {
    nombre: string;
    cargo: string;
  };
}

// Helper functions only - no imports of document-templates
export class DocumentGenerator {
  // This class is now mainly for type definitions and helper functions
  // The actual generation is done in server actions
  
  static getDocumentFileName(documentType: string, osiNumber?: string): string {
    const timestamp = new Date().toISOString().slice(0, 10);
    const osiPrefix = osiNumber ? `_${osiNumber}` : '';
    return `${documentType}${osiPrefix}_${timestamp}.docx`;
  }

  static validateTemplateData(data: any): string[] {
    const errors: string[] = [];

    if (!data.fecha) errors.push('Fecha es requerida');
    if (!data.nombre_cliente) errors.push('Nombre del cliente es requerido');
    if (!data.titulo_curso) errors.push('Título del curso es requerido');
    if (!data.nro_osi) errors.push('Número de OSI es requerido');
    if (!data.nombre_firmante) errors.push('Nombre del firmante es requerido');
    if (!data.cargo_firmante) errors.push('Cargo del firmante es requerido');
    if (!data.participantes || data.participantes.length === 0) {
      errors.push('Debe haber al menos un participante');
    }

    return errors;
  }
}

// Helper function to extract OSI data from certificate records
export function extractOSIFromCertificates(certificates: any[]): any {
  if (!certificates.length) return null;

  const firstCert = certificates[0];
  return {
    nro_osi: firstCert.osi_number || '',
    cliente_nombre_empresa: firstCert.company_name || '',
    tema: firstCert.course_title || '',
    ciudad: firstCert.city || 'Puerto La Cruz',
    localidad: firstCert.location || '',
    direccion_ejecucion: firstCert.execution_address || '',
    fecha_ejecucion1: firstCert.execution_date || '',
  };
}

// Helper function to get default firmante data
export function getDefaultFirmante(): { nombre: string; cargo: string } {
  return {
    nombre: 'DPTO. CAPACITACIÓN / SHA DE VENEZUELA, C.A.',
    cargo: 'Jefe de Capacitación',
  };
}
