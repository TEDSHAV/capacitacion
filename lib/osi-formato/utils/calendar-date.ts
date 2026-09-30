export function parseCalendarDayLocal(value: unknown): Date | null {
  if (value == null) {
    return null;
  }
  const text = String(value).trim();
  if (!text) {
    return null;
  }

  const isoDay = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDay) {
    const year = Number(isoDay[1]);
    const month = Number(isoDay[2]) - 1;
    const day = Number(isoDay[3]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      return null;
    }
    const date = new Date(year, month, day);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    date.setHours(0, 0, 0, 0);
    return date;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

export function formatCalendarDayEsVe(value: unknown): string {
  const date = parseCalendarDayLocal(value);
  if (!date) {
    return "N/A";
  }
  return date.toLocaleDateString("es-VE");
}

/** Formato 12 h con AM/PM para horas de sesión (ej. 08:00 → 8:00 AM). */
export function formatTimeAmPmEsVe(value: unknown): string {
  if (value == null) return "N/A";
  const text = String(value).trim();
  if (!text) return "N/A";

  const match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (!match) return text;

  const hours24 = Number(match[1]);
  const minutes = match[2];
  if (!Number.isFinite(hours24) || hours24 < 0 || hours24 > 23) return text;

  const period = hours24 >= 12 ? "PM" : "AM";
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;

  return `${hours12}:${minutes} ${period}`;
}
