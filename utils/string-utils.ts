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
 * Convert a string to lowercase for database storage
 * Example: "Juan Perez" -> "juan perez"
 */
export function toLowerCase(str: string): string {
  if (!str) return str;
  return str.trim().toLowerCase();
}
