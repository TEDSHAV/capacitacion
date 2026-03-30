'use server';

import { TemplateData } from './document-templates-new';
import { TemplateBasedPdfGenerator } from './template-based-pdf-generator';

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

    // Prepare template data to match DOCX template structure exactly
    const defaultFirmante = {
      nombre: 'DPTO. CAPACITACIÓN / SHA DE VENEZUELA, C.A.',
      cargo: 'Jefe de Capacitación'
    };
    
    // Get current date components for template
    const today = new Date();
    const dateComponents = {
      fecha: today.toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      }),
      dia: today.getDate().toString(),
      mes: today.toLocaleDateString('es-ES', { month: 'long' }),
      anio: today.getFullYear().toString()
    };
    
    // Create comprehensive template data with exact field names from templates
    const templateData = {
      // Basic date fields (for certificacion_de_competencias)
      ...dateComponents,
      
      // OSI and course information
      nombre_cliente: osiData.cliente_nombre_empresa || '',
      titulo_curso: osiData.tema || '',
      ciudad: osiData.ciudad || 'Puerto La Cruz',
      nro_osi: osiData.nro_osi || '',
      
      // Firmante information
      nombre_firmante: firmanteData?.nombre || defaultFirmante.nombre,
      cargo_firmante: firmanteData?.cargo || defaultFirmante.cargo,
      
      // Additional fields for other templates
      nombre_recibido: options?.recibidoData?.nombre || '',
      cargo_recibido: options?.recibidoData?.cargo || '',
      localidad: osiData.localidad || '',
      localidad_cliente: osiData.direccion_ejecucion || '',
      fecha_ejecucion: osiData.fecha_ejecucion || '',
      
      // Participants array with exact field names from templates
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
      templateDataKeys: Object.keys(templateData),
      sampleParticipant: templateData.participantes?.[0] || null,
      // Debug all template fields
      allFields: {
        fecha: templateData.fecha,
        nombre_cliente: templateData.nombre_cliente,
        titulo_curso: templateData.titulo_curso,
        ciudad: templateData.ciudad,
        nro_osi: templateData.nro_osi,
        nombre_firmante: templateData.nombre_firmante,
        cargo_firmante: templateData.cargo_firmante,
        participantes: templateData.participantes,
        dia: templateData.dia,
        mes: templateData.mes,
        anio: templateData.anio
      }
    });

    const processor = new TemplateBasedPdfGenerator();
    const documents: { [key: string]: string } = {};
    const errors: string[] = [];

    // Generate documents based on options with individual error handling
    if (options?.includeCertificacionCompetencias !== false) {
      try {
        console.log('🔄 Generating certificacion de competencias...');
        const buffer = await processor.generateCertificacionCompetencias(templateData);
        documents.certificacion_competencias = buffer.toString('base64');
        console.log('✅ Certificacion de competencias generated successfully with template-based approach');
      } catch (error) {
        const errorMsg = `Failed to generate certificacion de competencias: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error('❌', errorMsg);
        errors.push(errorMsg);
      }
    }

    if (options?.includeNotaEntrega !== false) {
      try {
        console.log('🔄 Generating nota de entrega...');
        const buffer = await processor.generateNotaEntrega(templateData);
        documents.nota_entrega = buffer.toString('base64');
        console.log('✅ Nota de entrega generated successfully with template-based approach');
      } catch (error) {
        const errorMsg = `Failed to generate nota de entrega: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error('❌', errorMsg);
        errors.push(errorMsg);
      }
    }

    if (options?.includeValidacionDatos !== false) {
      try {
        console.log('🔄 Generating validacion de datos...');
        const buffer = await processor.generateValidacionDatos(templateData);
        documents.validacion_datos = buffer.toString('base64');
        console.log('✅ Validacion de datos generated successfully with template-based approach');
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
      
      // Documents are already converted to base64 above
      return {
        success: true,
        documents
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
