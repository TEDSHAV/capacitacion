import {
  Home,
  ClipboardList,
  Award,
  BookOpen,
  Users,
  BarChart3,
  Gauge,
  FileStack,
  LayoutGrid,
  Signature,
  Settings,
  Calendar,
  KeyRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Navigation configuration with STRICT ISOLATION between contexts.
 * Portal (facilitador/cliente) and Dashboard (admin) are completely separate.
 */

export type NavigationContext = "portal-facilitador" | "portal-cliente" | "dashboard";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: {
    count: number;
    color: "red" | "blue" | "amber" | "green";
  };
  children?: NavItem[];
  requiresOnline?: boolean;
  offlineAvailable?: boolean;
}

export interface NavigationConfig {
  portal: {
    facilitador: NavItem[];
    cliente: NavItem[];
  };
  dashboard: NavItem[];
}

/**
 * Portal: Facilitador Navigation
 * ONLY links to /portal/facilitador/*
 * NOTE: Only pages that actually exist are listed here.
 */
const FACILITADOR_NAV: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/portal/facilitador/dashboard",
    icon: Home,
    offlineAvailable: true,
  },
];

/**
 * Portal: Cliente Navigation
 * ONLY links to /portal/cliente/*
 * NOTE: Only pages that actually exist are listed here.
 */
const CLIENTE_NAV: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/portal/cliente/dashboard",
    icon: Home,
    offlineAvailable: true,
  },
];

/**
 * Dashboard: Admin Navigation
 * ONLY links to /dashboard/*
 */
const DASHBOARD_NAV: NavItem[] = [
  {
    id: "home",
    label: "Home",
    href: "/dashboard/capacitacion",
    icon: Home,
    offlineAvailable: true,
  },
  {
    id: "planning",
    label: "Planificación y Ejecución",
    href: "#",
    icon: Calendar,
    offlineAvailable: true,
    children: [
      {
        id: "seguimiento",
        label: "Seguimiento de Servicios",
        href: "/dashboard/capacitacion/seguimiento-servicios",
        icon: Calendar,
        offlineAvailable: true,
      },
      {
        id: "gestion-osis",
        label: "Gestión OSIs",
        href: "/dashboard/capacitacion/gestion-osi",
        icon: ClipboardList,
        badge: { count: 0, color: "blue" },
        offlineAvailable: true,
      },
    ],
  },
  {
    id: "reports",
    label: "Reportes",
    href: "#",
    icon: BarChart3,
    offlineAvailable: true,
    children: [
      {
        id: "kpi",
        label: "KPI",
        href: "/dashboard/capacitacion/reportes",
        icon: BarChart3,
        offlineAvailable: true,
      },
      {
        id: "indicadores",
        label: "Indicadores",
        href: "/dashboard/capacitacion/indicadores",
        icon: Gauge,
        offlineAvailable: true,
      },
    ],
  },
  {
    id: "certificates",
    label: "Certificados",
    href: "#",
    icon: Award,
    offlineAvailable: true,
    children: [
      {
        id: "generation",
        label: "Generación",
        href: "/dashboard/capacitacion/generacion-certificado",
        icon: Award,
        requiresOnline: true,
      },
      {
        id: "management",
        label: "Gestión",
        href: "/dashboard/capacitacion/gestion-certificados",
        icon: FileStack,
        badge: { count: 0, color: "red" },
        offlineAvailable: true,
      },
    ],
  },
  {
    id: "courses",
    label: "Cursos",
    href: "#",
    icon: BookOpen,
    offlineAvailable: true,
    children: [
      {
        id: "course-management",
        label: "Gestión",
        href: "/dashboard/capacitacion/gestion-cursos",
        icon: BookOpen,
        offlineAvailable: true,
      },
      {
        id: "course-templates",
        label: "Plantillas",
        href: "/dashboard/capacitacion/gestion-plantillas-cursos",
        icon: LayoutGrid,
        offlineAvailable: true,
      },
    ],
  },
  {
    id: "facilitators",
    label: "Facilitadores",
    href: "#",
    icon: Users,
    offlineAvailable: true,
    children: [
      {
        id: "facilitator-management",
        label: "Gestión",
        href: "/dashboard/capacitacion/gestion-de-facilitadores",
        icon: Users,
        offlineAvailable: true,
      },
      {
        id: "signatures",
        label: "Firmas",
        href: "/dashboard/capacitacion/gestion-de-firmas",
        icon: Signature,
        offlineAvailable: true,
      },
      {
        id: "assignments-credentials",
        label: "Asignaciones y Credenciales",
        href: "/dashboard/capacitacion/gestion-asignaciones",
        icon: KeyRound,
        offlineAvailable: true,
      },
    ],
  },
  {
    id: "settings",
    label: "Configuración",
    href: "/dashboard/capacitacion/configuracion/feriados",
    icon: Settings,
    offlineAvailable: true,
  },
];

/**
 * Complete navigation configuration
 * STRICTLY ISOLATED: portal and dashboard never mix
 */
export const NAVIGATION_CONFIG: NavigationConfig = {
  portal: {
    facilitador: FACILITADOR_NAV,
    cliente: CLIENTE_NAV,
  },
  dashboard: DASHBOARD_NAV,
};

/**
 * Get navigation for a specific context
 * Ensures strict isolation — no cross-context access
 */
export function getNavigationForContext(context: NavigationContext): NavItem[] {
  switch (context) {
    case "portal-facilitador":
      return NAVIGATION_CONFIG.portal.facilitador;
    case "portal-cliente":
      return NAVIGATION_CONFIG.portal.cliente;
    case "dashboard":
      return NAVIGATION_CONFIG.dashboard;
    default:
      return [];
  }
}

/**
 * Validate that a URL belongs to a context
 * Prevents accidental cross-context navigation
 */
export function validateUrlForContext(url: string, context: NavigationContext): boolean {
  switch (context) {
    case "portal-facilitador":
      return url.startsWith("/portal/facilitador");
    case "portal-cliente":
      return url.startsWith("/portal/cliente");
    case "dashboard":
      return url.startsWith("/dashboard");
    default:
      return false;
  }
}

/**
 * Get context from URL pathname
 * Automatically detects which context user is in
 */
export function getContextFromPathname(pathname: string): NavigationContext {
  if (pathname.startsWith("/portal/facilitador")) return "portal-facilitador";
  if (pathname.startsWith("/portal/cliente")) return "portal-cliente";
  if (pathname.startsWith("/dashboard")) return "dashboard";
  return "portal-facilitador"; // fallback
}

/**
 * Get context display info (name, color, etc.)
 */
export function getContextInfo(context: NavigationContext) {
  switch (context) {
    case "portal-facilitador":
      return {
        name: "Portal de Facilitadores",
        color: "blue",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        textColor: "text-blue-900",
      };
    case "portal-cliente":
      return {
        name: "Portal de Clientes",
        color: "green",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        textColor: "text-green-900",
      };
    case "dashboard":
      return {
        name: "Dashboard de Administración",
        color: "purple",
        bgColor: "bg-purple-50",
        borderColor: "border-purple-200",
        textColor: "text-purple-900",
      };
    default:
      return {
        name: "SHA Capacitación",
        color: "gray",
        bgColor: "bg-gray-50",
        borderColor: "border-gray-200",
        textColor: "text-gray-900",
      };
  }
}
