"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export interface RecentPage {
  id: string;
  label: string;
  href: string;
  visitedAt: number;
}

const RECENT_PAGES_STORAGE_KEY = "pwa_recent_pages";
const MAX_RECENT_PAGES = 5;

/**
 * Hook for tracking recently visited pages
 * Persists to localStorage, keeps last 5 pages
 */
export function useRecentPages() {
  const pathname = usePathname();
  const [recentPages, setRecentPages] = useState<RecentPage[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_PAGES_STORAGE_KEY);
      if (stored) {
        setRecentPages(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading recent pages:", error);
    }
    setIsLoaded(true);
  }, []);

  // Track current page
  useEffect(() => {
    if (!isLoaded || !pathname) return;

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
  }, [pathname, isLoaded]);

  // Save to localStorage whenever recent pages change
  useEffect(() => {
    if (isLoaded && recentPages.length > 0) {
      try {
        localStorage.setItem(RECENT_PAGES_STORAGE_KEY, JSON.stringify(recentPages));
      } catch (error) {
        console.error("Error saving recent pages:", error);
      }
    }
  }, [recentPages, isLoaded]);

  const clearRecentPages = () => {
    setRecentPages([]);
    try {
      localStorage.removeItem(RECENT_PAGES_STORAGE_KEY);
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
