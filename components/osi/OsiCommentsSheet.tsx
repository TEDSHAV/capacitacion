"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Loader2, MessageSquare, X } from "lucide-react";

type OsiCommentsSheetProps = {
  osiId: number | null;
  nroOsi?: string | null;
  servicio?: string | null;
  open: boolean;
  onClose: () => void;
};

function buildFrameUrl(osiId: number): string {
  if (osiId <= 0) return "about:blank";
  const base =
    process.env.NEXT_PUBLIC_NEGOCIOS_URL ||
    "https://gestion.shadevenezuela.com.ve";
  return `${base.replace(/\/$/, "")}/embed/osi-comentarios/${osiId}?shell=1`;
}

export default function OsiCommentsSheet({
  osiId,
  nroOsi,
  servicio,
  open,
  onClose,
}: OsiCommentsSheetProps) {
  const [frameLoading, setFrameLoading] = useState(true);

  // Reset spinner each time a new OSI opens
  useEffect(() => {
    if (!open) return;
    setFrameLoading(true);
  }, [open, osiId]);

  // Escape key to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!osiId || !open) return null;

  const frameSrc = buildFrameUrl(osiId);

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Cerrar chat de la OSI"
        className="fixed inset-x-0 bottom-0 top-0 z-40 bg-black/30"
        onClick={onClose}
      />

      {/* Sheet panel */}
      <aside
        className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-md flex-col overflow-hidden border-l border-[#00000014] bg-[#ECE5DD] shadow-2xl"
        role="dialog"
        aria-label={`Chat OSI ${nroOsi ?? osiId}`}
      >
        {/* Header */}
        <header className="flex shrink-0 items-center gap-2 bg-[#008069] px-3 py-2.5 text-white shadow-sm">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
            <ClipboardList className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-medium leading-tight">
              {nroOsi || `OSI #${osiId}`}
            </p>
            <p className="truncate text-[12px] text-white/80">
              {servicio || "Comentarios de la OSI"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-white/90 transition-colors hover:bg-white/10"
            title="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* iframe */}
        <div className="relative min-h-0 flex-1">
          {frameLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#ECE5DD]">
              <Loader2 className="h-6 w-6 animate-spin text-[#008069]" />
            </div>
          )}
          <iframe
            key={frameSrc}
            title={`Comentarios OSI ${nroOsi ?? osiId}`}
            src={frameSrc}
            className="h-full w-full border-0 bg-[#ECE5DD]"
            onLoad={() => setFrameLoading(false)}
          />
        </div>
      </aside>
    </>
  );
}

type CommentsButtonProps = {
  onClick: (e: React.MouseEvent) => void;
  className?: string;
};

/** Inline icon button — use this in table rows */
export function OsiCommentsButton({ onClick, className = "" }: CommentsButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-md border border-emerald-200 p-1.5 text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer ${className}`}
      title="Comentarios de la OSI"
    >
      <MessageSquare className="h-3.5 w-3.5" />
    </button>
  );
}
