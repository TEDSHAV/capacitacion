"use client";

import { useState } from "react";
import { X, Layers, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import type { IndicadorOsiRow } from "@/types";
import { agruparOsisComoServicio } from "@/app/actions/indicadores-ajustes";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedRows: IndicadorOsiRow[];
  onSuccess: () => void;
}

export default function AgruparOsisModal({
  isOpen,
  onClose,
  selectedRows,
  onSuccess,
}: Props) {
  // Default parent to the first selected OSI or one that already has certificates
  const [parentOsiId, setParentOsiId] = useState<number>(() => {
    const withCert = selectedRows.find((r) => r.fechaEmision);
    return withCert ? withCert.osiId : selectedRows[0]?.osiId ?? 0;
  });
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || selectedRows.length < 2) return null;

  const parentRow = selectedRows.find((r) => r.osiId === parentOsiId) || selectedRows[0];
  const childRows = selectedRows.filter((r) => r.osiId !== parentRow?.osiId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentRow) return;

    setError(null);
    setSaving(true);

    try {
      const childIds = childRows.map((r) => r.osiId);
      const res = await agruparOsisComoServicio({
        parentOsiId: parentRow.osiId,
        childOsiIds: childIds,
        motivo: motivo.trim() || `Vinculada a ${parentRow.nroOsi} (mismo servicio)`,
      });

      if (!res.success) {
        setError(res.error || "Error al agrupar las OSIs.");
        setSaving(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-sky-600 to-sky-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/15 rounded-xl">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Agrupar en 1 Solo Servicio
              </h3>
              <p className="text-xs text-sky-100">
                Consolidar {selectedRows.length} OSIs para el cálculo del SLA 72h
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-sky-50/70 border border-sky-200/80 rounded-xl p-3.5 text-xs text-sky-800 leading-relaxed">
            <p className="font-semibold text-sky-900 mb-1">
              ¿Cómo impacta el SLA de 72 horas?
            </p>
            Al agrupar estas <strong>{selectedRows.length} OSIs</strong>, el sistema las contabilizará como <strong>1 solo servicio impartido</strong> en los indicadores (en lugar de penalizar el indicador con {selectedRows.length} pendientes o retrasos separados).
          </div>

          {/* Seleccionar OSI Principal */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
              1. Seleccione la OSI Principal (Representante del Servicio)
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Las demás OSIs quedarán vinculadas a esta y compartirán su estado de emisión y ejecución.
            </p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-2 bg-gray-50/50">
              {selectedRows.map((r) => {
                const isSelected = r.osiId === parentOsiId;
                return (
                  <label
                    key={r.osiId}
                    className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-all border ${
                      isSelected
                        ? "bg-white border-sky-400 shadow-xs"
                        : "bg-white/60 border-transparent hover:bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="parentOsi"
                      checked={isSelected}
                      onChange={() => setParentOsiId(r.osiId)}
                      className="mt-0.5 text-sky-600 focus:ring-sky-500"
                    />
                    <div className="flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900">{r.nroOsi}</span>
                        {isSelected && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-sky-100 text-sky-700">
                            Principal
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 font-medium truncate">{r.empresa}</p>
                      <p className="text-gray-400 text-[11px] truncate">{r.servicio}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Resumen del Grupo */}
          <div className="text-xs text-gray-600 bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-1">
            <div className="flex items-center gap-1.5 text-gray-700">
              <span className="font-semibold">OSI Principal:</span>
              <span className="font-bold text-sky-700">{parentRow?.nroOsi}</span>
            </div>
            <div className="flex items-start gap-1.5 text-gray-600">
              <span className="font-semibold shrink-0">OSIs Vinculadas ({childRows.length}):</span>
              <span className="text-gray-700 truncate">
                {childRows.map((c) => c.nroOsi).join(", ")}
              </span>
            </div>
          </div>

          {/* Motivo o Justificación */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Motivo o Justificación (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: Mismo curso dictado para varios grupos o sedes"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          {/* Botones */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Agrupando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirmar y Agrupar ({selectedRows.length} OSIs)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
