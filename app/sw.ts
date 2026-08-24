/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";
import { CacheFirst, NetworkFirst, StaleWhileRevalidate, ExpirationPlugin } from "serwist";

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
    // --- RSC payloads (client-side navigations): NetworkFirst with cache fallback ---
    // Next.js App Router fetches RSC payloads (?_rsc=...) for client-side navigations.
    // Caching these lets the router render previously-visited pages offline (e.g. logo click).
    // Kept separate from the document cache to avoid polluting HTML entries.
    {
      matcher: ({ url, request }) =>
        request.mode !== "navigate" &&
        url.searchParams.has("_rsc") &&
        (url.pathname.startsWith("/portal/facilitador") ||
          url.pathname.startsWith("/portal/cliente") ||
          url.pathname.startsWith("/dashboard") ||
          url.pathname.startsWith("/survey/") ||
          url.pathname.startsWith("/verify-certificate/")),
      handler: new NetworkFirst({
        cacheName: "rsc-payloads",
        networkTimeoutSeconds: 5,
        plugins: [
          {
            cacheWillUpdate: async ({ response }) => {
              if (response && response.status === 200 && !response.redirected) {
                return response;
              }
              return null;
            },
          },
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
          }),
        ],
      }),
    },

    // --- Root launch page (documents only): NetworkFirst with cache fallback ---
    // The PWA start_url is "/", so the root page must be cached for offline
    // launches. The page itself is a client-side redirect to the dashboard
    // (or the captured portal install path), so caching it ensures the
    // redirect logic runs offline instead of showing a blank screen.
    {
      matcher: ({ url, request }) =>
        request.mode === "navigate" && url.pathname === "/",
      handler: new NetworkFirst({
        cacheName: "root-pages",
        networkTimeoutSeconds: 5,
        plugins: [
          {
            cacheWillUpdate: async ({ response }) => {
              if (response && response.status === 200 && !response.redirected) {
                return response;
              }
              return null;
            },
          },
        ],
      }),
    },

    // --- Portal navigations (documents only): NetworkFirst with cache fallback ---
    // Allows previously-visited portal pages to render offline on hard load/reload.
    {
      matcher: ({ url, request }) =>
        request.mode === "navigate" &&
        (url.pathname.startsWith("/portal/facilitador") ||
          url.pathname.startsWith("/portal/cliente")),
      handler: new NetworkFirst({
        cacheName: "portal-pages",
        networkTimeoutSeconds: 5,
        plugins: [
          {
            cacheWillUpdate: async ({ response }) => {
              // Only cache successful responses (avoid caching redirects/auth errors)
              if (response && response.status === 200 && !response.redirected) {
                return response;
              }
              return null;
            },
          },
        ],
      }),
    },

    // --- Dashboard navigations (documents only): NetworkFirst with cache fallback ---
    {
      matcher: ({ url, request }) =>
        request.mode === "navigate" && url.pathname.startsWith("/dashboard"),
      handler: new NetworkFirst({
        cacheName: "dashboard-pages",
        networkTimeoutSeconds: 5,
        plugins: [
          {
            cacheWillUpdate: async ({ response }) => {
              if (response && response.status === 200 && !response.redirected) {
                return response;
              }
              return null;
            },
          },
        ],
      }),
    },

    // --- Survey & certificate verification pages (documents only) ---
    {
      matcher: ({ url, request }) =>
        request.mode === "navigate" &&
        (url.pathname.startsWith("/survey/") ||
          url.pathname.startsWith("/verify-certificate/")),
      handler: new NetworkFirst({
        cacheName: "public-pages",
        networkTimeoutSeconds: 5,
        plugins: [
          {
            cacheWillUpdate: async ({ response }) => {
              if (response && response.status === 200 && !response.redirected) {
                return response;
              }
              return null;
            },
          },
        ],
      }),
    },

    // --- Read-only JSON APIs used by public pages ---
    // Verify certificate and carnet lookup endpoints.
    {
      matcher: ({ url }) =>
        url.pathname.startsWith("/api/verify-certificate/") ||
        url.pathname.startsWith("/api/carnets/by-certificate/"),
      handler: new NetworkFirst({
        cacheName: "public-api",
        networkTimeoutSeconds: 8,
        plugins: [
          {
            cacheWillUpdate: async ({ response }) => {
              if (response && response.status === 200 && !response.redirected) {
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
      // For dashboard pages not in cache, try the home page
      {
        url: "/dashboard/capacitacion",
        matcher({ request }) {
          if (request.destination !== "document") return false;
          try {
            return new URL(request.url).pathname.startsWith("/dashboard");
          } catch {
            return false;
          }
        },
      },
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
