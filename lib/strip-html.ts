/**
 * Converts HTML (e.g. from TipTap) to plain text suitable for PDF rendering.
 * Preserves newlines for paragraphs and lists so visual separation exists.
 * Bullet lists render as "  - item", numbered lists as "  1. item".
 * All output characters must be within Latin-1 range (U+0000–U+00FF) to
 * prevent jsPDF 4.x from corrupting its internal encoding state.
 */

/**
 * Process <ul> and <ol> blocks, converting <li> items to formatted text
 * with proper bullet/number markers and indentation.
 * Handles nested lists by processing innermost lists first.
 */
function processLists(html: string): string {
  let result = html;

  // Repeat to handle nested lists (process innermost first)
  for (let depth = 0; depth < 5; depth++) {
    const before = result;

    // Match innermost <ul> (no nested ul/ol inside)
    result = result.replace(
      /<ul[^>]*>((?:(?!<\/?[uo]l)[\s\S])*?)<\/ul>/gi,
      (_match, content: string) => formatListItems(content, "bullet"),
    );

    // Match innermost <ol>
    result = result.replace(
      /<ol[^>]*>((?:(?!<\/?[uo]l)[\s\S])*?)<\/ol>/gi,
      (_match, content: string) => formatListItems(content, "numbered"),
    );

    if (result === before) break;
  }

  return result;
}

/**
 * Convert <li> items inside a list block to formatted plain text lines.
 */
function formatListItems(
  content: string,
  type: "bullet" | "numbered",
): string {
  const itemRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  const items: string[] = [];
  let m: RegExpExecArray | null;

  while ((m = itemRegex.exec(content)) !== null) {
    // Clean up inner HTML: convert <br> and </p> to newlines, strip other tags
    let text = m[1]
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/p>/gi, " ")
      .replace(/<p[^>]*>/gi, "")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&nbsp;/g, " ")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();

    if (text) items.push(text);
  }

  if (items.length === 0) return "";

  let result = "\n";
  let num = 1;

  for (const text of items) {
    if (type === "bullet") {
      result += `    - ${text}\n`;
    } else {
      result += `    ${num}. ${text}\n`;
      num++;
    }
  }

  return result;
}

export function stripHtml(html: string): string {
  if (!html) return "";

  let result = html;

  // --- Map non-Latin-1 chars to safe Latin-1 equivalents FIRST ---
  result = result
    .replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"') // Curly/angle quotes → "
    .replace(/[\u2018\u2019\u201A\u2039\u203A]/g, "'") // Curly single quotes → '
    .replace(/[\u2013\u2014\u2015]/g, "-") // En/em dashes → -
    .replace(/\u2026/g, "..."); // Ellipsis → ...

  // --- Process lists BEFORE stripping tags (adds bullet/number markers) ---
  result = processLists(result);

  // --- Strip remaining HTML structure ---
  result = result
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li>/gi, "    ") // Fallback for stray <li> outside <ul>/<ol>
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    // --- Decode HTML entities ---
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // --- Safety net: strip any remaining non-Latin-1 characters ---
    // This prevents jsPDF 4.x from corrupting its encoding state on unknown glyphs
    .replace(/[^\x00-\xFF]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\n+/, "") // trim leading newlines only (preserve list indent spaces)
    .replace(/\s+$/, ""); // trim trailing whitespace

  return result;
}
