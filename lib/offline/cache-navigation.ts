"use client";

import { cachePortalData, getCachedPortalData } from "./portal-data-cache";
import { NAVIGATION_CONFIG, type NavigationContext } from "@/lib/navigation/navigation-config";

/**
 * Cache navigation configuration for offline use
 * Called once on app initialization
 */
export async function cacheNavigationConfig(): Promise<void> {
  try {
    // Cache the entire navigation config
    await cachePortalData(
      "navigation_config",
      "dash_home",
      NAVIGATION_CONFIG
    );
  } catch (error) {
    console.error("Error caching navigation config:", error);
  }
}

/**
 * Get cached navigation config for offline use
 */
export async function getCachedNavigationConfig() {
  try {
    const cached = await getCachedPortalData(
      "navigation_config"
    );
    return cached?.data || NAVIGATION_CONFIG;
  } catch (error) {
    console.error("Error retrieving cached navigation config:", error);
    return NAVIGATION_CONFIG;
  }
}

/**
 * Clear cached navigation config
 */
export async function clearCachedNavigationConfig(): Promise<void> {
  try {
    const { removeCachedPortalData } = await import("./portal-data-cache");
    await removeCachedPortalData("navigation_config");
  } catch (error) {
    console.error("Error clearing cached navigation config:", error);
  }
}
