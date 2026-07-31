"use client";

import { Calendar, Users, MapPin, Lock, AlertCircle, FileStack } from "lucide-react";
import type { HiddenBatchSummary } from "@/types";

interface ClientePendingBatchesProps {
  batches: HiddenBatchSummary[];
}

export function ClientePendingBatches({ batches }: ClientePendingBatchesProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    const date = dateString.includes("T")
      ? new Date(dateString)
      : new Date(dateString + "T12:00:00");
    return date.toLocaleDateString("es-ES");
  };

  if (!batches || batches.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900">
          <FileStack className="w-5 h-5 text-amber-600" />
          Lotes pendientes de autorización
        </h2>
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p>
          Los documentos de los siguientes lotes están pendientes de autorización.
          Estarán disponibles una vez que sean autorizados.
        </p>
      </div>

      <div className="grid gap-4">
        {batches.map((batch) => (
          <div
            key={batch.nro_osi}
            className="bg-white border-2 border-amber-300 rounded-xl overflow-hidden"
          >
            <div className="block p-6 text-left w-full">
              <div className="flex justify-between items-start">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      OSI #{batch.nro_osi}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">
                      <Lock className="w-3 h-3" />
                      Pendiente de autorización
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {batch.course_name}
                  </h3>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{formatDate(batch.fecha_emision)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span>{batch.participant_count} participantes</span>
                    </div>
                    {batch.sede_names.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>
                          {batch.sede_names.length === 1
                            ? `${batch.city_names[0] || ""}${batch.city_names[0] ? " — " : ""}${batch.sede_names[0]}`
                            : "Múltiples ubicaciones"}
                        </span>
                      </div>
                    )}
                    {batch.sede_names.length === 0 && batch.city_names.length === 1 && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{batch.city_names[0]}</span>
                      </div>
                    )}
                    {batch.sede_names.length === 0 && batch.city_names.length > 1 && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>Múltiples ubicaciones</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="inline-flex items-center justify-center rounded-md border-2 border-amber-300 p-2 text-amber-600"
                    title="Documentos pendientes de autorización"
                  >
                    <Lock className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
