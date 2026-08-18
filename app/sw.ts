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

    // --- Default Serwist caching for _next/static, fonts, etc. ---
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
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
