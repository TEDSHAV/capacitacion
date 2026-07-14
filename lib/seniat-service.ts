/**
 * SENIAT RIF Verification Service
 * Uses Playwright to automate RIF lookup against SENIAT website
 */

import { chromium, Browser, Page, BrowserContext } from "playwright";

export type VerificationStatus =
  | "pending"
  | "match"
  | "mismatch"
  | "not_found"
  | "error";

export interface SeniatVerificationResult {
  success: boolean;
  status: VerificationStatus;
  seniatName?: string;
  rif?: string;
  error?: string;
}

export class SeniatService {
  private static browser: Browser | null = null;
  private static readonly SENIAT_URL =
    "http://contribuyente.seniat.gob.ve/BuscaRif/BuscaRif.jsp";
  // Store active sessions for captcha verification
  private static sessions: Map<
    string,
    { page: Page; context: BrowserContext }
  > = new Map();

  /**
   * Get or create browser instance (singleton pattern)
   */
  private static async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    }
    return this.browser;
  }

  /**
   * Close browser instance (call when shutting down)
   */
  static async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Start a new SENIAT session and fetch captcha
   * Returns session ID and captcha image
   */
  static async startSession(): Promise<{
    success: boolean;
    sessionId?: string;
    captchaImage?: string;
    error?: string;
  }> {
    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    let page: Page | null = null;

    try {
      browser = await this.getBrowser();
      context = await browser.newContext();
      page = await context.newPage();

      // Navigate to SENIAT
      await page.goto(this.SENIAT_URL, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Wait for captcha image to load
      await page.waitForSelector('img[src*="Captcha"]', { timeout: 10000 });

      // Get captcha image as base64
      const captchaElement = await page.$('img[src*="Captcha"]');
      if (!captchaElement) {
        throw new Error("Captcha image not found on page");
      }

      // Get the actual image source
      const captchaSrc = await captchaElement.getAttribute("src");
      if (!captchaSrc) {
        throw new Error("Captcha image source not found");
      }

      // Fetch the image directly from the server using a separate request
      // Don't navigate the page - stay on the form
      const imageResponse = await context.request.get(
        `http://contribuyente.seniat.gob.ve/BuscaRif/${captchaSrc}`,
      );
      if (!imageResponse) {
        throw new Error("Failed to fetch captcha image");
      }

      const buffer = await imageResponse.body();
      const base64 = buffer.toString("base64");
      const captchaImage = `data:image/jpeg;base64,${base64}`;

      // Generate session ID
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store the session - page is still on the form page
      this.sessions.set(sessionId, { page, context });

      return {
        success: true,
        sessionId,
        captchaImage,
      };
    } catch (e) {
      console.error("Error starting SENIAT session:", e);
      // Cleanup on error
      if (page) await page.close();
      if (context) await context.close();
      return {
        success: false,
        error: e instanceof Error ? e.message : "Unknown error",
      };
    }
  }

  /**
   * Verify RIF against SENIAT database using existing session
   */
  static async verifyRIFWithSession(
    sessionId: string,
    rif: string,
    captcha: string,
  ): Promise<SeniatVerificationResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        status: "error",
        error: "Sesión no encontrada o expirada",
      };
    }

    const { page, context } = session;

    try {
      // Check if page is still responsive
      try {
        await page.evaluate(() => document.title);
      } catch (e) {
        await page.goto(this.SENIAT_URL, {
          waitUntil: "networkidle",
          timeout: 10000,
        });
      }

      // Wait for form elements
      await page.waitForSelector('input[name="p_cedula"]', { timeout: 15000 });
      await page.waitForSelector('input[name="codigo"]', { timeout: 15000 });

      // Fill cedula field
      await page.fill('input[name="p_cedula"]', rif, { timeout: 10000 });

      // Fill captcha field
      await page.fill('input[name="codigo"]', captcha, { timeout: 10000 });

      // Submit form
      await page.click('input[name="busca"]');

      // Wait for response
      await page.waitForTimeout(2000);

      // Check if there's an error message (invalid captcha)
      const errorMessage = await page.$(
        "text=/Código incorrecto|Código inválido/",
      );
      if (errorMessage) {
        return {
          success: false,
          status: "error",
          error: "Captcha incorrecto",
        };
      }

      // Check if RIF was found
      const resultText = await page.textContent("body");

      if (!resultText) {
        return {
          success: false,
          status: "error",
          error: "No se pudo obtener respuesta del servidor",
        };
      }

      // Look for "Contribuyente no encontrado" or similar
      if (
        resultText.toLowerCase().includes("contribuyente no encontrado") ||
        resultText.toLowerCase().includes("no existe") ||
        resultText.toLowerCase().includes("rif no encontrado")
      ) {
        return {
          success: false,
          status: "not_found",
          rif,
          error: "RIF no encontrado en SENIAT",
        };
      }

      // Extract name from result
      let seniatName = "";

      try {
        const fontElements = await page.$$("font");
        for (const fontElement of fontElements) {
          const text = await fontElement.textContent();
          if (!text) continue;

          const cleaned = text.trim();

          const rifNamePattern = /^[VE]\d+[\s\u00A0]+(.+)/;
          const match = cleaned.match(rifNamePattern);

          if (match && match[1]) {
            seniatName = match[1].trim();
            break;
          }
        }
      } catch (e) {
        console.error("Error extracting name from font elements:", e);
      }

      // Fallback: try to find name in page text
      if (!seniatName) {
        const lines = resultText.split("\n");
        for (const line of lines) {
          const cleaned = line.trim();
          const skipPatterns = [
            "RIF",
            "CÉDULA",
            "CEDULA",
            "PASAPORTE",
            "EJEMPLO",
            "Buscar",
            "Cancelar",
            "Escriba",
            "recuadro",
            "Ingrese",
            "según",
            "complete",
            "ceros",
            "BuscaRif",
            "consulta",
            "letrasLista",
            "letras y/o números",
            "letras",
            "números",
            "observa",
            "que observa",
            "Actividad Económica",
            "INFORMACION NO DISPONIBLE",
            "La condición de este contribuyente",
            "Este contribuyente no posee",
          ];

          if (
            skipPatterns.some((pattern) =>
              cleaned.toUpperCase().includes(pattern),
            )
          ) {
            continue;
          }

          const rifNamePattern = /^[VE]\d+[\s\u00A0]+(.+)/;
          const match = cleaned.match(rifNamePattern);

          if (match && match[1]) {
            seniatName = match[1].trim();
            break;
          }

          if (
            cleaned.length > 10 &&
            cleaned.length < 100 &&
            !cleaned.includes("RIF") &&
            !cleaned.includes("Cédula") &&
            !cleaned.includes("Buscar") &&
            !cleaned.includes("Escriba") &&
            !cleaned.includes("recuadro") &&
            !cleaned.includes("letras") &&
            !cleaned.includes("números") &&
            !cleaned.includes("que observa") &&
            !cleaned.includes("Ingrese") &&
            !cleaned.includes("Actividad") &&
            !cleaned.includes("INFORMACION") &&
            !cleaned.includes("condición") &&
            !cleaned.includes("contribuyente") &&
            /[A-ZÁÉÍÓÚÑ][a-záéíóúñ]/.test(cleaned) &&
            !/^\d+$/.test(cleaned)
          ) {
            seniatName = cleaned;
            break;
          }
        }
      }

      if (!seniatName) {
        return {
          success: false,
          status: "error",
          error: "No se pudo extraer el nombre del resultado",
        };
      }

      return {
        success: true,
        status: "match",
        rif,
        seniatName,
      };
    } catch (e) {
      console.error("Error in verifyRIFWithSession:", e);
      return {
        success: false,
        status: "error",
        error: e instanceof Error ? e.message : "Error desconocido",
      };
    }
  }

  /**
   * Close a session
   */
  static async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      await session.page.close();
      await session.context.close();
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Verify RIF against SENIAT database (legacy method without session)
   */
  static async verifyRIF(
    rif: string,
    captcha: string,
  ): Promise<SeniatVerificationResult> {
    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    let page: Page | null = null;

    try {
      browser = await this.getBrowser();
      context = await browser.newContext();
      page = await context.newPage();

      // Navigate to SENIAT
      await page.goto(this.SENIAT_URL, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Wait for form elements
      await page.waitForSelector('input[name="p_cedula"]', { timeout: 10000 });
      await page.waitForSelector('input[name="codigo"]', { timeout: 10000 });

      // Fill cedula field
      await page.fill('input[name="p_cedula"]', rif);

      // Fill captcha field
      await page.fill('input[name="codigo"]', captcha);

      // Submit form
      await page.click('input[name="busca"]');

      // Wait for response
      await page.waitForTimeout(2000);

      // Check if there's an error message (invalid captcha)
      const errorMessage = await page.$(
        "text=/Código incorrecto|Código inválido/",
      );
      if (errorMessage) {
        console.error("Captcha validation failed");
        return {
          success: false,
          status: "error",
          error: "Captcha incorrecto",
        };
      }

      // Check if RIF was found
      const resultText = await page.textContent("body");

      if (!resultText) {
        return {
          success: false,
          status: "error",
          error: "No se pudo obtener respuesta del servidor",
        };
      }

      // Look for "Contribuyente no encontrado" or similar
      if (
        resultText.toLowerCase().includes("contribuyente no encontrado") ||
        resultText.toLowerCase().includes("no existe") ||
        resultText.toLowerCase().includes("rif no encontrado")
      ) {
        return {
          success: false,
          status: "not_found",
          rif,
          error: "RIF no encontrado en SENIAT",
        };
      }

      // Extract name from result
      // SENIAT returns the result in a <font> tag with format: V123456789&nbsp;NAME
      let seniatName = "";

      try {
        // Look for <font> tags which contain the result
        const fontElements = await page.$$("font");
        console.log("Found", fontElements.length, "font elements");
        for (const fontElement of fontElements) {
          const text = await fontElement.textContent();
          if (!text) continue;

          const cleaned = text.trim();
          console.log("Font element text:", cleaned);

          // Only process if it matches the RIF pattern (starts with V/E + digits)
          // Handle both regular space and &nbsp; (non-breaking space)
          const rifNamePattern = /^[VE]\d+[\s\u00A0]+(.+)/;
          const match = cleaned.match(rifNamePattern);

          if (match && match[1]) {
            seniatName = match[1].trim();
            console.log("Matched name:", seniatName);
            break;
          }
        }
      } catch (e) {
        console.error("Error extracting name from font elements:", e);
      }

      // Fallback: try to find name in page text
      if (!seniatName) {
        const lines = resultText.split("\n");
        for (const line of lines) {
          const cleaned = line.trim();
          const skipPatterns = [
            "RIF",
            "CÉDULA",
            "CEDULA",
            "PASAPORTE",
            "EJEMPLO",
            "Buscar",
            "Cancelar",
            "Escriba",
            "recuadro",
            "Ingrese",
            "según",
            "complete",
            "ceros",
            "BuscaRif",
            "consulta",
            "letrasLista",
            "letras y/o números",
            "letras",
            "números",
            "observa",
            "que observa",
            "Actividad Económica",
            "INFORMACION NO DISPONIBLE",
            "La condición de este contribuyente",
            "Este contribuyente no posee",
          ];

          if (
            skipPatterns.some((pattern) =>
              cleaned.toUpperCase().includes(pattern),
            )
          ) {
            continue;
          }

          // Look for RIF + NAME pattern
          const rifNamePattern = /^[VE]\d+[\s\u00A0]+(.+)/;
          const match = cleaned.match(rifNamePattern);

          if (match && match[1]) {
            seniatName = match[1].trim();
            break;
          }

          // Fallback: if it looks like a name (re-check skip patterns)
          if (
            cleaned.length > 10 &&
            cleaned.length < 100 &&
            !cleaned.includes("RIF") &&
            !cleaned.includes("Cédula") &&
            !cleaned.includes("Buscar") &&
            !cleaned.includes("Escriba") &&
            !cleaned.includes("recuadro") &&
            !cleaned.includes("letras") &&
            !cleaned.includes("números") &&
            !cleaned.includes("que observa") &&
            !cleaned.includes("Ingrese") &&
            !cleaned.includes("Actividad") &&
            !cleaned.includes("INFORMACION") &&
            !cleaned.includes("condición") &&
            !cleaned.includes("contribuyente") &&
            /[A-ZÁÉÍÓÚÑ][a-záéíóúñ]/.test(cleaned) &&
            !/^\d+$/.test(cleaned)
          ) {
            seniatName = cleaned;
            break;
          }
        }
      }

      if (!seniatName) {
        return {
          success: false,
          status: "error",
          error: "No se pudo extraer el nombre del resultado",
        };
      }

      return {
        success: true,
        status: "match",
        rif,
        seniatName,
      };
    } catch (e) {
      console.error("Error in verifyRIF:", e);
      return {
        success: false,
        status: "error",
        error: e instanceof Error ? e.message : "Error desconocido",
      };
    } finally {
      if (page) await page.close();
      if (context) await context.close();
    }
  }

  /**
   * Compare OCR name with SENIAT name using contains-check
   * Case-insensitive, removes accents
   */
  static compareNames(ocrName: string, seniatName: string): VerificationStatus {
    // Clean and normalize both names
    const cleanName = (name: string) => {
      return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-z\s]/g, "") // Remove special characters
        .trim();
    };

    const cleanOcr = cleanName(ocrName);
    const cleanSeniat = cleanName(seniatName);

    // Check if one name contains the other
    if (cleanOcr.includes(cleanSeniat) || cleanSeniat.includes(cleanOcr)) {
      return "match";
    }

    return "mismatch";
  }

  /**
   * Verify RIF and compare with OCR name in one step
   */
  static async verifyAndCompare(
    rif: string,
    ocrName: string,
    captcha: string,
  ): Promise<SeniatVerificationResult> {
    const result = await this.verifyRIF(rif, captcha);

    if (!result.success || !result.seniatName) {
      return result;
    }

    const comparisonStatus = this.compareNames(ocrName, result.seniatName);

    return {
      ...result,
      status: comparisonStatus,
    };
  }
}

// Ensure browser is closed on process exit
if (typeof process !== "undefined") {
  process.on("exit", () => SeniatService.closeBrowser());
  process.on("SIGINT", () => SeniatService.closeBrowser());
  process.on("SIGTERM", () => SeniatService.closeBrowser());
}
