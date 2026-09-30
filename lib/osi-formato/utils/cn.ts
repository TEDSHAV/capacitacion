type ClassValue =
  | string
  | number
  | false
  | null
  | undefined
  | Record<string, boolean>
  | ClassValue[];

function to_class_names(value: ClassValue): string[] {
  if (!value) return [];
  if (typeof value === "string" || typeof value === "number") {
    return [String(value)];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => to_class_names(item));
  }
  return Object.entries(value)
    .filter(([, enabled]) => Boolean(enabled))
    .map(([name]) => name);
}

export function cn(...inputs: ClassValue[]): string {
  return inputs.flatMap((input) => to_class_names(input)).join(" ");
}
