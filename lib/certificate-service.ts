import { Signature, Facilitador, ControlNumbers } from "@/types";

export class CertificateService {
  private static instance: CertificateService;
  
  private constructor() {}
  
  static getInstance(): CertificateService {
    if (!CertificateService.instance) {
      CertificateService.instance = new CertificateService();
    }
    return CertificateService.instance;
  }

  /**
   * Fetch control numbers for certificate preview
   */
  async getControlNumbers(): Promise<ControlNumbers | null> {
    try {
      const response = await fetch('/api/control-numbers');
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      return {
        nro_libro: data.nro_libro,
        nro_hoja: data.nro_hoja,
        nro_linea: data.nro_linea,
        nro_control: data.nro_control
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Fetch signature data by ID
   * Uses Next.js 15+ compatible API call pattern
   */
  async getSignatureData(signatureId: string): Promise<any | null> {
    try {
      const response = await fetch(`/api/signatures/${signatureId}`);
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      
      // The API returns the firma table structure directly
      // Transform it to match expected format if needed
      if (data && typeof data === 'object') {
        return {
          id: data.id,
          nombre: data.nombre,
          representante_sha: data.nombre, // For SHA signatures
          firma: data.url_imagen,
          url_imagen: data.url_imagen,
          tipo: data.tipo,
          is_active: data.is_active
        };
      }
      
      return data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Fetch facilitator data by ID
   * Uses Next.js 15+ compatible API call pattern
   */
  async getFacilitatorData(facilitatorId: string): Promise<Facilitador | null> {
    try {
      const response = await fetch(`/api/facilitators/${facilitatorId}`);
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      
      // The API returns facilitator data, but we need to transform it
      if (data && typeof data === 'object') {
        return {
          id: data.id,
          nombre_apellido: data.nombre_apellido,
          cedula: data.cedula || null,
          telefono: data.telefono || null,
          email: data.email || null,
          direccion: data.direccion || null,
          firma_id: data.firma_id || null,
          temas_cursos: data.temas_cursos || [],
          nivel_tecnico: data.nivel_tecnico || null,
          firmas: data.firmas || null,
          fuente: null,
          fecha_ingreso: null,
          rif: null,
          formacion_docente_certificada: null,
          alcance: null,
          notas_observaciones: null,
          id_estado_base: null,
          id_ciudad_base: null,
          id_estado_geografico: null,
          id_estatus: null,
          ficha_tecnica: null,
          calificacion: null,
          url_curriculum: null,
          fecha_creacion: null,
          fecha_actualizacion: null,
          is_active: true,
          tiene_curriculum: null,
          tiene_certificaciones: null,
          tiene_foto_perfil: null
        };
      }
      
      return data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Fetch certificate template by ID
   */
  async getCertificateTemplate(templateId: number): Promise<{ id: number; nombre: string; archivo: string } | null> {
    try {
      const response = await fetch(`/api/certificate-templates/${templateId}`);
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Batch fetch multiple signatures
   */
  async getMultipleSignatures(signatureIds: string[]): Promise<any[]> {
    const promises = signatureIds.map(id => this.getSignatureData(id));
    const results = await Promise.allSettled(promises);
    
    return results
      .filter((result): result is PromiseFulfilledResult<any> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);
  }
}

// Export singleton instance
export const certificateService = CertificateService.getInstance();
