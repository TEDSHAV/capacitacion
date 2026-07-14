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
        console.warn(`Control numbers API returned ${response.status}`);
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
        console.warn(`Signature API returned ${response.status} for ID: ${signatureId}`);
        return null;
      }
      
      const data = await response.json();
      return data as Signature;
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
        console.warn(`Facilitator API returned ${response.status} for ID: ${facilitatorId}`);
        return null;
      }
      
      const data = await response.json();
      return data as Facilitador;
    } catch (error) {
      console.error("Error fetching facilitator:", error);
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
  private validateApiResponse<T>(data: unknown, validator: (item: unknown) => item is T): T | null {
    return validator(data) ? data : null;
  }
}

// Export singleton instance
export const certificateService = CertificateService.getInstance();
