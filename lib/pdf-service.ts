import puppeteer, { Browser, Page } from 'puppeteer';

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
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Reduce memory usage
      ],
    });

    // Graceful shutdown on process exit
    process.on('exit', async () => {
      if (browserInstance) {
        await browserInstance.close();
      }
    });

    return browserInstance;
  } catch (error) {
    throw new Error(
      `Failed to launch browser: ${error instanceof Error ? error.message : 'Unknown error'}`
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
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Generate PDF with letter format and margins
    const pdfBuffer = await page.pdf({
      format: 'letter',
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
      },
      printBackground: true,
      scale: 1,
    });

    return Buffer.from(pdfBuffer);
  } catch (error) {
    throw new Error(
      `Failed to generate PDF from HTML: ${error instanceof Error ? error.message : 'Unknown error'}`
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
