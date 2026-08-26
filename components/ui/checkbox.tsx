"use client";

import * as React from "react";
import { Check } from "lucide-react";

export interface CheckboxProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ checked = false, onCheckedChange, className = "", disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange?.(!checked)}
        className={`peer h-4 w-4 shrink-0 rounded-sm border shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          checked
            ? "bg-blue-600 border-blue-600 text-white"
            : "bg-white border-gray-300"
        } ${className}`}
        {...props}
      >
        {checked && (
          <span className="flex items-center justify-center">
            <Check className="h-3 w-3" />
          </span>
        )}
      </button>
    );
  },
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
