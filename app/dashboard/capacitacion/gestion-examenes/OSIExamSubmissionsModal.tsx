"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  X,
  Users,
  CheckCircle2,
  XCircle,
  Smartphone,
  Laptop,
  Clock,
  RefreshCw,
  Loader2,
} from "lucide-react";
import type { EvaluacionRespuestaItem } from "@/types/evaluacion";
import { getOSIEvaluacionSubmissions } from "@/app/actions/evaluaciones-cursos";

interface OSIExamSubmissionsModalProps {
  osi: {
    id_osi: number;
    nro_osi: string;
    servicio: string;
    nombre_empresa: string;
  };
  onClose: () => void;
}

export default function OSIExamSubmissionsModal({
  osi,
  onClose,
}: OSIExamSubmissionsModalProps) {
  const [submissions, setSubmissions] = useState<EvaluacionRespuestaItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSubmissions = () => {
    setLoading(true);
    getOSIEvaluacionSubmissions(osi.id_osi)
      .then((data) => setSubmissions(data))
      .catch((err) => console.error("Error loading submissions:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSubmissions();
  }, [osi.id_osi]);

  const approvedCount = submissions.filter((s) => s.aprobado).length;
  const failedCount = submissions.length - approvedCount;
  const avgScore =
    submissions.length > 0
      ? submissions.reduce((sum, s) => sum + s.nota, 0) / submissions.length
      : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded">
                  OSI: {osi.nro_osi}
                </span>
                <span className="text-xs text-gray-500 truncate max-w-xs">{osi.nombre_empresa}</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mt-0.5">
                Evaluaciones Realizadas ({submissions.length})
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadSubmissions}
              disabled={loading}
              className="p-1.5 text-gray-500 hover:text-teal-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refrescar resultados"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Summary Bar */}
        {submissions.length > 0 && (
          <div className="bg-gray-50 px-6 py-2.5 border-b border-gray-200 grid grid-cols-3 gap-2 text-center text-xs shrink-0">
            <div>
              <span className="text-gray-500 block">Total Evaluados</span>
              <strong className="text-sm font-bold text-gray-800">{submissions.length}</strong>
            </div>
            <div>
              <span className="text-gray-500 block">Aprobados / Reprobados</span>
              <span className="font-bold">
                <span className="text-emerald-700">{approvedCount}</span> /{" "}
                <span className="text-red-600">{failedCount}</span>
              </span>
            </div>
            <div>
              <span className="text-gray-500 block">Promedio General</span>
              <strong className="text-sm font-bold text-teal-700">{avgScore.toFixed(1)} / 20</strong>
            </div>
          </div>
        )}

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mb-2 text-teal-600" />
              <p className="text-xs">Cargando evaluaciones registradas...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-gray-700 mb-1">
                Aún no hay evaluaciones registradas
              </h4>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Los participantes que escaneen el código QR o utilicen el Kiosk de aula aparecerán aquí automáticamente en tiempo real.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Participante</th>
                    <th className="px-4 py-2.5 text-left">Cédula</th>
                    <th className="px-4 py-2.5 text-center">Nota</th>
                    <th className="px-4 py-2.5 text-center">Resultado</th>
                    <th className="px-4 py-2.5 text-center">Dispositivo</th>
                    <th className="px-4 py-2.5 text-right">Fecha / Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-gray-900">
                        {sub.nombre_apellido}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 font-mono">
                        {sub.cedula}
                      </td>
                      <td className="px-4 py-2.5 text-center font-bold text-sm">
                        <span
                          className={
                            sub.aprobado ? "text-emerald-700" : "text-red-600"
                          }
                        >
                          {sub.nota.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-gray-400 font-normal"> / 20</span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {sub.aprobado ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Aprobado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-red-50 text-red-800 border border-red-200 px-2 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3 text-red-600" />
                            Reprobado
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center text-gray-500">
                        {sub.dispositivo === "kiosk" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                            <Laptop className="w-3 h-3" />
                            Kiosk Aula
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded">
                            <Smartphone className="w-3 h-3" />
                            Móvil QR
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-400 text-[11px]">
                        <span className="flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(sub.created_at).toLocaleTimeString("es-VE", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-gray-500">
            Las calificaciones se sincronizan automáticamente con el Portal del Facilitador y el certificado.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}

