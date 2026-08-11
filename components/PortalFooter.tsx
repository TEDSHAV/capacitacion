import { getBuildDetail, getBuildId } from "@/lib/app-version";

/**
 * Footer for the facilitador and cliente portals.
 *
 * These portals are part of the Capacitación module of the PRISMA platform, so
 * they carry the ownership notice plus the running build version — useful when a
 * facilitador or client reports an issue.
 */
export default function PortalFooter() {
  const currentYear = new Date().getFullYear();
  const buildId = getBuildId();

  return (
    <footer className="mt-auto border-t border-gray-200 bg-white/50 print:hidden">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex flex-col items-center gap-2 text-center text-xs text-gray-500 sm:flex-row sm:justify-between sm:text-left">
          <div className="space-y-1">
            <p>
              © {currentYear} SHA de Venezuela, C.A. Todos los derechos
              reservados.
            </p>
            <p className="text-gray-400">
              Módulo de Capacitación — Plataforma PRISMA. Uso exclusivo para
              usuarios autorizados.
            </p>
          </div>
          {buildId && (
            <span
              title={getBuildDetail()}
              className="shrink-0 font-mono text-[11px] tabular-nums text-gray-400"
            >
              {buildId}
            </span>
          )}
        </div>
      </div>
    </footer>
  );
}
