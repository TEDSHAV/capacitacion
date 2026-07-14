'use server';

import { SimpleDocumentGenerator } from './simple-document-generator';
import { TemplateData } from './document-templates';

export interface DocumentGenerationRequest {
  certificates: any[];
  osiData: any;
  firmanteData?: { nombre: string; cargo: string };
  options?: {
    includeCertificacionCompetencias?: boolean;
    includeNotaEntrega?: boolean;
    includeValidacionDatos?: boolean;
    recibidoData?: {
      nombre: string;
      cargo: string;
    };
  };
}

export interface DocumentGenerationResult {
  success: boolean;
  documents?: {
    [key: string]: string; // Base64 encoded documents
  };
  error?: string;
}

export async function generateDocumentsServer(request: DocumentGenerationRequest): Promise<DocumentGenerationResult> {
  try {
    const { certificates, osiData, firmanteData, options } = request;

    if (!certificates || !certificates.length) {
      return {
        success: false,
        error: 'No certificates provided for document generation'
      };
    }

    // Prepare template data
    const defaultFirmante = {
      nombre: 'DPTO. CAPACITACIÓN / SHA DE VENEZUELA, C.A.',
      cargo: 'Jefe de Capacitación'
    };
    
    const templateData = {
      fecha: new Date().toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      }),
      nombre_cliente: osiData.cliente_nombre_empresa || '',
      titulo_curso: osiData.tema || '',
      ciudad: osiData.ciudad || 'Puerto La Cruz',
      dia: new Date().getDate().toString(),
      mes: new Date().toLocaleDateString('es-ES', { month: 'long' }),
      anio: new Date().getFullYear().toString(),
      nro_osi: osiData.nro_osi || '',
      nombre_firmante: firmanteData?.nombre || defaultFirmante.nombre,
      cargo_firmante: firmanteData?.cargo || defaultFirmante.cargo,
      nombre_recibido: options?.recibidoData?.nombre || '',
      cargo_recibido: options?.recibidoData?.cargo || '',
      localidad: osiData.localidad || '',
      localidad_cliente: osiData.direccion_ejecucion || '',
      fecha_ejecucion: osiData.fecha_ejecucion || '',
      participantes: certificates.map((cert, index) => ({
        index: index + 1,
        nombre_apellido: cert.participant_name || '',
        cedula: cert.participant_id_number || '',
        puntuacion: cert.score?.toString() || '',
        condicion: cert.score && cert.score >= 14 ? 'APROBADO' : 'REPROBADO',
        numero_control: cert.control_number || '',
      })),
    } as TemplateData;

    console.log('📋 Template data prepared:', {
      certificatesCount: certificates.length,
      hasOsiData: !!osiData,
      hasFirmanteData: !!firmanteData,
      templateDataKeys: Object.keys(templateData)
    });

    const documents: { [key: string]: Buffer } = {};
    const errors: string[] = [];

    // Generate documents based on options with individual error handling
    if (options?.includeCertificacionCompetencias !== false) {
      try {
        console.log('🔄 Generating certificacion de competencias...');
        documents.certificacion_competencias = await SimpleDocumentGenerator.generateCertificacionCompetencias(templateData);
        console.log('✅ Certificacion de competencias generated successfully');
      } catch (error) {
        const errorMsg = `Failed to generate certificacion de competencias: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error('❌', errorMsg);
        errors.push(errorMsg);
      }
    }

    if (options?.includeNotaEntrega !== false) {
      try {
        console.log('🔄 Generating nota de entrega...');
        documents.nota_entrega = await SimpleDocumentGenerator.generateNotaEntrega(templateData);
        console.log('✅ Nota de entrega generated successfully');
      } catch (error) {
        const errorMsg = `Failed to generate nota de entrega: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error('❌', errorMsg);
        errors.push(errorMsg);
      }
    }

    if (options?.includeValidacionDatos !== false) {
      try {
        console.log('🔄 Generating validacion de datos...');
        documents.validacion_datos = await SimpleDocumentGenerator.generateValidacionDatos(templateData);
        console.log('✅ Validacion de datos generated successfully');
      } catch (error) {
        const errorMsg = `Failed to generate validacion de datos: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error('❌', errorMsg);
        errors.push(errorMsg);
      }
    }

    // Return success if at least one document was generated, otherwise return error
    if (Object.keys(documents).length > 0) {
      console.log(`📄 Successfully generated ${Object.keys(documents).length} documents`);
      if (errors.length > 0) {
        console.warn(`⚠️ ${errors.length} documents failed to generate:`, errors);
      }
      
      // Convert Buffers to Base64 for Next.js serialization
      const base64Documents: { [key: string]: string } = {};
      for (const [key, buffer] of Object.entries(documents)) {
        base64Documents[key] = buffer.toString('base64');
      }
      
      return {
        success: true,
        documents: base64Documents
      };
    } else {
      console.error('❌ No documents were generated successfully');
      return {
        success: false,
        error: `No documents were generated successfully. Errors: ${errors.join('; ')}`
      };
    }

  } catch (error) {
    console.error('❌ Error generating documents on server:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
