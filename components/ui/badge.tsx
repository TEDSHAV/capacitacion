import * as React from "react";

export type BadgeProps = React.HTMLAttributes<HTMLDivElement>;

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none ${className}`}
        {...props}
      />
    );
  },
);
Badge.displayName = "Badge";

export { Badge };
