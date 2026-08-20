"use client";

import { useState, useEffect } from "react";

export interface Favorite {
  id: string;
  label: string;
  href: string;
  icon?: string;
  addedAt: number;
}

const FAVORITES_STORAGE_KEY = "pwa_favorites";

/**
 * Hook for managing favorite/bookmarked pages
 * Persists to localStorage
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading favorites:", error);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever favorites change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
      } catch (error) {
        console.error("Error saving favorites:", error);
      }
    }
  }, [favorites, isLoaded]);

  const addFavorite = (favorite: Omit<Favorite, "addedAt">) => {
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
