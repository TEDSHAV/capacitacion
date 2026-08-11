import APP_VERSION from "./version.generated";

export { APP_VERSION };

/**
 * Build date as DD/MM/YYYY, or "" when the generator could not determine one.
 *
 * Formatted manually from UTC parts rather than via toLocaleDateString so the
 * output is identical on the server and in the browser, regardless of the host
 * locale, ICU build or timezone. That keeps it hydration-safe anywhere it is used.
 */
export function getBuildDate(): string {
  if (!APP_VERSION.date) return "";
  const d = new Date(APP_VERSION.date);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

/** Compact build identifier for UI display, e.g. "v1.5.0 · 11/08/2026". */
export function getBuildId(): string {
  return [APP_VERSION.version, getBuildDate()].filter(Boolean).join(" · ");
}

/** Verbose build detail, intended for a `title` tooltip. */
export function getBuildDetail(): string {
  const parts = [
    `Commit ${APP_VERSION.commit}`,
    `${APP_VERSION.commitCount} commits`,
    `rama ${APP_VERSION.branch}`,
  ];
  if (APP_VERSION.tag) parts.push(`tag ${APP_VERSION.tag}`);
  return parts.join(" · ");
}
