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
      console.error("Error fetching control numbers:", error);
      return null;
    }
  }

  /**
   * Fetch signature data by ID
   * Uses Next.js 15+ compatible API call pattern
   */
  async getSignatureData(signatureId: string): Promise<Signature | null> {
    try {
      const response = await fetch(`/api/signatures/${signatureId}`);
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      return this.validateApiResponse(data, (item): item is Signature => {
        return 'id' in item && 'name' in item && 'signature' in item;
      });
    } catch (error) {
      console.error("Error fetching signature:", error);
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
      return this.validateApiResponse(data, (item): item is Facilitador => {
        return 'id' in item && 'name' in item && 'facilitator' in item;
      });
    } catch (error) {
      console.error("Error fetching facilitator:", error);
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
      console.error("Error fetching certificate template:", error);
      return null;
    }
  }

  /**
   * Batch fetch multiple signatures
   */
  async getMultipleSignatures(signatureIds: string[]): Promise<Signature[]> {
    const promises = signatureIds.map(id => this.getSignatureData(id));
    const results = await Promise.allSettled(promises);
    
    return results
      .filter((result): result is PromiseFulfilledResult<Signature> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);
  }

  /**
   * Validate API response structure
   */
  private validateApiResponse<T>(data: unknown, validator: (item: any) => item is T): T | null {
    return validator(data) && typeof data === 'object' && data !== null ? data as T : null;
  }
}

// Export singleton instance
export const certificateService = CertificateService.getInstance();
