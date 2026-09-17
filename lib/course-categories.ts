export interface CourseCategoryItem {
  id?: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  color: string;
  is_active: boolean;
  orden?: number;
  curso_count?: number;
}

export interface CategoryColorTheme {
  badge: string;
  badgeDot: string;
  tabActive: string;
  pillCount: string;
  border: string;
  text: string;
  bgLight: string;
}

export const COLOR_PALETTES: Record<string, CategoryColorTheme> = {
  emerald: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-600/20",
    badgeDot: "bg-emerald-500",
    tabActive: "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-600",
    pillCount: "bg-emerald-100 text-emerald-800",
    border: "border-emerald-300",
    text: "text-emerald-700",
    bgLight: "bg-emerald-50",
  },
  sky: {
    badge: "bg-sky-50 text-sky-700 border-sky-200 ring-sky-600/20",
    badgeDot: "bg-sky-500",
    tabActive: "bg-sky-600 text-white shadow-sm ring-1 ring-sky-600",
    pillCount: "bg-sky-100 text-sky-800",
    border: "border-sky-300",
    text: "text-sky-700",
    bgLight: "bg-sky-50",
  },
  amber: {
    badge: "bg-amber-50 text-amber-800 border-amber-200 ring-amber-600/20",
    badgeDot: "bg-amber-500",
    tabActive: "bg-amber-600 text-white shadow-sm ring-1 ring-amber-600",
    pillCount: "bg-amber-100 text-amber-800",
    border: "border-amber-300",
    text: "text-amber-800",
    bgLight: "bg-amber-50",
  },
  purple: {
    badge: "bg-purple-50 text-purple-700 border-purple-200 ring-purple-600/20",
    badgeDot: "bg-purple-500",
    tabActive: "bg-purple-600 text-white shadow-sm ring-1 ring-purple-600",
    pillCount: "bg-purple-100 text-purple-800",
    border: "border-purple-300",
    text: "text-purple-700",
    bgLight: "bg-purple-50",
  },
  indigo: {
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200 ring-indigo-600/20",
    badgeDot: "bg-indigo-500",
    tabActive: "bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-600",
    pillCount: "bg-indigo-100 text-indigo-800",
    border: "border-indigo-300",
    text: "text-indigo-700",
    bgLight: "bg-indigo-50",
  },
  rose: {
    badge: "bg-rose-50 text-rose-700 border-rose-200 ring-rose-600/20",
    badgeDot: "bg-rose-500",
    tabActive: "bg-rose-600 text-white shadow-sm ring-1 ring-rose-600",
    pillCount: "bg-rose-100 text-rose-800",
    border: "border-rose-300",
    text: "text-rose-700",
    bgLight: "bg-rose-50",
  },
  teal: {
    badge: "bg-teal-50 text-teal-700 border-teal-200 ring-teal-600/20",
    badgeDot: "bg-teal-500",
    tabActive: "bg-teal-600 text-white shadow-sm ring-1 ring-teal-600",
    pillCount: "bg-teal-100 text-teal-800",
    border: "border-teal-300",
    text: "text-teal-700",
    bgLight: "bg-teal-50",
  },
  orange: {
    badge: "bg-orange-50 text-orange-800 border-orange-200 ring-orange-600/20",
    badgeDot: "bg-orange-500",
    tabActive: "bg-orange-600 text-white shadow-sm ring-1 ring-orange-600",
    pillCount: "bg-orange-100 text-orange-800",
    border: "border-orange-300",
    text: "text-orange-800",
    bgLight: "bg-orange-50",
  },
  slate: {
    badge: "bg-gray-100 text-gray-700 border-gray-200 ring-gray-600/20",
    badgeDot: "bg-gray-500",
    tabActive: "bg-gray-700 text-white shadow-sm ring-1 ring-gray-700",
    pillCount: "bg-gray-200 text-gray-800",
    border: "border-gray-300",
    text: "text-gray-700",
    bgLight: "bg-gray-100",
  },
};

export const AVAILABLE_CATEGORY_COLORS = [
  { id: "emerald", name: "Esmeralda / Verde", hex: "#10B981" },
  { id: "sky", name: "Cielo / Azul", hex: "#0EA5E9" },
  { id: "amber", name: "Ámbar / Naranja", hex: "#F59E0B" },
  { id: "purple", name: "Púrpura / Violeta", hex: "#8B5CF6" },
  { id: "indigo", name: "Índigo", hex: "#6366F1" },
  { id: "rose", name: "Rosa / Carmesí", hex: "#F43F5E" },
  { id: "teal", name: "Verde Azulado", hex: "#14B8A6" },
  { id: "orange", name: "Naranja", hex: "#F97316" },
  { id: "slate", name: "Gris Pizarra", hex: "#64748B" },
];

export const DEFAULT_COURSE_CATEGORIES: CourseCategoryItem[] = [
  {
    id: 1,
    codigo: "FG",
    nombre: "Formación General",
    descripcion:
      "Cursos formativos básicos y normativos generales (inducciones, LOPCYMAT, etc.)",
    color: "emerald",
    is_active: true,
    orden: 1,
  },
  {
    id: 2,
    codigo: "TI",
    nombre: "Técnico Industrial",
    descripcion:
      "Cursos técnicos orientados a la industria y procesos operacionales",
    color: "sky",
    is_active: true,
    orden: 2,
  },
  {
    id: 3,
    codigo: "TP",
    nombre: "Técnico Profesional",
    descripcion:
      "Cursos técnicos especializados y competencias profesionales avanzadas",
    color: "amber",
    is_active: true,
    orden: 3,
  },
  {
    id: 4,
    codigo: "CO",
    nombre: "Certificación Ocupacional",
    descripcion:
      "Cursos de certificación ocupacional y acreditación de operadores",
    color: "purple",
    is_active: true,
    orden: 4,
  },
];

export function getCategoryTheme(color?: string | null): CategoryColorTheme {
  if (!color || !COLOR_PALETTES[color.toLowerCase()]) {
    return COLOR_PALETTES.slate;
  }
  return COLOR_PALETTES[color.toLowerCase()];
}

export function padCourseCode(id: number | null | undefined): string {
  if (id == null) return "000";
  return String(id).padStart(3, "0");
}

export function formatCourseDisplayCode(
  courseId: number | null | undefined,
  categoryCode?: string | null,
): string {
  const padded = padCourseCode(courseId);
  const cat = (categoryCode || "CO").trim().toUpperCase();
  return `${cat}-${padded}`;
}

/**
 * Resolves the category object for a given course.
 * Prioritizes course.categoria, with fallback to code prefix in course name.
 */
export function resolveCourseCategory(
  course: { nombre?: string | null; categoria?: string | null },
  categories: CourseCategoryItem[] = DEFAULT_COURSE_CATEGORIES,
): CourseCategoryItem | null {
  if (course.categoria) {
    const matched = categories.find(
      (c) => c.codigo.toUpperCase() === course.categoria?.trim().toUpperCase(),
    );
    if (matched) return matched;
    // If not found in known categories but defined in DB, create a synthetic item
    return {
      codigo: course.categoria.trim().toUpperCase(),
      nombre: course.categoria.trim().toUpperCase(),
      color: "slate",
      is_active: true,
    };
  }

  // Prefix fallback: [FG], FG-, (FG), etc.
  const nombre = (course.nombre || "").trim();
  const match = nombre.match(/^[\[\(]?([A-Z]{2,5})[\]\)]?[\s\-_:]/i);
  if (match) {
    const code = match[1].toUpperCase();
    const found = categories.find((c) => c.codigo.toUpperCase() === code);
    if (found) return found;
  }

  return null;
}
