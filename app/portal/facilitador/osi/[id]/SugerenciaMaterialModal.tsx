"use client";

import { useState } from "react";
import {
  X,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
} from "lucide-react";
import { submitMaterialSugerencia } from "@/app/actions/material-didactico";
import type { MaterialDidactico, TipoSugerencia } from "@/types/material-didactico";

interface SugerenciaMaterialModalProps {
  material: MaterialDidactico;
  facilitadorId?: number;
  facilitadorNombre: string;
  osiId?: number;
  cursoId?: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function SugerenciaMaterialModal({
  material,
  facilitadorId,
  facilitadorNombre,
  osiId,
  cursoId,
  isOpen,
  onClose,
}: SugerenciaMaterialModalProps) {
  const [diapositivaNro, setDiapositivaNro] = useState<string>("");
  const [tipoSugerencia, setTipoSugerencia] = useState<TipoSugerencia>("mejora");
  const [comentario, setComentario] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comentario.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await submitMaterialSugerencia({
        id_material: material.id,
        id_curso: cursoId || material.id_curso || null,
        id_osi: osiId || material.id_osi || null,
        facilitador_id: facilitadorId || null,
        facilitador_nombre: facilitadorNombre || "Facilitador",
        diapositiva_nro: diapositivaNro ? parseInt(diapositivaNro, 10) : null,
        tipo_sugerencia: tipoSugerencia,
        comentario: comentario.trim(),
      });

      if (!res.success) {
        setError(res.error || "Error al registrar sugerencia");
      } else {
        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || "Error al enviar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
              <Lightbulb className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Observación sobre la Presentación
              </h3>
              <p className="text-xs text-slate-500 truncate max-w-xs">
                {material.titulo}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {success ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">¡Observación Enviada!</h4>
              <p className="text-xs text-slate-600 max-w-xs">
                Muchas gracias por tu aporte. El equipo de Capacitación revisará tu comentario para actualizar el material oficial.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Tipo de Observación
                  </label>
                  <select
                    value={tipoSugerencia}
                    onChange={(e) => setTipoSugerencia(e.target.value as TipoSugerencia)}
                    className="w-full text-xs sm:text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium"
                  >
                    <option value="mejora">💡 Mejora de contenido</option>
                    <option value="error_contenido">✏️ Error ortográfico o tipográfico</option>
                    <option value="actualizacion_norma">⚖️ Actualización normativa / técnica</option>
                    <option value="mejora_visual">🎨 Mejora visual o de diseño</option>
                    <option value="otro">📎 Otra sugerencia</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    N° Diapositiva (Opcional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={diapositivaNro}
                    onChange={(e) => setDiapositivaNro(e.target.value)}
                    placeholder="Ej. 14"
                    className="w-full text-xs sm:text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Detalle de la sugerencia u observación *
                </label>
                <textarea
                  rows={4}
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Describe qué aspecto se puede mejorar o corregir en esta presentación..."
                  className="w-full text-xs sm:text-sm rounded-lg border border-slate-300 bg-white p-3 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium placeholder:text-slate-400"
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[11px] text-slate-500">
                  Emitida por: <strong>{facilitadorNombre}</strong>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !comentario.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-2xs transition-all disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    Enviar Observación
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
