/**
 * Converts HTML (e.g. from TipTap) to plain text suitable for PDF rendering.
 * Preserves newlines for paragraphs and lists so visual separation exists.
 * All output characters must be within Latin-1 range (U+0000–U+00FF) to
 * prevent jsPDF 4.x from corrupting its internal encoding state.
 */
export function stripHtml(html: string): string {
  if (!html) return "";

  return (
    html
      // --- Map non-Latin-1 chars to safe Latin-1 equivalents FIRST ---
      .replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"') // Curly/angle quotes → "
      .replace(/[\u2018\u2019\u201A\u2039\u203A]/g, "'") // Curly single quotes → '
      .replace(/[\u2013\u2014\u2015]/g, "-") // En/em dashes → -
      .replace(/\u2026/g, "...") // Ellipsis → ...
      // All common bullet variants → 4-space indent (preserves visual structure)
      .replace(
        /[\u2022\u2023\u25E6\u2043\u2219\u25CF\u25CB\u25AA\u25AB\u2012\u204C\u204D]/g,
        "    ",
      )
      // --- Strip HTML structure ---
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/h[1-6]>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<li>/gi, "    ") // List items → 4-space indent
      .replace(/&bull;/gi, "    ") // Bullet HTML entity → indent
      .replace(/&middot;/gi, "    ")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      // --- Decode HTML entities ---
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&nbsp;/g, " ")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#8226;/g, "    ") // Numeric decimal entity for bullet → indent
      .replace(/&#x2022;/gi, "    ") // Numeric hex entity for bullet → indent
      // --- Safety net: strip any remaining non-Latin-1 characters ---
      // This prevents jsPDF 4.x from corrupting its encoding state on unknown glyphs
      .replace(/[^\x00-\xFF]/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}
