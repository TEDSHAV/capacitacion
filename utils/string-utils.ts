/**
 * Convert a string to lower case
 */
export function toLowerCase(str: string): string {
  if (!str) return str;
  return str.toLowerCase();
}

/**
 * Convert a string to title case (first letter of each word capitalized)
 * Example: "juan perez" -> "Juan Perez"
 */
export function toTitleCase(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .trim()
    .split(/\s+/)
    .map(word => (word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : ""))
    .join(' ');
}

/**
 * Mask a name for privacy (e.g., "JUAN PEREZ" -> "J*** P***")
 */
export function maskName(name: string): string {
  if (!name) return name;
  return name
    .split(" ")
    .map((part) => {
      if (part.length <= 1) return part;
      return part.charAt(0) + "*".repeat(Math.min(part.length - 1, 3));
    })
    .join(" ");
}

/**
 * Normalize a Venezuelan phone number so it always starts with a leading "0"
 * and contains only digits (e.g. "412-4287870" -> "04124287870", "+58 424 1692349" -> "04241692349").
 */
export function normalizePhoneNumber(raw: string | null | undefined): string {
  if (!raw) return "";
  let digits = String(raw).replace(/\D/g, "");
  if (!digits) return "";
  // Strip country code 58 if followed by a 10-digit Venezuelan number
  if (digits.startsWith("58") && digits.length >= 12) {
    digits = digits.slice(2);
  }
  // Prepend leading 0 if 10 digits starting with 4 or 2 (e.g. 412..., 414..., 424..., 416..., 426..., 212...)
  if (digits.length === 10 && !digits.startsWith("0")) {
    digits = "0" + digits;
  } else if (!digits.startsWith("0") && /^[24]\d{9,}$/.test(digits)) {
    digits = "0" + digits;
  }
  return digits;
}

/**
 * Normalize a Venezuelan cédula so it always has the format "V-12345678" or "E-12345678"
 * (uppercase V/E prefix, hyphen, digits only without dots or spaces).
 */
export function normalizeCedula(raw: string | null | undefined): string {
  if (!raw) return "";
  const trimmed = String(raw).trim();
  if (!trimmed) return "";
  const prefixMatch = trimmed.match(/^\s*([vVeE])/);
  const prefix = prefixMatch ? prefixMatch[1].toUpperCase() : "V";
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  return `${prefix}-${digits}`;
}

const UPPERCASE_ACRONYMS = new Set([
  "tsu",
  "t.s.u.",
  "pnf",
  "msc",
  "m.sc.",
  "phd",
  "rrhh",
  "inpsasel",
  "lopcymat",
  "iso",
  "sha",
  "osi",
]);

/**
 * Standardize academic / professional profile strings to clean Title Case
 * while keeping common Spanish prepositions lowercase and acronyms uppercase.
 */
export function formatAcademicTitle(str: string | null | undefined): string {
  if (!str) return "";
  const minorWords = new Set(["de", "del", "en", "y", "e", "o", "u", "para", "con", "por", "a", "la", "las", "el", "los"]);
  return str
    .trim()
    .split(/\s+/)
    .map((word, index) => {
      const lower = word.toLowerCase();
      const cleanAlpha = lower.replace(/[^a-záéíóúñ.]/g, "");
      if (UPPERCASE_ACRONYMS.has(cleanAlpha)) {
        return word.toUpperCase();
      }
      if (index > 0 && minorWords.has(lower)) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

/**
 * Standardize observation/note text to clean Sentence case
 * (capitalizes first letter and after periods, avoids ALL CAPS or all lowercase).
 */
export function formatSentenceCase(str: string | null | undefined): string {
  if (!str) return "";
  const trimmed = str.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  // If string is all uppercase or starts with lowercase, normalize sentence casing
  const isAllUpper = trimmed === trimmed.toUpperCase() && trimmed !== trimmed.toLowerCase();
  const base = isAllUpper ? trimmed.toLowerCase() : trimmed;
  return base.replace(/(^\s*[a-záéíóúñ]|[.]\s+[a-záéíóúñ])/g, (match) =>
    match.toUpperCase()
  );
}

