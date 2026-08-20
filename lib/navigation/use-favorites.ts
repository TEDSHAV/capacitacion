"use client";

import { useState, useEffect } from "react";
import { validateUrlForContext, type NavigationContext } from "./navigation-config";

export interface Favorite {
  id: string;
  label: string;
  href: string;
  icon?: string;
  addedAt: number;
}

/**
 * Hook for managing favorite/bookmarked pages
 * Persists to localStorage, scoped per navigation context for strict isolation.
 */
export function useFavorites(context: NavigationContext) {
  const STORAGE_KEY = `pwa_favorites_${context}`;
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: Favorite[] = JSON.parse(stored);
        // Safety filter: only keep entries that belong to this context
        const filtered = parsed.filter((f) =>
          validateUrlForContext(f.href, context)
        );
        setFavorites(filtered);
        // If we filtered out stale entries, persist the cleaned list
        if (filtered.length !== parsed.length) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        }
      }
    } catch (error) {
      console.error("Error loading favorites:", error);
    }
    setIsLoaded(true);
  }, [STORAGE_KEY, context]);

  // Save to localStorage whenever favorites change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
      } catch (error) {
        console.error("Error saving favorites:", error);
      }
    }
  }, [favorites, isLoaded, STORAGE_KEY]);

  const addFavorite = (favorite: Omit<Favorite, "addedAt">) => {
    // Reject if the URL doesn't belong to this context
    if (!validateUrlForContext(favorite.href, context)) return;
    setFavorites((prev) => {
      // Don't add duplicates
      if (prev.some((f) => f.id === favorite.id)) {
        return prev;
      }
      return [...prev, { ...favorite, addedAt: Date.now() }];
    });
  };

  const removeFavorite = (id: string) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  };

  const isFavorite = (id: string) => {
    return favorites.some((f) => f.id === id);
  };

  const toggleFavorite = (favorite: Omit<Favorite, "addedAt">) => {
    if (isFavorite(favorite.id)) {
      removeFavorite(favorite.id);
    } else {
      addFavorite(favorite);
    }
  };

  return {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite,
    isLoaded,
  };
}
