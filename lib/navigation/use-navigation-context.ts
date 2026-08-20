"use client";

import { usePathname } from "next/navigation";
import { getContextFromPathname, type NavigationContext } from "./navigation-config";

/**
 * Hook to detect current navigation context from URL pathname
 * Automatically determines if user is in portal-facilitador, portal-cliente, or dashboard
 */
export function useNavigationContext(): NavigationContext {
  const pathname = usePathname();
  return getContextFromPathname(pathname);
}
