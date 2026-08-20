"use client";

import { useEffect } from "react";
import { cacheNavigationConfig } from "@/lib/offline/cache-navigation";

// Module-level guard so the cache write runs once per browser session,
// not once per layout mount (dashboard + portal layouts both call this).
let navigationInitialized = false;

/**
 * Hook to initialize navigation caching on app load
 * Should be called once in a root layout or app component
 */
export function useInitNavigation(): void {
  useEffect(() => {
    if (navigationInitialized) return;
    navigationInitialized = true;

    // Cache navigation config for offline use
    cacheNavigationConfig().catch((error) => {
      console.error("Failed to initialize navigation cache:", error);
      // Allow retry on next mount if it failed
      navigationInitialized = false;
    });
  }, []);
}
