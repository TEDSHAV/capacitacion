"use client";

import React from "react";

interface SectionCardProps {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Reusable card wrapper for form sections. Provides a bordered card with
 * an icon + title header row, an optional action slot (e.g. download button),
 * and a compact content area.
 */
export const SectionCard = ({
  title,
  icon,
  action,
  children,
  className = "",
}: SectionCardProps) => {
  return (
    <div
      className={`border border-gray-200 rounded-lg p-4 bg-white shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon && (
            <span className="flex items-center justify-center text-[rgb(12,63,105)]">
              {icon}
            </span>
          )}
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        </div>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
};
