"use client";

import { OSILifecycleProps } from "@/types";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

export default function OSILifecycle({
  currentStatusId,
  statuses,
  compact = false,
}: OSILifecycleProps) {
  if (!statuses || statuses.length === 0) {
    return null;
  }

  // Sort statuses by order
  const sortedStatuses = [...statuses].sort(
    (a, b) => (a.orden || 0) - (b.orden || 0),
  );

  // Find current status index
  const currentIndex = sortedStatuses.findIndex(
    (s) => s.id === currentStatusId,
  );

  // Determine which statuses are completed, current, or pending
  const statusStates = sortedStatuses.map((status, index) => {
    if (index < currentIndex) {
      return "completed";
    } else if (index === currentIndex) {
      return "current";
    } else {
      return "pending";
    }
  });

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {sortedStatuses.map((status, index) => {
          const state = statusStates[index];
          const color = status.color_hex || "#6B7280";

          return (
            <div
              key={status.id}
              className="relative"
              title={`${status.nombre_estado}${state === "current" ? " (Actual)" : ""}`}
            >
              <div
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  state === "completed"
                    ? "scale-110"
                    : state === "current"
                      ? "scale-125 ring-2 ring-offset-1"
                      : "opacity-30"
                }`}
                style={{
                  backgroundColor: state === "pending" ? "#D1D5DB" : color,
                  ...(state === "current" &&
                    ({ "--tw-ring-color": color } as any)),
                }}
              />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Ciclo de Vida del OSI
        </span>
        {currentIndex >= 0 && (
          <span
            className="text-xs font-semibold px-2 py-1 rounded-full"
            style={{
              backgroundColor: `${sortedStatuses[currentIndex].color_hex}20`,
              color: sortedStatuses[currentIndex].color_hex || "#6B7280",
            }}
          >
            {sortedStatuses[currentIndex].nombre_estado}
          </span>
        )}
      </div>

      <div className="relative">
        {/* Progress line */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -translate-y-1/2" />

        {/* Status steps */}
        <div className="relative flex items-center justify-between">
          {sortedStatuses.map((status, index) => {
            const state = statusStates[index];
            const color = status.color_hex || "#6B7280";
            const isCompleted = state === "completed";
            const isCurrent = state === "current";
            const isPending = state === "pending";

            return (
              <div
                key={status.id}
                className="flex flex-col items-center gap-2 flex-1"
              >
                {/* Status circle */}
                <div
                  className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCompleted
                      ? "scale-110 shadow-md"
                      : isCurrent
                        ? "scale-125 shadow-lg ring-4 ring-white"
                        : "opacity-40 scale-90"
                  }`}
                  style={{
                    backgroundColor: isPending ? "#E5E7EB" : color,
                  }}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  ) : isCurrent ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400" />
                  )}
                </div>

                {/* Status label */}
                <div className="text-center">
                  <p
                    className={`text-xs font-medium transition-all duration-300 ${
                      isCurrent
                        ? "font-semibold"
                        : isCompleted
                          ? ""
                          : "text-gray-400"
                    }`}
                    style={{
                      color: isPending ? undefined : color,
                    }}
                  >
                    {status.nombre_estado}
                  </p>
                  {isCurrent && (
                    <p className="text-[10px] text-gray-500 mt-0.5">Actual</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress indicator */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Progreso</span>
          <span>
            {Math.round(((currentIndex + 1) / sortedStatuses.length) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${((currentIndex + 1) / sortedStatuses.length) * 100}%`,
              backgroundColor:
                sortedStatuses[currentIndex]?.color_hex || "#6B7280",
            }}
          />
        </div>
      </div>
    </div>
  );
}
