"use client";

import { WifiOff, RefreshCw } from "lucide-react";

interface CachedDataBannerProps {
  cachedAt?: number | null;
  isOnline?: boolean;
}

/**
 * Helper to compute relative time string from a timestamp.
 * Extracted outside component to avoid purity warnings.
 */
function getRelativeTime(timestamp: number | null | undefined): string {
  if (!timestamp) return "";

  const ageMs = Date.now() - timestamp;
  const ageSeconds = Math.floor(ageMs / 1000);
  const ageMinutes = Math.floor(ageSeconds / 60);
  const ageHours = Math.floor(ageMinutes / 60);
  const ageDays = Math.floor(ageHours / 24);

  if (ageSeconds < 60) return "hace unos segundos";
  if (ageMinutes < 60) return `hace ${ageMinutes} min`;
  if (ageHours < 24) return `hace ${ageHours} h`;
  return `hace ${ageDays} d`;
}

/**
 * Banner shown when displaying cached/offline data.
 * - When online: shows a soft "Actualizando datos" message (cached data is
 *   shown instantly while a background refresh runs).
 * - When offline: shows the amber "Sin conexión" warning.
 * Displays relative age (e.g., "hace 5 min") if cachedAt is provided.
 */
export function CachedDataBanner({ cachedAt, isOnline = true }: CachedDataBannerProps) {
  const relativeAge = getRelativeTime(cachedAt);

  if (isOnline) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
        <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
        <span>
          Actualizando datos
          {relativeAge && ` · última versión ${relativeAge}`}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>
        Sin conexión — mostrando datos guardados
        {relativeAge && ` (${relativeAge})`}
      </span>
    </div>
  );
}
