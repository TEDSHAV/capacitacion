"use client";

import { useState } from "react";
import { X, Send, Trash2 } from "lucide-react";
import type { OsiNota } from "@/types";
import { addOsiNota, deleteOsiNota } from "@/app/actions/capacitacion-osi-notas";

interface Props {
  osiId: number;
  osiNumber: string;
  initialNotas: OsiNota[];
  onClose: () => void;
  onNotasUpdated: (notas: OsiNota[]) => void;
}

function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "hace unos segundos";
  if (diffMins < 60) return `hace ${diffMins}m`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays < 7) return `hace ${diffDays}d`;
  if (diffDays < 30) return `hace ${Math.floor(diffDays / 7)}w`;

  return date.toLocaleDateString("es-VE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function OsiNotasModal({
  osiId,
  osiNumber,
  initialNotas,
  onClose,
  onNotasUpdated,
}: Props) {
  const [notas, setNotas] = useState<OsiNota[]>(initialNotas);
  const [newNota, setNewNota] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAddNota = async () => {
    if (!newNota.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await addOsiNota(osiId, newNota);
      if (result.success && result.data) {
        const updated = [result.data, ...notas];
        setNotas(updated);
        onNotasUpdated(updated);
        setNewNota("");
      } else {
        setError(result.error ?? "Error al agregar la nota");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNota = async (notaId: number) => {
    setDeleting(notaId);
    setError(null);

    try {
      const result = await deleteOsiNota(notaId);
      if (result.success) {
        const updated = notas.filter((n) => n.id !== notaId);
        setNotas(updated);
        onNotasUpdated(updated);
      } else {
        setError(result.error ?? "Error al eliminar la nota");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Notas y observaciones
            </h2>
            <p className="text-sm text-gray-500">OSI {osiNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Existing notes */}
          {notas.length > 0 ? (
            <div className="space-y-3 mb-6">
              {notas.map((nota) => (
                <div
                  key={nota.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {nota.autorNombre ?? "Usuario"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatRelativeDate(nota.createdAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => void handleDeleteNota(nota.id)}
                      disabled={deleting === nota.id}
                      className="p-1 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
                      title="Eliminar nota"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {nota.nota}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">No hay notas aún. Agrega una para documentar el estado.</p>
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="px-6 py-2 bg-red-50 border-t border-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex flex-col gap-2">
            <textarea
              value={newNota}
              onChange={(e) => setNewNota(e.target.value)}
              placeholder="Escribe una nota o observación..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              disabled={submitting}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {newNota.length}/2000 caracteres
              </p>
              <button
                onClick={() => void handleAddNota()}
                disabled={!newNota.trim() || submitting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                {submitting ? "Guardando..." : "Agregar nota"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
