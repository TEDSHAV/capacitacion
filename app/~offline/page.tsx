"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { WifiOff, ArrowLeft, Home, RefreshCw, FileStack } from "lucide-react";

export default function OfflinePage() {
  const [cachedPages, setCachedPages] = useState<{ url: string; label: string }[]>([]);

  useEffect(() => {
    // Try to find cached portal pages so the user can navigate to them
    const findCachedPages = async () => {
      if (!("caches" in window)) return;
      try {
        const cache = await caches.open("portal-pages");
        const requests = await cache.keys();
        const portalPages = requests
          .map((req) => {
            const url = new URL(req.url);
            // Skip RSC prefetch requests and API calls
            if (url.searchParams.has("_rsc")) return null;
            return url.pathname + url.search;
          })
          .filter((path): path is string => {
            if (!path) return false;
            return path.startsWith("/portal/") && !path.startsWith("/portal/") === false;
          })
          .filter((path) => path.startsWith("/portal/"));

        // Deduplicate and label
        const unique = [...new Set(portalPages)].slice(0, 8);
        const labeled = unique.map((url) => {
          if (url.includes("/facilitador/dashboard"))
            return { url, label: "Panel de Facilitador" };
          if (url.includes("/facilitador/osi/"))
            return { url, label: `OSI ${url.split("/osi/")[1]}` };
          if (url.includes("/facilitador/login"))
            return { url, label: "Login Facilitador" };
          if (url.includes("/cliente/dashboard"))
            return { url, label: "Panel de Cliente" };
          if (url.includes("/cliente/login"))
            return { url, label: "Login Cliente" };
          if (url === "/portal")
            return { url, label: "Selección de Portal" };
          return { url, label: url };
        });
        setCachedPages(labeled);
      } catch {
        // Cache API not available — non-fatal
      }
    };
    findCachedPages();
  }, []);

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
                window.location.href = "/portal";
              }
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver atrás
          </button>
        </div>

        {/* Cached pages list */}
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

        {/* Portal selection link */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <Link
            href="/portal"
            className="inline-flex items-center gap-2 text-sm text-blue-700 hover:text-blue-800 font-medium"
          >
            <Home className="w-4 h-4" />
            Ir a selección de portal
          </Link>
        </div>
      </div>
    </div>
  );
}
