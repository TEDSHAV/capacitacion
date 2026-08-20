"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { PWATopNav } from "./PWATopNav";
import { PWANavDrawer } from "./PWANavDrawer";
import { PWABreadcrumb } from "./PWABreadcrumb";
import { OfflineIndicator } from "./OfflineIndicator";
import { SyncBadge } from "./SyncBadge";
import { useNavigationContext } from "@/lib/navigation/use-navigation-context";
import { getNavigationForContext } from "@/lib/navigation/navigation-config";

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navigation */}
      <PWATopNav
        title={pageTitle}
        context={context}
        onMenuToggle={() => setIsMenuOpen(!isMenuOpen)}
        isMenuOpen={isMenuOpen}
        userName={userName}
        onLogout={onLogout}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Drawer */}
        <PWANavDrawer
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
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
