/**
 * Convert a string to lower case
 */
export function toLowerCase(str: string): string {
  if (!str) return str;
  return str.toLowerCase();
}

/**
 * Convert a string to title case (first letter of each word capitalized)
 * Example: "juan perez" -> "Juan Perez"
 */
export function toTitleCase(str: string): string {
  if (!str) return str;
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Mask a name for privacy (e.g., "JUAN PEREZ" -> "J*** P***")
 */
export function maskName(name: string): string {
  if (!name) return name;
  return name
    .split(" ")
    .map((part) => {
      if (part.length <= 1) return part;
      return part.charAt(0) + "*".repeat(Math.min(part.length - 1, 3));
    })
    .join(" ");
}
