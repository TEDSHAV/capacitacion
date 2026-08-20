"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { LogOut } from "lucide-react";
import { PWAGlobalSearch } from "./PWAGlobalSearch";
import { getContextInfo, type NavigationContext } from "@/lib/navigation/navigation-config";

interface PWATopNavProps {
  title?: string;
  context: NavigationContext;
  userName?: string;
  onLogout?: () => void;
  onSearchOpen?: () => void;
}

export function PWATopNav({
  title,
  context,
  userName,
  onLogout,
  onSearchOpen,
}: PWATopNavProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const contextInfo = getContextInfo(context);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showUserMenu]);

  return (
    <nav className={`sticky top-0 z-40 border-b ${contextInfo.borderColor} bg-white shadow-sm`}>
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-16">
          {/* Left: Logo */}
          <div className="flex items-center gap-3">
            {/* Logo only — no text branding */}
            <Link href={getHomeHref(context)} className="flex items-center hover:opacity-80 transition-opacity">
              <Image
                src="/logo.png"
                alt="SHA de Venezuela"
                width={160}
                height={50}
                className="object-contain h-10 sm:h-12 w-auto"
                priority
              />
            </Link>
          </div>

          {/* Center: Page Title */}
          {title && (
            <div className="hidden sm:block flex-1 text-center">
              <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
            </div>
          )}

          {/* Right: Search + User Menu */}
          <div className="flex items-center gap-4">
            {/* Global Search */}
            <PWAGlobalSearch onOpen={onSearchOpen} />

            {/* User Menu Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">
                    {userName?.charAt(0).toUpperCase() || "U"}
                  </span>
                </div>
                <span className="hidden sm:inline text-sm font-medium text-gray-700">
                  {userName ? userName.split(" ")[0] : "Usuario"}
                </span>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  {userName && (
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{userName}</p>
                      <p className="text-xs text-gray-500 capitalize">
                        {context.replace("portal-", "").replace("-", " ")}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout?.();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

/**
 * Get home URL for a context
 */
function getHomeHref(context: NavigationContext): string {
  switch (context) {
    case "portal-facilitador":
      return "/portal/facilitador/dashboard";
    case "portal-cliente":
      return "/portal/cliente/dashboard";
    case "dashboard":
      return "/dashboard/capacitacion";
    default:
      return "/";
  }
}
