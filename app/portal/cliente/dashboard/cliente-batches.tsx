"use client";

import { Calendar, Users, ChevronRight, FileStack, Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { ClienteBatchSummary } from "@/types";

interface ClienteBatchesProps {
  batches: ClienteBatchSummary[];
  onBatchClick: (batch: ClienteBatchSummary) => void;
}

export function ClienteBatches({ batches, onBatchClick }: ClienteBatchesProps) {
  const [downloadingOsi, setDownloadingOsi] = useState<number | null>(null);
  if (batches.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900">
        <FileStack className="w-5 h-5 text-gray-700" />
        Últimos Lotes Emitidos
      </h2>
      <div className="grid gap-4">
        {batches.map((batch) => (
          <div
            key={batch.nro_osi}
            onClick={() => onBatchClick(batch)}
            className="block bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow text-left w-full group cursor-pointer"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    OSI #{batch.nro_osi}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  {batch.course_name}
                </h3>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>
                      {batch.fecha_emision
                        ? new Date(batch.fecha_emision).toLocaleDateString()
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span>{batch.participant_count} participantes</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDownloadingOsi(batch.nro_osi);
                    window.open(`/api/batch-download-osi/${batch.nro_osi}`, "_blank");
                    setTimeout(() => setDownloadingOsi(null), 3000);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                  title="Descargar todos los certificados y carnets de este lote"
                >
                  {downloadingOsi === batch.nro_osi ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  Descargar Todo
                </button>
                <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-gray-900 transition-colors" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
