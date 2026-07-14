"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { useState, useEffect } from "react";

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Inicio",
  capacitacion: "Capacitación",
  negocios: "Negocios",
  "gestion-cursos": "Gestión de Cursos",
  "gestion-certificados": "Gestión de Certificados",
  "generacion-certificado": "Generación de Certificados",
  "gestion-de-facilitadores": "Gestión de Facilitadores",
  "gestion-de-firmas": "Gestión de Firmas",
  "control-secuencia": "Control de Secuencia",
  "plantillas-certificados": "Plantillas de Certificados",
  "plantillas-carnets": "Plantillas de Carnets",
  "gestion-plantillas-cursos": "Plantillas de Cursos",
  "consulta-participantes": "Consulta de Participantes",
  participantes: "Gestión de Participantes",
  reportes: "Reportes",
  "gestion-de-osis": "Gestión de OSIs",
  Plantillas: "Plantillas",
  cursos: "Cursos",
};

function labelFor(segment: string): string {
  return (
    SEGMENT_LABELS[segment] ??
    segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export default function Breadcrumb() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  if (!pathname.startsWith("/dashboard")) return null;

  const segments = pathname.split("/").filter(Boolean);

  const crumbs = segments.map((seg, idx) => ({
    label: labelFor(seg),
    href: "/" + segments.slice(0, idx + 1).join("/"),
    isLast: idx === segments.length - 1,
  }));

  if (crumbs.length <= 1) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="bg-white border-b border-gray-200 px-2 sm:px-4 lg:px-8 py-2.5"
    >
      <ol className="flex items-center flex-wrap gap-1 text-xs sm:text-sm min-w-0">
        {crumbs.map((crumb, idx) => (
          <li key={crumb.href} className="flex items-center gap-1 min-w-0">
            {idx > 0 && (
              <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 flex-shrink-0" />
            )}
            {crumb.isLast ? (
              <span className="font-medium text-gray-800 truncate max-w-[100px] sm:max-w-[200px]">
                {idx === 0 && (
                  <Home className="w-3 h-3 sm:w-3.5 sm:h-3.5 inline mr-1 mb-0.5 flex-shrink-0" />
                )}
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="text-gray-500 hover:text-blue-600 transition-colors truncate max-w-[100px] sm:max-w-[200px] flex items-center gap-1 min-w-0"
              >
                {idx === 0 && (
                  <Home className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                )}
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
