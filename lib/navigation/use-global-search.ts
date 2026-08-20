"use client";

import { useState, useCallback, useMemo } from "react";
import { getNavigationForContext, type NavigationContext, type NavItem } from "./navigation-config";

export interface SearchResult {
  id: string;
  label: string;
  href: string;
  breadcrumb: string;
  icon?: any;
}

/**
 * Hook for global search across navigation items
 * Searches by label and breadcrumb path
 */
export function useGlobalSearch(context: NavigationContext) {
  const [query, setQuery] = useState("");
  const navItems = getNavigationForContext(context);

  // Flatten navigation tree for searching
  const flattenedItems = useMemo(() => {
    const results: SearchResult[] = [];

    const flatten = (items: NavItem[], breadcrumb: string[] = []) => {
      for (const item of items) {
        const currentBreadcrumb = [...breadcrumb, item.label];
        results.push({
          id: item.id,
          label: item.label,
          href: item.href,
          breadcrumb: currentBreadcrumb.join(" > "),
          icon: item.icon,
        });

        if (item.children) {
          flatten(item.children, currentBreadcrumb);
        }
      }
    };

    flatten(navItems);
    return results;
  }, [navItems]);

  // Search results
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase();
    return flattenedItems.filter(
      (item) =>
        item.label.toLowerCase().includes(lowerQuery) ||
        item.breadcrumb.toLowerCase().includes(lowerQuery)
    );
  }, [query, flattenedItems]);

  return {
    query,
    setQuery,
    results: searchResults,
    hasResults: searchResults.length > 0,
  };
}
