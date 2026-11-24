/**
 * Salones disponibles en las instalaciones de SHA de Venezuela.
 * Opciones canónicas: Salón 1 (Principal), Salón Oriente, Salón Elite.
 */
export const SALONES_SHA = [
  "Salón 1",
  "Salón Oriente",
  "Salón Elite",
] as const;

export type SalonSha = (typeof SALONES_SHA)[number] | string;

export interface SalonShaDefinition {
  id: "salon-principal" | "salon-oriente" | "salon-elite";
  nombre: string;
  shortNombre: string;
  slugs: string[];
  color: "sky" | "amber" | "purple";
}

export const SALONES_SHA_CONFIG: SalonShaDefinition[] = [
  {
    id: "salon-principal",
    nombre: "Salón 1 (Principal)",
    shortNombre: "Salón 1",
    slugs: [
      "salon-principal",
      "salón principal",
      "salon principal",
      "principal",
      "salón 1",
      "salon 1",
      "1",
      "salon-1",
    ],
    color: "sky",
  },
  {
    id: "salon-oriente",
    nombre: "Salón Oriente",
    shortNombre: "Salón Oriente",
    slugs: [
      "salon-oriente",
      "salón oriente",
      "salon oriente",
      "oriente",
      "3",
      "salon-3",
    ],
    color: "amber",
  },
  {
    id: "salon-elite",
    nombre: "Salón Elite",
    shortNombre: "Salón Elite",
    slugs: [
      "salon-elite",
      "salón elite",
      "salon elite",
      "elite",
      "2",
      "salon-2",
    ],
    color: "purple",
  },
];

/**
 * Normaliza cualquier variante de nombre de salón a su nombre canónico estándar.
 * Ej: "salon-principal", "Salón 1", "principal", "Salón Principal" -> "Salón 1 (Principal)"
 *     "salon-oriente", "oriente" -> "Salón Oriente"
 *     "salon-elite", "elite" -> "Salón Elite"
 */
export function normalizeSalonName(raw?: string | null): string | null {
  if (!raw) return null;
  const clean = raw.trim();
  if (!clean) return null;

  const lower = clean.toLowerCase();

  for (const def of SALONES_SHA_CONFIG) {
    if (
      def.slugs.includes(lower) ||
      lower === def.id ||
      lower === def.nombre.toLowerCase() ||
      lower === def.shortNombre.toLowerCase()
    ) {
      return def.nombre;
    }
  }

  // Exact phrase matching only (never match standalone "oriente" or "principal" in arbitrary text)
  if (
    lower.includes("salón principal") ||
    lower.includes("salon principal") ||
    lower.includes("salón 1") ||
    lower.includes("salon 1")
  ) {
    return "Salón 1 (Principal)";
  }
  if (lower.includes("salón oriente") || lower.includes("salon oriente")) {
    return "Salón Oriente";
  }
  if (lower.includes("salón elite") || lower.includes("salon elite")) {
    return "Salón Elite";
  }

  return clean;
}

/**
 * Normaliza el ID / slug canónico para matching estricto.
 */
export function getSalonCanonicalId(raw?: string | null): string | null {
  if (!raw) return null;
  const clean = raw.trim().toLowerCase();
  for (const def of SALONES_SHA_CONFIG) {
    if (
      def.slugs.includes(clean) ||
      clean === def.id ||
      clean === def.nombre.toLowerCase() ||
      clean === def.shortNombre.toLowerCase()
    ) {
      return def.id;
    }
  }
  if (
    clean.includes("salón principal") ||
    clean.includes("salon principal") ||
    clean.includes("salón 1") ||
    clean.includes("salon 1")
  ) {
    return "salon-principal";
  }
  if (clean.includes("salón oriente") || clean.includes("salon oriente")) {
    return "salon-oriente";
  }
  if (clean.includes("salón elite") || clean.includes("salon elite")) {
    return "salon-elite";
  }
  return clean;
}

/**
 * Determina si la dirección o sede de ejecución corresponde estrictamente a las instalaciones de SHA de Venezuela.
 * Enfoque estricto: evita falsos positivos con plantas o sedes de clientes (como Coca-Cola, Polar, etc.)
 */
export function isShaLocation(
  direccion?: string | null,
  sede?: string | null,
): boolean {
  const combined = `${direccion || ""} ${sede || ""}`.toLowerCase().trim();
  if (!combined) return false;

  // In-company protection: If sede specifically indicates a client plant, branch, distributor or terminal,
  // it is an in-company client venue even if a default headquarters address was recorded.
  const sedeLower = (sede || "").toLowerCase();
  if (
    sedeLower.includes("distribuidora") ||
    sedeLower.includes("planta") ||
    sedeLower.includes("refiner") ||
    sedeLower.includes("sucursal") ||
    sedeLower.includes("almacen") ||
    sedeLower.includes("almacén") ||
    sedeLower.includes("taladro") ||
    sedeLower.includes("campo")
  ) {
    return false;
  }

  return (
    /\bsha\b/i.test(combined) ||
    combined.includes("s.h.a") ||
    combined.includes("sede propia") ||
    combined.includes("instalaciones sha") ||
    combined.includes("oficinas sha") ||
    combined.includes("edificio sha") ||
    combined.includes("edif sha") ||
    combined.includes("sede sha") ||
    combined.includes("sha de venezuela") ||
    combined.includes("hotel rasil") ||
    combined.includes("rasil") ||
    (combined.includes("paseo col") && combined.includes("cocos")) ||
    (combined.includes("paseo col") && combined.includes("puerto la cruz")) ||
    combined.includes("las garzas")
  );
}

/**
 * Verifica si un salón de OSI cumple con el filtro seleccionado por el usuario.
 * Soporta filtros:
 * - "all_sha": Cualquier servicio en sede SHA
 * - "sin_salon": Servicio en SHA sin aula asignada aún
 * - "salon-principal" | "Salón 1" | "Salón 1 (Principal)": Salón 1
 * - "salon-oriente" | "Salón Oriente": Salón Oriente
 * - "salon-elite" | "Salón Elite": Salón Elite
 */
export function matchSalonFilter(
  itemSalon: string | null | undefined,
  filterSalon: string | null | undefined,
  isShaVenue: boolean,
): boolean {
  if (!filterSalon) return true;

  if (filterSalon === "all_sha") {
    return isShaVenue;
  }

  if (filterSalon === "sin_salon") {
    return isShaVenue && (!itemSalon || !itemSalon.trim());
  }

  // If filtering by a specific classroom, service MUST be at an SHA venue
  if (!isShaVenue || !itemSalon) return false;

  const itemCanon = getSalonCanonicalId(itemSalon);
  const filterCanon = getSalonCanonicalId(filterSalon);

  if (itemCanon && filterCanon) {
    return itemCanon === filterCanon;
  }

  return itemSalon.toLowerCase().trim() === filterSalon.toLowerCase().trim();
}
