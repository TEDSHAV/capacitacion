"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { WifiOff, ArrowLeft, Home, RefreshCw, FileStack } from "lucide-react";

type OfflineContext = "dashboard" | "portal-facilitador" | "portal-cliente" | "unknown";

function detectContext(): OfflineContext {
  if (typeof window === "undefined") return "unknown";
  // Use the referrer (the page that triggered the offline fallback) to detect context.
  // document.referrer may be empty on hard reload — fall back to history state.
  const referrer = document.referrer;
  const currentPath = window.location.pathname;

  // Try referrer first
  if (referrer) {
    try {
      const refUrl = new URL(referrer);
      if (refUrl.pathname.startsWith("/dashboard")) return "dashboard";
      if (refUrl.pathname.startsWith("/portal/facilitador")) return "portal-facilitador";
      if (refUrl.pathname.startsWith("/portal/cliente")) return "portal-cliente";
    } catch {
      // Invalid referrer — fall through
    }
  }

  // Fall back to current path (in case the offline page itself is the URL)
  if (currentPath.startsWith("/dashboard")) return "dashboard";
  if (currentPath.startsWith("/portal/facilitador")) return "portal-facilitador";
  if (currentPath.startsWith("/portal/cliente")) return "portal-cliente";

  return "unknown";
}

function getContextHome(context: OfflineContext): string {
  switch (context) {
    case "dashboard":
      return "/dashboard/capacitacion";
    case "portal-facilitador":
      return "/portal/facilitador/dashboard";
    case "portal-cliente":
      return "/portal/cliente/dashboard";
    default:
      return "/portal";
  }
}

function getContextHomeLabel(context: OfflineContext): string {
  switch (context) {
    case "dashboard":
      return "Dashboard de Administración";
    case "portal-facilitador":
      return "Panel de Facilitador";
    case "portal-cliente":
      return "Panel de Cliente";
    default:
      return "Selección de Portal";
  }
}

function getContextCacheName(context: OfflineContext): string | null {
  switch (context) {
    case "dashboard":
      return "dashboard-pages";
    case "portal-facilitador":
    case "portal-cliente":
      return "portal-pages";
    default:
      return null;
  }
}

function getContextPathPrefix(context: OfflineContext): string | null {
  switch (context) {
    case "dashboard":
      return "/dashboard";
    case "portal-facilitador":
      return "/portal/facilitador";
    case "portal-cliente":
      return "/portal/cliente";
    default:
      return null;
  }
}

function labelForPath(path: string): string {
  if (path.includes("/facilitador/dashboard"))
    return "Panel de Facilitador";
  if (path.includes("/facilitador/osi/"))
    return `OSI ${path.split("/osi/")[1]}`;
  if (path.includes("/cliente/dashboard"))
    return "Panel de Cliente";
  if (path === "/dashboard/capacitacion")
    return "Dashboard de Administración";
  if (path.includes("/dashboard/capacitacion/")) {
    const segment = path.split("/capacitacion/")[1]?.replace(/-/g, " ");
    return segment
      ? segment.charAt(0).toUpperCase() + segment.slice(1)
      : path;
  }
  return path;
}

export default function OfflinePage() {
  const [cachedPages, setCachedPages] = useState<{ url: string; label: string }[]>([]);
  const [context, setContext] = useState<OfflineContext>("unknown");

  useEffect(() => {
    const detected = detectContext();
    setContext(detected);

    const findCachedPages = async () => {
      if (!("caches" in window)) return;

      const cacheName = getContextCacheName(detected);
      const pathPrefix = getContextPathPrefix(detected);
      if (!cacheName || !pathPrefix) return;

      try {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        const pages = requests
          .map((req) => {
            const url = new URL(req.url);
            // Skip RSC prefetch requests and API calls
            if (url.searchParams.has("_rsc")) return null;
            return url.pathname + url.search;
          })
          .filter((path): path is string => {
            if (!path) return false;
            // STRICT: only show pages from the same context
            return path.startsWith(pathPrefix);
          });

        // Deduplicate and label
        const unique = [...new Set(pages)].slice(0, 8);
        const labeled = unique.map((url) => ({
          url,
          label: labelForPath(url),
        }));
        setCachedPages(labeled);
      } catch {
        // Cache API not available — non-fatal
      }
    };
    findCachedPages();
  }, []);

  const homeHref = getContextHome(context);
  const homeLabel = getContextHomeLabel(context);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-gray-100 p-8 text-center">
        <div className="flex flex-col items-center mb-6">
          <Image
            src="/logo.png"
            alt="SHA de Venezuela"
            width={96}
            height={96}
            className="w-24 h-24 object-contain mb-4"
          />
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <WifiOff className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Sin conexión</h1>
        </div>
        <p className="text-gray-600 mb-2">
          No tienes conexión a internet en este momento.
        </p>
        <p className="text-gray-500 text-sm mb-6">
          Las páginas que ya has visitado siguen disponibles. Tu conexión
          se restablecerá automáticamente cuando vuelvas a estar en línea.
        </p>

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0c3f69] text-white rounded-lg font-medium hover:bg-[#0a344f] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </button>

          <button
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                window.location.href = homeHref;
              }
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver atrás
          </button>
        </div>

        {/* Cached pages list — context-scoped */}
        {cachedPages.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <FileStack className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Páginas disponibles offline
              </p>
            </div>
            <div className="space-y-1.5">
              {cachedPages.map((page) => (
                <Link
                  key={page.url}
                  href={page.url}
                  className="block px-4 py-2.5 text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
                >
                  {page.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Context-aware home link */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <Link
            href={homeHref}
            className="inline-flex items-center gap-2 text-sm text-blue-700 hover:text-blue-800 font-medium"
          >
            <Home className="w-4 h-4" />
            Ir a {homeLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
