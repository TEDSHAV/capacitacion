"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { usePathname } from "next/navigation";
import { generateBreadcrumbs } from "@/lib/navigation/breadcrumb-utils";
import { useNavigationContext } from "@/lib/navigation/use-navigation-context";

interface PWABreadcrumbProps {
  className?: string;
}

export function PWABreadcrumb({ className = "" }: PWABreadcrumbProps) {
  const pathname = usePathname();
  const context = useNavigationContext();
  const breadcrumbs = generateBreadcrumbs(pathname, context);

  // On mobile, show only last 2 items
  const displayBreadcrumbs = breadcrumbs.length > 2
    ? [breadcrumbs[0], ...breadcrumbs.slice(-1)]
    : breadcrumbs;

  return (
    <nav className={`flex items-center gap-2 text-sm ${className}`} aria-label="Breadcrumb">
      {displayBreadcrumbs.map((item, index) => (
        <div key={`${index}-${item.href}`} className="flex items-center gap-2">
          {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
          <Link
            href={item.href}
            className={`transition-colors ${
              index === displayBreadcrumbs.length - 1
                ? "text-gray-900 font-medium"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {index === 0 ? (
              <Home className="w-4 h-4" />
            ) : (
              item.label
            )}
          </Link>
        </div>
      ))}
    </nav>
  );
}
