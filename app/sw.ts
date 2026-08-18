/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from "serwist";

// This declares the value of `injectionPoint` to TypeScript.
// `injectionPoint` is the string that will be replaced by the
// actual precache manifest. By default, this string is set to
// `"self.__SW_MANIFEST"`.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // --- Portal navigations: NetworkFirst with cache fallback ---
    // Allows previously-visited portal pages to render offline.
    {
      matcher: ({ url }) =>
        url.pathname.startsWith("/portal/facilitador") ||
        url.pathname.startsWith("/portal/cliente"),
      handler: new NetworkFirst({
        cacheName: "portal-pages",
        networkTimeoutSeconds: 5,
        plugins: [
          {
            cacheWillUpdate: async ({ response }) => {
              // Only cache successful responses (avoid caching redirects/auth errors)
              if (response && response.status === 200) {
                return response;
              }
              return null;
            },
          },
        ],
      }),
    },

    // --- Supabase storage images: StaleWhileRevalidate ---
    // Profile photos, logos, signatures, attachments served from Supabase Storage.
    // Match any *.supabase.co hostname (covers storage + API).
    {
      matcher: ({ url }) => url.hostname.endsWith(".supabase.co"),
      handler: new StaleWhileRevalidate({
        cacheName: "supabase-images",
        plugins: [
          {
            cacheWillUpdate: async ({ response }) => {
              if (response && response.status === 200) {
                return response;
              }
              return null;
            },
          },
        ],
      }),
    },

    // --- Static assets in /public: CacheFirst ---
    // Logos, watermarks, template images — rarely change.
    {
      matcher: ({ url, request }) =>
        url.pathname.startsWith("/signatures/") ||
        url.pathname.startsWith("/templates/") ||
        (url.pathname.endsWith(".png") && request.destination === "image"),
      handler: new CacheFirst({
        cacheName: "static-images",
        plugins: [
          {
            cacheWillUpdate: async ({ response }) => {
              if (response && response.status === 200) {
                return response;
              }
              return null;
            },
          },
        ],
      }),
    },

    // --- Offline documents: CacheFirst for saved PDFs/ZIPs ---
    // These are explicitly cached by the offline-documents utility (Cache API).
    // The SW checks the "offline-documents" cache first so saved documents
    // open without network. Falls back to network if not cached.
    {
      matcher: ({ url }) =>
        url.pathname.startsWith("/api/generate-certificate-pdf/") ||
        url.pathname.startsWith("/api/batch-download-osi/") ||
        url.pathname.startsWith("/api/batch-download-documents/") ||
        url.pathname.startsWith("/api/generate-carnet-pdf/"),
      handler: new NetworkFirst({
        cacheName: "offline-documents",
        networkTimeoutSeconds: 10,
        plugins: [
          {
            cacheWillUpdate: async ({ response }) => {
              // Only cache successful binary responses
              if (response && response.status === 200) {
                return response;
              }
              return null;
            },
          },
        ],
      }),
    },

    // --- Default Serwist caching for _next/static, fonts, etc. ---
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      // For portal facilitador pages not in cache, try the dashboard first
      // (it has the user's data and navigation), then fall back to offline page
      {
        url: "/portal/facilitador/dashboard",
        matcher({ request }) {
          if (request.destination !== "document") return false;
          try {
            const url = new URL(request.url);
            return url.pathname.startsWith("/portal/facilitador");
          } catch {
            return false;
          }
        },
      },
      // Same for cliente portal
      {
        url: "/portal/cliente/dashboard",
        matcher({ request }) {
          if (request.destination !== "document") return false;
          try {
            const url = new URL(request.url);
            return url.pathname.startsWith("/portal/cliente");
          } catch {
            return false;
          }
        },
      },
      // Generic offline fallback for everything else
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
