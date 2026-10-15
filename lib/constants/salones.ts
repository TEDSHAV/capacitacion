/**
 * Salones disponibles en las instalaciones de SHA de Venezuela.
 * Opciones actuales: Salón 1, Salón Oriente, Salón Elite.
 */
export const SALONES_SHA = [
  "Salón 1",
  "Salón Oriente",
  "Salón Elite",
] as const;

export type SalonSha = (typeof SALONES_SHA)[number] | string;

/**
 * Determina si la dirección o sede de ejecución corresponde a las instalaciones de SHA.
 */
export function isShaLocation(
  direccion?: string | null,
  sede?: string | null,
): boolean {
  const combined = `${direccion || ""} ${sede || ""}`.toLowerCase();
  return /\bsha\b/i.test(combined);
}
