/**
 * Citizen Service for fast ID lookup
 * Uses official API from cedula.com.ve
 */

export interface CitizenLookupResult {
  success: boolean;
  name?: string;
  rif?: string;
  error?: string;
  sessionId?: string;
  challenge?: string;
  autoSolved?: boolean;
  answer?: string;
}

export class CitizenService {
  private static readonly API_URL = "https://api.cedula.com.ve/api/v1";
  private static readonly APP_ID = "9225";
  private static readonly TOKEN = "1dd9a819f1e9c888a443810c7a9f9a6f";

  /**
   * Start a "session" - For cedula.com.ve this is just a compatibility layer
   * since it doesn't require a real browser session or captcha.
   */
  static async startSession(): Promise<CitizenLookupResult> {
    const sessionId = `cedula_${Date.now()}`;
    
    // We return autoSolved: true so the UI proceeds immediately to verify
    return {
      success: true,
      sessionId,
      challenge: "Verificando...",
      autoSolved: true,
      answer: "API", // Dummy answer for compatibility
    };
  }

  /**
   * Verify ID with cedula.com.ve API
   */
  static async verifyWithSession(
    sessionId: string,
    idNumber: string,
    answer: string,
  ): Promise<CitizenLookupResult> {
    console.log(`[CitizenService] API Lookup: ID=${idNumber}`);

    try {
      // Build the URL with query parameters
      const url = new URL(this.API_URL);
      url.searchParams.append("app_id", this.APP_ID);
      url.searchParams.append("token", this.TOKEN);
      url.searchParams.append("nacionalidad", "V");
      url.searchParams.append("cedula", idNumber.replace(/\D/g, "")); // Only digits

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }

      const result = await response.json();
      console.log(`[CitizenService] API Response:`, JSON.stringify(result));

      if (result.error) {
        return {
          success: false,
          error: result.error_str || "Error en la consulta",
        };
      }

      const data = result.data;
      if (!data) {
        return {
          success: false,
          error: "No se encontraron datos para esta cédula",
        };
      }

      // Combine names and surnames
      const firstName = data.primer_nombre || "";
      const secondName = data.segundo_nombre || "";
      const firstSurname = data.primer_apellido || "";
      const secondSurname = data.segundo_apellido || "";

      const fullName = `${firstName} ${secondName} ${firstSurname} ${secondSurname}`
        .trim()
        .replace(/\s+/g, " ");

      if (!fullName) {
        return {
          success: false,
          error: "No se pudo extraer el nombre del ciudadano",
        };
      }

      return {
        success: true,
        name: fullName,
        rif: data.rif || undefined,
      };

    } catch (e) {
      console.error("[CitizenService] API Error:", e);
      return {
        success: false,
        error: "Error conectando con el servicio de identificación",
      };
    }
  }

  /**
   * Close session - Dummy method for compatibility
   */
  static async closeSession(sessionId: string): Promise<void> {
    // No-op for API-based service
  }

  /**
   * Direct lookup
   */
  static async lookupByID(idNumber: string): Promise<CitizenLookupResult> {
    return this.verifyWithSession("direct", idNumber, "API");
  }

  /**
   * Dummy method for compatibility with previous closeBrowser calls
   */
  static async closeBrowser(): Promise<void> {
    // No-op
  }
}
