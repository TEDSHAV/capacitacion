// Deterministic date formatter (d/m/yyyy) — avoids hydration mismatches caused
// by locale-dependent toLocaleDateString() producing different output on the
// server vs the client.
export function formatDate(date: Date): string {
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

// Format a date-only string (YYYY-MM-DD, as returned by Supabase for Postgres
// `date` columns and by `to_char(fecha, 'YYYY-MM-DD')` in JSONB views) without
// timezone offset shifting. A bare `new Date("2026-09-04")` is parsed as UTC
// midnight per the JS spec, but `new Date("2026-09-04T00:00:00")` (no Z) is
// parsed as LOCAL midnight — which shifts the UTC instant depending on the
// user's tz and can render the wrong day when combined with `timeZone: "UTC"`.
// So for date-only strings we append `T00:00:00Z` (explicit UTC) and format
// with `timeZone: "UTC"`, preserving the calendar day the DB actually stored
// regardless of the viewer's timezone. Full timestamps (with a time component)
// are passed through unchanged.
export function formatDateOnly(
  dateStr: string | null | undefined,
  locale = "es-VE",
  options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" },
): string {
  if (!dateStr) return "—";
  const iso = dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00Z`;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(locale, { ...options, timeZone: "UTC" });
}
