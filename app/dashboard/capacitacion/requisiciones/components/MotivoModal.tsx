"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface MotivoModalProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "destructive" | "default";
  onConfirm: (motivo: string) => Promise<void> | void;
  onClose: () => void;
}

// Lightweight modal for capturing a rejection reason. Uses the same overlay
// pattern as the success modal in RequisicionForm (no Dialog dependency).
export default function MotivoModal({
  open,
  title,
  description,
  confirmLabel = "Rechazar",
  cancelLabel = "Cancelar",
  confirmVariant = "destructive",
  onConfirm,
  onClose,
}: MotivoModalProps) {
  const [motivo, setMotivo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setMotivo("");
      setIsSubmitting(false);
    }
  }, [open]);

  if (!open) return null;

  const handleConfirm = async () => {
    if (!motivo.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirm(motivo.trim());
      onClose();
    } catch (e) {
      console.error("[MotivoModal] Error on confirm:", e);
      alert(e instanceof Error ? e.message : "Error al procesar la acción");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4 bg-white shadow-2xl border-none">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
          {description && <p className="text-sm text-gray-600 mb-4">{description}</p>}
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Indique el motivo..."
            className="min-h-[100px] text-sm"
            autoFocus
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={onClose}
            >
              {cancelLabel}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSubmitting || !motivo.trim()}
              onClick={handleConfirm}
              variant={confirmVariant === "destructive" ? "destructive" : "default"}
            >
              {isSubmitting ? "Procesando..." : confirmLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
