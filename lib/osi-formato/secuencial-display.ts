export function parseOsiSecuencialNumeric(raw: unknown): number | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s === "") return null;
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  const pending = s.match(/^PEN-(\d+)$/i);
  if (pending) {
    const n = Number.parseInt(pending[1], 10);
    return Number.isFinite(n) ? n : null;
  }
  const legacy = s.match(/^OSI-\d{4}-(\d+)$/i);
  if (legacy) {
    const n = Number.parseInt(legacy[1], 10);
    return Number.isFinite(n) ? n : null;
  }
  const tail = s.match(/(\d+)$/);
  if (tail) {
    const n = Number.parseInt(tail[1], 10);
    return Number.isFinite(n) ? n : null;
  }
  const digits = s.replace(/\D/g, "");
  if (digits) {
    const n = Number.parseInt(digits, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function formatOsiSecuencialNro(raw: unknown): string {
  if (raw == null) return "";
  const source = String(raw).trim();
  if (/^PEN-\d+$/i.test(source)) {
    const n = parseOsiSecuencialNumeric(source);
    return n == null ? source.toUpperCase() : `PEN-${n}`;
  }
  const n = parseOsiSecuencialNumeric(raw);
  return n == null ? "" : String(n);
}
