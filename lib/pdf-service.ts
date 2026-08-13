import puppeteer, { Browser, Page } from "puppeteer";

let browserInstance: Browser | null = null;

/**
 * Get or create a singleton browser instance.
 * Reused across all PDF generation calls for performance.
 */
export async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  try {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-software-rasterizer",
        "--disable-extensions",
        "--disable-default-apps",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-background-networking",
        "--disable-sync",
        "--disable-translate",
        "--metrics-recording-only",
        "--no-report-upload",
        "--disable-breakpad",
        "--disable-crash-reporter",
      ],
    });

    // Graceful shutdown on process exit
    process.on("exit", async () => {
      if (browserInstance) {
        await browserInstance.close();
      }
    });

    return browserInstance;
  } catch (error) {
    throw new Error(
      `Failed to launch browser: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Generate PDF from HTML string.
 * Creates a new page, sets content, renders to PDF, and closes the page.
 */
export async function generatePdfFromHtml(html: string): Promise<Buffer> {
  let page: Page | null = null;

  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    // Set viewport for consistent rendering
    await page.setViewport({ width: 1200, height: 1600 });

    // Set content and wait for network idle
    await page.setContent(html, { waitUntil: "domcontentloaded" });

    // Generate PDF with letter format and no margins (controlled via CSS @page)
    const pdfBuffer = await page.pdf({
      format: "letter",
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0",
      },
      printBackground: true,
      scale: 1,
    });

    return Buffer.from(pdfBuffer);
  } catch (error) {
    throw new Error(
      `Failed to generate PDF from HTML: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  } finally {
    if (page) {
      await page.close();
    }
  }
}

export interface PdfHeaderFooterOptions {
  headerTemplate?: string;
  footerTemplate?: string;
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
}

/**
 * Generate PDF from HTML with native puppeteer header/footer templates.
 * Uses displayHeaderFooter so headers/footers repeat on every page without
 * overlapping body content. Margins must be large enough to fit the templates.
 */
export async function generatePdfWithHeaderFooter(
  html: string,
  options: PdfHeaderFooterOptions,
): Promise<Buffer> {
  let page: Page | null = null;

  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    await page.setViewport({ width: 1200, height: 1600 });
    await page.setContent(html, { waitUntil: "domcontentloaded" });

    const pdfBuffer = await page.pdf({
      format: "letter",
      displayHeaderFooter: true,
      headerTemplate: options.headerTemplate || "<div></div>",
      footerTemplate: options.footerTemplate || "<div></div>",
      margin: {
        top: options.marginTop || "2.5cm",
        bottom: options.marginBottom || "2cm",
        left: options.marginLeft || "2cm",
        right: options.marginRight || "2cm",
      },
      printBackground: true,
      scale: 1,
    });

    return Buffer.from(pdfBuffer);
  } catch (error) {
    throw new Error(
      `Failed to generate PDF with header/footer: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  } finally {
    if (page) {
      await page.close();
    }
  }
}

/**
 * Close the browser instance (useful for cleanup).
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
