"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type"> {
  /** Current numeric value. */
  value: number;
  /** Called with the parsed number on every keystroke (0 / NaN-safe). */
  onValueChange: (n: number) => void;
  /** Allow decimal values. Defaults to true. */
  allowDecimal?: boolean;
  /** Allow negative values. Defaults to false. */
  allowNegative?: boolean;
  /** Minimum value; on blur the field is clamped up to this. Defaults to no clamp. */
  min?: number;
  /** Step (passed through to the underlying input; has no effect on type="text"). */
  step?: number | "any";
}

/**
 * Controlled numeric input that buffers the raw string while focused so that
 * intermediate states like "1.", "0.5", "-" and "" are valid while typing.
 *
 * Uses type="text" with inputMode="decimal"/"numeric" instead of type="number"
 * because the browser sanitizes type="number" values (e.g. "1." becomes ""),
 * which would defeat the buffering behavior.
 *
 * - While focused: shows the raw string, validates it is a legal intermediate
 *   number, and calls onValueChange with the parsed number so live totals update.
 * - On blur: reformats to the canonical numeric string (e.g. "1." -> "1", "" -> min)
 *   and syncs raw from value.
 * - When value changes externally (e.g. auto-populate, edit-record hydration) and
 *   the input is NOT focused, raw is synced from value.
 */
export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      value,
      onValueChange,
      allowDecimal = true,
      allowNegative = false,
      min,
      className,
      placeholder,
      ...props
    },
    forwardedRef,
  ) => {
    const [raw, setRaw] = React.useState<string>(() => formatValue(value, allowDecimal));
    const [focused, setFocused] = React.useState(false);

    // Sync raw from value when not focused (external updates: auto-populate, hydration, etc.)
    React.useEffect(() => {
      if (!focused) {
        setRaw(formatValue(value, allowDecimal));
      }
    }, [value, focused, allowDecimal]);

    const pattern = allowDecimal
      ? allowNegative
        ? /^-?\d*\.?\d*$/
        : /^\d*\.?\d*$/
      : allowNegative
        ? /^-?\d*$/
        : /^\d*$/;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      // Allow the raw string if it matches the intermediate pattern or is empty.
      if (next === "" || pattern.test(next)) {
        setRaw(next);
        const parsed = parseRaw(next, allowDecimal);
        onValueChange(parsed);
      }
    };

    const handleBlur = () => {
      setFocused(false);
      const canonical = raw.trim();
      if (canonical === "" || canonical === "-" || canonical === ".") {
        // Empty / lone sign / lone dot -> min (or 0)
        const fallback = typeof min === "number" ? min : 0;
        onValueChange(fallback);
        setRaw(formatValue(fallback, allowDecimal));
        return;
      }
      let num = parseRaw(canonical, allowDecimal);
      if (Number.isNaN(num)) num = typeof min === "number" ? min : 0;
      if (typeof min === "number" && num < min) num = min;
      onValueChange(num);
      setRaw(formatValue(num, allowDecimal));
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(true);
      // Select all text on focus so typing replaces the existing value
      // (e.g. field shows "1", user types "30" -> gets "30", not "130").
      // A second click positions the cursor for mid-field edits.
      e.target.select();
    };

    return (
      <Input
        {...props}
        ref={forwardedRef}
        type="text"
        inputMode={allowDecimal ? "decimal" : "numeric"}
        value={focused ? raw : formatValue(value, allowDecimal)}
        placeholder={placeholder}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={className}
      />
    );
  },
);
NumberInput.displayName = "NumberInput";

/** Parse a raw string into a number (NaN-safe). Returns 0 for invalid/empty input. */
function parseRaw(raw: string, allowDecimal: boolean): number {
  if (raw === "" || raw === "-" || raw === ".") return 0;
  const n = allowDecimal ? parseFloat(raw) : parseInt(raw, 10);
  return Number.isNaN(n) ? 0 : n;
}

/** Format a numeric value into the canonical display string. */
function formatValue(value: number, allowDecimal: boolean): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  // Preserve decimals only when allowed; integers always display as integers.
  if (allowDecimal && !Number.isInteger(value)) {
    return String(value);
  }
  return String(Math.trunc(value));
}
