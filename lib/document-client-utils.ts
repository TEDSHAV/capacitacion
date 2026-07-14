// Client-side utility functions for document generation

export function getDocumentFileName(documentType: string, osiNumber?: string): string {
  const timestamp = new Date().toISOString().slice(0, 10);
  const osiPrefix = osiNumber ? `_${osiNumber}` : '';
  
  // Use .pdf extension for our new PDF-based documents
  const extension = '.pdf';
  
  // Map document types to user-friendly names
  const documentNames: { [key: string]: string } = {
    'certificacion_competencias': 'certificacion_competencias',
    'nota_entrega': 'nota_entrega', 
    'validacion_datos': 'validacion_datos'
  };
  
  const documentName = documentNames[documentType] || documentType;
  return `${documentName}${osiPrefix}_${timestamp}${extension}`;
}

export function getDefaultFirmante(): { nombre: string; cargo: string } {
  return {
    nombre: 'DPTO. CAPACITACIÓN / SHA DE VENEZUELA, C.A.',
    cargo: 'Jefe de Capacitación',
  };
}
