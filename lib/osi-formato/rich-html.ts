export const RICH_HTML_CONTENT_CLASS = "rich-html-content";
function sanitize_rich_html(raw: string): string {
  // ponytail: regex sanitizer avoids cross-repo dependency resolution;
  // ceiling: not as robust as DOMPurify; upgrade by injecting a sanitizer
  // function from host app or bundling a compiled shared package.
  return raw
    .replace(/<\s*(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/\sstyle\s*=\s*(['"]).*?\1/gi, "")
    .trim();
}


const HTML_TAG_RE = /<\/?[a-z][\s\S]*>/i;

function is_likely_html(value: string): boolean {
  return HTML_TAG_RE.test(value.trim());
}

function escape_html(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function bullet_text_to_html(text: string): string {
  const lines = text
    .split("\n")
    .map((line) => line.replace(/^\s*[-•]\s*/, "").trim())
    .filter(Boolean);
  if (lines.length === 0) return "";
  const items = lines.map((line) => `<li>${escape_html(line)}</li>`).join("");
  return `<ul>${items}</ul>`;
}

function plain_text_to_html(text: string): string {
  const blocks = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  if (blocks.length === 0) {
    const single = text.trim();
    if (!single) return "";
    return `<p>${escape_html(single).replace(/\n/g, "<br />")}</p>`;
  }
  return blocks
    .map((p) => `<p>${escape_html(p).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

function to_display_html(value: string | null | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "N/A") return "";
  if (is_likely_html(raw)) return sanitize_rich_html(raw);
  if (/^\s*[-•]/m.test(raw)) return sanitize_rich_html(bullet_text_to_html(raw));
  return sanitize_rich_html(plain_text_to_html(raw));
}

export function strip_legacy_osi_concat_markers(value: string): string {
  return value
    .replace(/\s*\|\s*ADICIONAL OSI:\s*/gi, "\n\n")
    .replace(/\s*\|\s*OBS\.\s*EJECUCIÓN:\s*/gi, "\n\n")
    .replace(/\s*\|\s*OSI:\s*/gi, "\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const OSI_OBS_PIPE_SPLIT_RE =
  /\s*\|\s*(?:OBS\.\s*EJECUCIÓN|ADICIONAL\s+OSI|OSI)\s*:\s*/gi;

/** Conserva solo la nota real de solicitud si el campo fue reinyectado con totales. */
export function extract_osi_solicitud_observacion_text(
  value: string | null | undefined,
): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (!/\|\s*(?:OBS\.\s*EJECUCIÓN|ADICIONAL\s+OSI|OSI)\s*:/i.test(raw)) {
    return strip_legacy_osi_concat_markers(raw);
  }
  const parts = raw
    .split(OSI_OBS_PIPE_SPLIT_RE)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return "";
  return strip_legacy_osi_concat_markers(parts[parts.length - 1] ?? "");
}

export function merged_content_to_display_html(value: string): string {
  const raw = strip_legacy_osi_concat_markers(value.trim());
  if (!raw || raw === "N/A") return "N/A";
  const sections = raw.split(/\n\n+/).map((s) => s.trim()).filter(Boolean);
  if (sections.length === 0) return "N/A";
  const parts = sections
    .map((section) => to_display_html(section))
    .filter((html) => html.length > 0);
  if (parts.length === 0) return "N/A";
  return parts.join('<div class="solped-rich-sep" aria-hidden="true"></div>');
}
