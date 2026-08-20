"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { validateUrlForContext, type NavigationContext } from "./navigation-config";

export interface RecentPage {
  id: string;
  label: string;
  href: string;
  visitedAt: number;
}

const MAX_RECENT_PAGES = 5;

/**
 * Hook for tracking recently visited pages
 * Persists to localStorage, scoped per navigation context for strict isolation.
 */
export function useRecentPages(context: NavigationContext) {
  const STORAGE_KEY = `pwa_recent_pages_${context}`;
  const pathname = usePathname();
  const [recentPages, setRecentPages] = useState<RecentPage[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: RecentPage[] = JSON.parse(stored);
        // Safety filter: only keep entries that belong to this context
        const filtered = parsed.filter((p) =>
          validateUrlForContext(p.href, context)
        );
        setRecentPages(filtered);
        if (filtered.length !== parsed.length) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        }
      }
    } catch (error) {
      console.error("Error loading recent pages:", error);
    }
    setIsLoaded(true);
  }, [STORAGE_KEY, context]);

  // Track current page — only if it belongs to this context
  useEffect(() => {
    if (!isLoaded || !pathname) return;
    // Only track pages that belong to the current context
    if (!validateUrlForContext(pathname, context)) return;

    // Extract page label from pathname
    const segments = pathname.split("/").filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    const label = lastSegment
      ?.split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ") || "Home";

    setRecentPages((prev) => {
      // Remove if already exists
      const filtered = prev.filter((p) => p.href !== pathname);

      // Add to front
      const updated = [
        {
          id: `${pathname}-${Date.now()}`,
          label,
          href: pathname,
          visitedAt: Date.now(),
        },
        ...filtered,
      ];

      // Keep only last 5
      return updated.slice(0, MAX_RECENT_PAGES);
    });
  }, [pathname, isLoaded, context]);

  // Save to localStorage whenever recent pages change
  useEffect(() => {
    if (isLoaded && recentPages.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(recentPages));
      } catch (error) {
        console.error("Error saving recent pages:", error);
      }
    }
  }, [recentPages, isLoaded, STORAGE_KEY]);

  const clearRecentPages = () => {
    setRecentPages([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Error clearing recent pages:", error);
    }
  };

  return {
    recentPages,
    clearRecentPages,
    isLoaded,
  };
}
