import { getNavigationForContext, type NavigationContext, type NavItem } from "./navigation-config";

export interface BreadcrumbItem {
  label: string;
  href: string;
}

/**
 * Generate breadcrumb items from pathname
 * Traverses navigation tree to find matching items
 */
export function generateBreadcrumbs(
  pathname: string,
  context: NavigationContext
): BreadcrumbItem[] {
  const homeHref = getHomeHref(context);
  const items: BreadcrumbItem[] = [
    { label: "Home", href: homeHref },
  ];

  // Get navigation for this context
  const nav = getNavigationForContext(context);

  // Find matching nav items by traversing the tree
  const segments = pathname.split("/").filter(Boolean);

  // Build path incrementally
  let currentPath = "";
  for (const segment of segments) {
    currentPath += `/${segment}`;

    // Skip the home path — it's already the first breadcrumb item
    if (currentPath === homeHref) continue;

    // Find matching nav item
    const item = findNavItemByHref(nav, currentPath);
    if (item && item.label !== "Home") {
      items.push({ label: item.label, href: item.href });
    }
  }

  return items;
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

/**
 * Recursively find nav item by href
 */
function findNavItemByHref(items: NavItem[], href: string): NavItem | null {
  for (const item of items) {
    if (item.href === href) return item;
    if (item.children) {
      const found = findNavItemByHref(item.children, href);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Format breadcrumb label (remove hyphens, capitalize)
 */
export function formatBreadcrumbLabel(label: string): string {
  return label
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
