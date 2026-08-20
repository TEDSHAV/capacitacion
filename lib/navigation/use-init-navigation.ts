"use client";

import { useEffect } from "react";
import { cacheNavigationConfig } from "@/lib/offline/cache-navigation";

/**
 * Hook to initialize navigation caching on app load
 * Should be called once in a root layout or app component
 */
export function useInitNavigation(): void {
  useEffect(() => {
    // Cache navigation config for offline use
    cacheNavigationConfig().catch((error) => {
      console.error("Failed to initialize navigation cache:", error);
    });
  }, []);
}
