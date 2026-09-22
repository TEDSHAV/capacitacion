import { createAdminClient } from "@/utils/supabase/server";

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
   * Verify ID with shared cat_cedulas_cache and cedula.com.ve API fallback
   */
  static async verifyWithSession(
    sessionId: string,
    idNumber: string,
    answer: string,
  ): Promise<CitizenLookupResult> {
    console.log(`[CitizenService] Verification requested: ID=${idNumber}`);

    const rawTrimmed = (idNumber || "").trim().toUpperCase();
    const nac = rawTrimmed.startsWith("E") ? "E" : "V";
    const digits = idNumber.replace(/\D/g, "");

    if (!digits || digits.length < 5) {
      return {
        success: false,
        error: "Número de cédula inválido",
      };
    }

    // Step 1: Check shared Supabase cache (cat_cedulas_cache)
    try {
      const supabase = await createAdminClient();
      const { data: cached, error: dbError } = await supabase
        .from("cat_cedulas_cache")
        .select("nombre_completo, rif")
        .eq("nacionalidad", nac)
        .eq("cedula", digits)
        .maybeSingle();

      if (!dbError && cached?.nombre_completo) {
        console.log(`[CitizenService] Cache HIT for ${nac}-${digits}: ${cached.nombre_completo}`);
        return {
          success: true,
          name: cached.nombre_completo,
          rif: cached.rif || undefined,
        };
      }
    } catch (err) {
      // Graceful degradation: if cache table doesn't exist yet, proceed to API
      console.warn("[CitizenService] Cache lookup bypassed:", err);
    }

    // Step 2: Fallback to external cedula.com.ve API
    try {
      const url = new URL(this.API_URL);
      url.searchParams.append("app_id", this.APP_ID);
      url.searchParams.append("token", this.TOKEN);
      url.searchParams.append("nacionalidad", nac);
      url.searchParams.append("cedula", digits);

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

      // Step 3: Asynchronously persist to shared cat_cedulas_cache (fire-and-forget)
      (async () => {
        try {
          const supabase = await createAdminClient();
          await supabase.from("cat_cedulas_cache").upsert(
            {
              nacionalidad: nac,
              cedula: digits,
              nombre_completo: fullName,
              rif: data.rif || null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "nacionalidad,cedula" },
          );
        } catch {
          // Silently ignore if table doesn't exist yet
        }
      })();

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
