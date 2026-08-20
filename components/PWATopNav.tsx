"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, LogOut } from "lucide-react";
import { getContextInfo, type NavigationContext } from "@/lib/navigation/navigation-config";

interface PWATopNavProps {
  title?: string;
  context: NavigationContext;
  onMenuToggle?: () => void;
  isMenuOpen?: boolean;
  userName?: string;
  onLogout?: () => void;
}

export function PWATopNav({
  title,
  context,
  onMenuToggle,
  isMenuOpen = false,
  userName,
  onLogout,
}: PWATopNavProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const contextInfo = getContextInfo(context);

  return (
    <nav className={`sticky top-0 z-40 border-b ${contextInfo.borderColor} bg-white shadow-sm`}>
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left: Logo + Menu Toggle */}
          <div className="flex items-center gap-4">
            <button
              onClick={onMenuToggle}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors md:hidden"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="w-5 h-5 text-gray-700" />
              ) : (
                <Menu className="w-5 h-5 text-gray-700" />
              )}
            </button>

            {/* Logo + App Name */}
            <Link href={getHomeHref(context)} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className={`w-8 h-8 rounded-lg ${contextInfo.bgColor} flex items-center justify-center`}>
                <span className={`text-sm font-bold ${contextInfo.textColor}`}>SHA</span>
              </div>
              <div className="hidden sm:block">
                <p className="text-xs text-gray-500 font-medium">SHA de Venezuela</p>
                <p className={`text-sm font-bold ${contextInfo.textColor}`}>{contextInfo.name}</p>
              </div>
            </Link>
          </div>

          {/* Center: Page Title */}
          {title && (
            <div className="hidden sm:block flex-1 text-center">
              <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
            </div>
          )}

          {/* Right: User Menu */}
          <div className="flex items-center gap-4">
            {/* User Menu Dropdown */}
            <div className="relative">
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
