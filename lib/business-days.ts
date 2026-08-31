/**
 * Business day calculation utilities.
 *
 * A "business day" is a weekday (Mon–Fri) that is not a Venezuelan national
 * holiday. The holiday set is provided by the caller as a Set of "YYYY-MM-DD"
 * strings (from the cat_feriados_venezuela table).
 *
 * The plazo for certificate issuance counts business days INCLUSIVE of both the
 * execution date and the issuance date. Execution day = day 1.
 *
 * Examples (no holidays):
 *   Mon → Wed = 3  (Mon, Tue, Wed)
 *   Fri → Tue = 3  (Fri, Mon, Tue)
 *   Mon → Mon = 1  (same day)
 *   Mon → Sun = 5  (Mon–Fri)
 */

/** Format a Date as "YYYY-MM-DD" in local time. */
export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse a date string (YYYY-MM-DD or ISO timestamp) into a local Date at midnight.
 *
 * Handles three cases:
 * 1. Date-only "YYYY-MM-DD" → parsed as local midnight (no timezone issues)
 * 2. ISO timestamp WITH timezone suffix (Z or ±HH:MM) → parsed by JS, extract
 *    the UTC date (since the timestamp is in UTC, the UTC date is the real date)
 * 3. ISO timestamp WITHOUT timezone suffix → Supabase returns TIMESTAMPTZ
 *    values without a Z, but they're actually UTC. We append Z and extract
 *    the UTC date. Without this, JS treats them as local time, which can
 *    shift the date by 1 day for timestamps between 00:00-03:59 UTC
 *    (20:00-23:59 previous day in Venezuela UTC-4).
 */
export function parseDate(s: string): Date {
  // Case 1: date-only string → parse as local midnight
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  // Case 2 & 3: timestamp string
  // Check if it already has a timezone suffix (Z, +HH:MM, or -HH:MM)
  const hasTz = /[Zz]$|[+-]\d{2}:\d{2}$/.test(s);
  const isoStr = hasTz ? s : s + "Z";
  const d = new Date(isoStr);

  // Extract the UTC date components — these represent the actual calendar
  // date since the timestamp is in UTC
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Check if a Date is a weekday (Mon–Fri). */
function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6; // Sun or Sat
}

/** Check if a date is a business day (weekday and not a holiday). */
export function isBusinessDay(d: Date, holidays: Set<string>): boolean {
  if (isWeekend(d)) return false;
  if (holidays.has(toDateStr(d))) return false;
  return true;
}

/**
 * Count business days in the inclusive range [start, end].
 * Both start and end are counted if they are business days.
 *
 * If end < start (e.g. pre-generated certificate), returns 0.
 *
 * @param start Execution date (day 1)
 * @param end Certificate issuance date
 * @param holidays Set of "YYYY-MM-DD" holiday strings
 * @returns Number of business days in [start, end], or 0 if end < start
 */
export function businessDaysInclusive(
  start: Date,
  end: Date,
  holidays: Set<string>,
): number {
  // Normalize to midnight
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  if (e < s) return 0; // pre-generated cert

  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    if (isBusinessDay(cur, holidays)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/**
 * Add N business days to a start date, returning the resulting date.
 * If start is a non-business day, counting begins from the next business day.
 *
 * @param start The reference date
 * @param days Number of business days to add (must be >= 0)
 * @param holidays Set of "YYYY-MM-DD" holiday strings
 * @returns The date that is `days` business days after start
 */
export function addBusinessDays(
  start: Date,
  days: number,
  holidays: Set<string>,
): Date {
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  let added = 0;
  while (added < days) {
    cur.setDate(cur.getDate() + 1);
    if (isBusinessDay(cur, holidays)) added++;
  }
  return cur;
}

/**
 * Compute the plazo deadline: the date that is `slaDays` business days
 * inclusive of the start date. E.g. slaDays=3, start=Mon → deadline=Wed.
 *
 * @param start Execution date
 * @param slaDays Plazo threshold in business days (inclusive)
 * @param holidays Set of "YYYY-MM-DD" holiday strings
 * @returns The deadline date (cert must be issued on or before this date)
 */
export function slaDeadline(
  start: Date,
  slaDays: number,
  holidays: Set<string>,
): Date {
  // slaDays inclusive means: start=day 1, so we need (slaDays - 1) more business days
  return addBusinessDays(start, slaDays - 1, holidays);
}
