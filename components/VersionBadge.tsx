import { getBuildDetail, getBuildId } from "@/lib/app-version";

/**
 * Small build-version marker pinned to the bottom-right of the viewport.
 *
 * Used on the dashboard, which is embedded in the PRISMA shell via iframe and
 * therefore renders no chrome of its own — without this the version would not be
 * visible anywhere in the embedded app.
 *
 * Deliberately defensive so it cannot interfere with the existing UI:
 *  - `pointer-events-none` so it can never swallow a click
 *  - `z-30`, below every modal/overlay in the app (which use z-50 and above)
 *  - `print:hidden` so it never leaks into printed or PDF-rendered documents
 */
export default function VersionBadge() {
  const buildId = getBuildId();
  if (!buildId) return null;

  return (
    <div
      aria-hidden="true"
      title={getBuildDetail()}
      className="pointer-events-none fixed bottom-2 right-2 z-30 select-none rounded border border-gray-200/60 bg-white/70 px-1.5 py-0.5 font-mono text-[10px] leading-none tracking-tight text-gray-400 tabular-nums shadow-sm backdrop-blur-sm print:hidden"
    >
      {buildId}
    </div>
  );
}
