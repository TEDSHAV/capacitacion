"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Wifi, WifiOff } from "lucide-react";
import { getNavigationForContext, getContextInfo, type NavigationContext, type NavItem } from "@/lib/navigation/navigation-config";
import { useBadgeCounts } from "@/lib/navigation/use-badge-counts";
import { useOnlineStatus } from "@/lib/offline/use-online-status";

interface PWANavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  context: NavigationContext;
  currentPath: string;
}

export function PWANavDrawer({
  isOpen,
  onClose,
  context,
  currentPath,
}: PWANavDrawerProps) {
  const navItems = getNavigationForContext(context);
  const contextInfo = getContextInfo(context);
  const badgeCounts = useBadgeCounts(context);
  const isOnline = useOnlineStatus();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const isActive = (href: string) => {
    if (href === "#") return false;
    return currentPath.startsWith(href);
  };

  const renderNavItem = (item: NavItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const active = isActive(item.href);
    const badgeCount = badgeCounts[item.id];
    const isOnlineOnly = item.requiresOnline && !isOnline;

    return (
      <div key={item.id}>
        {hasChildren ? (
          <button
            onClick={() => toggleExpanded(item.id)}
            className={`w-full flex items-center justify-between px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              active
                ? `${contextInfo.bgColor} ${contextInfo.textColor}`
                : "text-gray-700 hover:bg-gray-100"
            } ${isOnlineOnly ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={isOnlineOnly}
          >
            <div className="flex items-center gap-2">
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
              {badgeCount && badgeCount > 0 && (
                <span className="ml-auto mr-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                  {badgeCount}
                </span>
              )}
            </div>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            />
          </button>
        ) : (
          <Link
            href={item.href}
            onClick={onClose}
            className={`flex items-center justify-between px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              active
                ? `${contextInfo.bgColor} ${contextInfo.textColor}`
                : "text-gray-700 hover:bg-gray-100"
            } ${isOnlineOnly ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
          >
            <div className="flex items-center gap-2">
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
              {badgeCount && badgeCount > 0 && (
                <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                  {badgeCount}
                </span>
              )}
            </div>
            {isOnlineOnly && <WifiOff className="w-4 h-4 text-gray-400" />}
          </Link>
        )}

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="ml-2 border-l border-gray-200 pl-2 space-y-1 mt-1">
            {item.children!.map((child) => renderNavItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-200 shadow-lg transform transition-transform duration-300 z-40 overflow-y-auto ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 md:relative md:top-0 md:shadow-none`}
      >
        <div className="p-4 space-y-2">
          {/* Online Status Indicator */}
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-gray-50 text-xs font-medium text-gray-600 mb-4">
            {isOnline ? (
              <>
                <Wifi className="w-4 h-4 text-green-600" />
                <span>En línea</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-amber-600" />
                <span>Sin conexión</span>
              </>
            )}
          </div>

          {/* Navigation Items */}
          {navItems.map((item) => renderNavItem(item))}
        </div>
      </div>
    </>
  );
}
