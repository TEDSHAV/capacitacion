"use client";

import { useEffect } from "react";

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  handler: () => void;
}

/**
 * Hook for registering keyboard shortcuts
 * Handles Ctrl+K, Alt+N, etc.
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const matches =
          e.key.toLowerCase() === shortcut.key.toLowerCase() &&
          (shortcut.ctrlKey === undefined || e.ctrlKey === shortcut.ctrlKey) &&
          (shortcut.shiftKey === undefined || e.shiftKey === shortcut.shiftKey) &&
          (shortcut.altKey === undefined || e.altKey === shortcut.altKey) &&
          (shortcut.metaKey === undefined || e.metaKey === shortcut.metaKey);

        if (matches) {
          e.preventDefault();
          shortcut.handler();
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}

/**
 * Common keyboard shortcuts
 */
export const COMMON_SHORTCUTS = {
  SEARCH: { key: "k", ctrlKey: true }, // Ctrl+K
  MENU_TOGGLE: { key: "n", altKey: true }, // Alt+N
  ESCAPE: { key: "Escape" }, // Escape
};
