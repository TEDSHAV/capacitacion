"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { PWATopNav } from "./PWATopNav";
import { PWANavDrawer } from "./PWANavDrawer";
import { PWABreadcrumb } from "./PWABreadcrumb";
import { OfflineIndicator } from "./OfflineIndicator";
import { SyncBadge } from "./SyncBadge";
import { useNavigationContext } from "@/lib/navigation/use-navigation-context";
import { useInitNavigation } from "@/lib/navigation/use-init-navigation";
import { useKeyboardShortcuts, COMMON_SHORTCUTS } from "@/lib/navigation/use-keyboard-shortcuts";
import { getNavigationForContext } from "@/lib/navigation/navigation-config";

const SIDEBAR_STORAGE_KEY = "pwa_sidebar_open";

interface PWALayoutProps {
  children: React.ReactNode;
  title?: string;
  userName?: string;
  onLogout?: () => void;
}

export function PWALayout({
  children,
  title,
  userName,
  onLogout,
}: PWALayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const context = useNavigationContext();

  // Initialize navigation caching on first load
  useInitNavigation();

  // Restore sidebar state from localStorage (desktop preference)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (stored !== null) {
        setIsMenuOpen(stored === "true");
      } else {
        // Default open on desktop, closed on mobile
        setIsMenuOpen(window.innerWidth >= 768);
      }
    } catch {
      setIsMenuOpen(false);
    }
  }, []);

  // Persist sidebar state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isMenuOpen));
    } catch {
      // Non-fatal
    }
  }, [isMenuOpen]);

  // Close sidebar on route change (mobile behavior)
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsMenuOpen(false);
    }
  }, [pathname]);

  // Set up keyboard shortcuts
  useKeyboardShortcuts([
    {
      ...COMMON_SHORTCUTS.MENU_TOGGLE,
      handler: () => setIsMenuOpen(!isMenuOpen),
    },
  ]);

  // Get current page title from navigation if not provided
  let pageTitle = title;
  if (!pageTitle) {
    const nav = getNavigationForContext(context);
    const findTitle = (items: any[]): string | undefined => {
      for (const item of items) {
        if (item.href === pathname) return item.label;
        if (item.children) {
          const found = findTitle(item.children);
          if (found) return found;
        }
      }
      return undefined;
    };
    pageTitle = findTitle(nav);
  }

  // Login pages render bare — no navbar/sidebar/chrome.
  // Login forms handle their own layout and offline UI.
  const isLoginPage = pathname.endsWith("/login");

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navigation */}
      <PWATopNav
        title={pageTitle}
        context={context}
        userName={userName}
        onLogout={onLogout}
        onSearchOpen={() => setIsMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Drawer */}
        <PWANavDrawer
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          onToggle={() => setIsMenuOpen(!isMenuOpen)}
          context={context}
          currentPath={pathname}
        />

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {/* Breadcrumb */}
          <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-3">
            <PWABreadcrumb />
          </div>

          {/* Page Content */}
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>

      {/* Offline Indicators (bottom right) */}
      <OfflineIndicator />
      <SyncBadge />
    </div>
  );
}
