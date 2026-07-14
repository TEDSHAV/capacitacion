/**
 * Citizen Service for fast ID lookup
 * Uses Playwright to automate lookup against alternative Venezuelan ID databases
 */

import { chromium, Browser, Page, BrowserContext } from "playwright";

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

// Ensure the sessions Map is truly global to persist across API routes in Next.js
const getPnpSessions = (): Map<string, { page: Page; context: BrowserContext }> => {
  const globalAny = global as any;
  if (!globalAny._pnpSessions) {
    globalAny._pnpSessions = new Map();
  }
  return globalAny._pnpSessions;
};

export class CitizenService {
  private static browser: Browser | null = null;
  private static readonly PNP_URL = "https://www.sistemaspnp.com/cedula/";
  
  private static get sessions() {
    return getPnpSessions();
  }

  /**
   * Get or create browser instance
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
   * Close browser instance
   */
  static async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Start a new PNP session and extract math challenge
   */
  static async startSession(): Promise<CitizenLookupResult> {
    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    let page: Page | null = null;

    try {
      browser = await this.getBrowser();
      context = await browser.newContext();
      page = await context.newPage();

      // Navigate to PNP
      await page.goto(this.PNP_URL, {
        waitUntil: "domcontentloaded", // Faster than networkidle
        timeout: 20000,
      });

      // Targeted extraction for math challenge
      let challenge = "";
      let autoSolved = false;
      let answer = "";

      try {
        // Wait for the captcha label specifically - it appears quickly after DOM load
        const captchaLabel = await page.waitForSelector(".captcha-question", { 
          timeout: 8000,
          state: "visible" 
        });
        
        // Extract text specifically, avoiding child elements like <i>
        const labelText = await captchaLabel.evaluate(el => {
          const clone = el.cloneNode(true) as HTMLElement;
          clone.querySelectorAll('i').forEach(i => i.remove());
          return clone.innerText || clone.textContent || "";
        });

        if (labelText) {
          // Refined regex to handle various math challenge formats
          const mathMatch = labelText.match(/(\d+)\s*([\+\-\*xX])\s*(\d+)/);
          if (mathMatch) {
            const num1 = parseInt(mathMatch[1]);
            const opRaw = mathMatch[2].toLowerCase();
            const num2 = parseInt(mathMatch[3]);
            challenge = `${num1} ${opRaw} ${num2}`;
            
            if (opRaw === "+") answer = (num1 + num2).toString();
            else if (opRaw === "-") answer = (num1 - num2).toString();
            else if (opRaw === "*" || opRaw === "x") answer = (num1 * num2).toString();
            
            if (answer) {
              autoSolved = true;
            }
          } else {
            // Clean up the text for manual display
            challenge = labelText.replace(/CAPTCHA:|¿|Cuánto es|es:|\?/gi, "").trim();
          }
        }
      } catch (e) {
        console.warn("Could not find .captcha-question selector, falling back to body text search");
        // Fallback to body text if selector fails
        const bodyText = await page.textContent("body");
        if (bodyText) {
          const mathMatch = bodyText.match(/(\d+)\s*([\+\-\*])\s*(\d+)/);
          if (mathMatch) {
            const num1 = parseInt(mathMatch[1]);
            const op = mathMatch[2];
            const num2 = parseInt(mathMatch[3]);
            challenge = `${num1} ${op} ${num2}`;
            if (op === "+") answer = (num1 + num2).toString();
            else if (op === "-") answer = (num1 - num2).toString();
            else if (op === "*") answer = (num1 * num2).toString();
            if (answer) autoSolved = true;
          }
        }
      }

      if (!challenge) {
        throw new Error("No se pudo extraer el reto matemático de la página");
      }

      // Generate session ID
      const sessionId = `pnp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.sessions.set(sessionId, { page, context });

      return {
        success: true,
        sessionId,
        challenge: challenge || "Por favor resuelve el reto matemático",
        autoSolved,
        answer,
      };
    } catch (e) {
      console.error("Error starting PNP session:", e);
      if (page) await page.close();
      if (context) await context.close();
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al iniciar sesión",
      };
    }
  }

  /**
   * Verify ID with PNP using existing session and math answer
   */
  static async verifyWithSession(
    sessionId: string,
    idNumber: string,
    answer: string,
  ): Promise<CitizenLookupResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: "Sesión expirada" };
    }

    const { page } = session;

    try {
      // Check if page is still responsive and has the form
      let hasForm = false;
      try {
        hasForm = await page.$('input[name="cedula"]') !== null;
      } catch (e) {
        // Page might be closed or detached
      }

      if (!hasForm) {
        // Try to reload once if form is missing
        await page.goto(this.PNP_URL, { waitUntil: "networkidle", timeout: 15000 }).catch(() => {});
      }

      // Fill ID with wait to prevent timeout
      await page.waitForSelector('input[name="cedula"]', { timeout: 10000 });
      await page.fill('input[name="cedula"]', idNumber);

      // Fill math answer using the specific #captcha ID
      // Give it a small delay to ensure page is ready
      await page.waitForSelector("#captcha", { timeout: 5000 });
      const mathInput = await page.$("#captcha");
      if (mathInput) {
        await mathInput.fill(answer);
      } else {
        // Fallback to generic names if ID is not found
        const fallbackInput = await page.$('input[name*="captcha"], input[name*="math"], input[name*="respu"]');
        if (fallbackInput) {
          await fallbackInput.fill(answer);
        }
      }

      // Submit
      await page.click('button[type="submit"], input[type="submit"], #btn-consultar');
      
      // SMART WAIT: Instead of a hard timeout or waiting for full network idle,
      // wait for ANY of the possible result markers to appear.
      // This is much faster as it finishes the moment the site responds.
      try {
        await Promise.race([
          page.waitForSelector('text=/Datos Personales|No hay APIs|incorrecto|inválido|expirada|terminado/i', { timeout: 10000 }),
          page.waitForNavigation({ waitUntil: 'load', timeout: 10000 })
        ]).catch(() => {});
      } catch (e) {
        // Fallback for unexpected states
        await page.waitForTimeout(1000);
      }

      const resultText = await page.textContent("body");
      if (!resultText) {
        return { success: false, error: "No se obtuvo respuesta" };
      }
      
      // Check for common error messages
      if (resultText.includes("incorrecto") || resultText.includes("inválido")) {
        return { success: false, error: "Reto matemático incorrecto" };
      }

      if (resultText.toLowerCase().includes("expirada") || resultText.toLowerCase().includes("sesión ha terminado")) {
        return { success: false, error: "Sesión expirada en el portal" };
      }

      // Target structured extraction from the "smashed" text
      // We look for each field and stop before the next label begins
      const labels = ["Primer Apellido", "Segundo Apellido", "Nombres", "Datos CNE", "Estado", "Municipio", "Parroquia", "Centro", "Cédula", "RIF", "Nueva búsqueda"];
      const stopPattern = `(?=${labels.join("|")}|$)`;

      const firstNameMatch = resultText.match(new RegExp(`Nombres?:\\s*(.*?)${stopPattern}`, 'i'));
      const firstSurnameMatch = resultText.match(new RegExp(`Primer Apellido:\\s*(.*?)${stopPattern}`, 'i'));
      const secondSurnameMatch = resultText.match(new RegExp(`Segundo Apellido:\\s*(.*?)${stopPattern}`, 'i'));

      if (firstNameMatch || firstSurnameMatch || secondSurnameMatch) {
        const first = firstNameMatch ? firstNameMatch[1].trim() : "";
        const pApellido = firstSurnameMatch ? firstSurnameMatch[1].trim() : "";
        const sApellido = secondSurnameMatch ? secondSurnameMatch[1].trim() : "";
        
        const combinedName = `${first} ${pApellido} ${sApellido}`.trim().replace(/\s+/g, ' ');
        
        if (combinedName.length > 2) {
          return { success: true, name: combinedName };
        }
      }

      // Legacy/Simple extraction if structured fields not found
      const nameMatch = resultText.match(/Nombre:\s*([^<>\n]+)/i);
      if (nameMatch && nameMatch[1]) {
        let name = nameMatch[1].trim();
        // Clean up: remove other fields if they were captured on the same line
        const labelsToStop = ["Datos Cne", "Datos CNE", "CNE", "Centro de Votación", "Centro", "Estado", "Municipio", "Parroquia", "Cédula", "C.I", "Votación", "RIF", "Nueva búsqueda"];
        for (const label of labelsToStop) {
          const index = name.indexOf(label);
          if (index !== -1) {
            name = name.substring(0, index).trim();
          }
        }
        return { success: true, name };
      }

      // Fallback extraction
      const lines = resultText.split("\n");
      for (const line of lines) {
        const cleaned = line.trim();
        // Look for uppercase names that don't contain common labels
        if (cleaned.length > 5 && 
            !cleaned.includes("Cédula") && 
            !cleaned.includes("Verificar") && 
            !cleaned.includes("Consultar") &&
            /[A-ZÁÉÍÓÚÑ]{2,}\s+[A-ZÁÉÍÓÚÑ]{2,}/.test(cleaned)) {
          return { success: true, name: cleaned };
        }
      }

      return { success: false, error: "No se encontró el ciudadano" };
    } catch (e) {
      console.error("Error in PNP verification:", e);
      return { success: false, error: "Error en la consulta" };
    }
  }

  /**
   * Close session
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
   * Legacy method - updated to use session flow
   */
  static async lookupByID(idNumber: string): Promise<CitizenLookupResult> {
    const session = await this.startSession();
    if (!session.success || !session.sessionId) return session;

    if (session.autoSolved && session.answer) {
      return await this.verifyWithSession(session.sessionId, idNumber, session.answer);
    }

    // If not auto-solved, we can't complete in one step anymore
    return { success: false, error: "Reto matemático requerido" };
  }
}

// Ensure browser is closed on process exit
if (typeof process !== "undefined") {
  process.on("exit", () => CitizenService.closeBrowser());
  process.on("SIGINT", () => CitizenService.closeBrowser());
  process.on("SIGTERM", () => CitizenService.closeBrowser());
}
