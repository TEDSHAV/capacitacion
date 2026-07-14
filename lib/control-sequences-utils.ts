/**
 * Utility functions for control sequence management
 */

export interface ControlNumbersInfo {
  nro_libro: number;
  nro_hoja: number;
  nro_linea: number;
  nro_control: number;
}

/**
 * Validate control number values
 */
export function validateControlNumbers(
  numbers: Partial<ControlNumbersInfo>,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (numbers.nro_libro !== undefined) {
    if (!Number.isInteger(numbers.nro_libro) || numbers.nro_libro < 1) {
      errors.push("Libro debe ser un número entero >= 1");
    }
  }

  if (numbers.nro_hoja !== undefined) {
    if (
      !Number.isInteger(numbers.nro_hoja) ||
      numbers.nro_hoja < 1 ||
      numbers.nro_hoja > 100
    ) {
      errors.push("Hoja debe estar entre 1 y 100");
    }
  }

  if (numbers.nro_linea !== undefined) {
    if (
      !Number.isInteger(numbers.nro_linea) ||
      numbers.nro_linea < 1 ||
      numbers.nro_linea > 10
    ) {
      errors.push("Línea debe estar entre 1 y 10");
    }
  }

  if (numbers.nro_control !== undefined) {
    if (!Number.isInteger(numbers.nro_control) || numbers.nro_control < 1) {
      errors.push("Nro. Control debe ser un número entero >= 1");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format control numbers for display
 */
export function formatControlNumbers(numbers: ControlNumbersInfo): string {
  return `Libro: ${numbers.nro_libro}, Hoja: ${numbers.nro_hoja}, Línea: ${numbers.nro_linea}, Nro. Ctrl: ${numbers.nro_control}`;
}

/**
 * Calculate next control numbers based on current values
 * Assumes 10 lines per sheet and 100 sheets per book
 */
export function calculateNextControlNumbers(
  current: ControlNumbersInfo,
  increment: number = 1,
): ControlNumbersInfo {
  let { nro_libro, nro_hoja, nro_linea, nro_control } = current;

  // Increment line number
  nro_linea += increment;

  // Handle line wrapping (10 lines per sheet)
  if (nro_linea > 10) {
    const extraLines = nro_linea - 1;
    nro_linea = (extraLines % 10) + 1;
    nro_hoja += Math.floor(extraLines / 10);

    // Handle sheet wrapping (100 sheets per book)
    if (nro_hoja > 100) {
      const extraSheets = nro_hoja - 1;
      nro_hoja = (extraSheets % 100) + 1;
      nro_libro += Math.floor(extraSheets / 100);
    }
  }

  // Control number always increments independently
  nro_control += increment;

  return {
    nro_libro,
    nro_hoja,
    nro_linea,
    nro_control,
  };
}

/**
 * Get a human-readable description of control numbers
 */
export function getControlNumbersDescription(
  numbers: ControlNumbersInfo,
): string {
  return `Libro ${numbers.nro_libro}, Hoja ${numbers.nro_hoja}, Línea ${numbers.nro_linea}, Control ${numbers.nro_control}`;
}

/**
 * Check if control numbers are at the start of a new book
 */
export function isNewBook(numbers: ControlNumbersInfo): boolean {
  return numbers.nro_hoja === 1 && numbers.nro_linea === 1;
}

/**
 * Check if control numbers are at the start of a new sheet
 */
export function isNewSheet(numbers: ControlNumbersInfo): boolean {
  return numbers.nro_linea === 1;
}

/**
 * Get the next control number (for control number field only)
 */
export function getNextControlNumber(current: number): number {
  return current + 1;
}
