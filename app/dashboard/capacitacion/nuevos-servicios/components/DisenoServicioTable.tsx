"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { DisenoServicioListItem } from "@/types/diseno-servicio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, X, Loader2 } from "lucide-react";
import { updateNombreSugerido } from "@/app/actions/diseno-servicio";

const STATUS_COLORS: Record<number, string> = {
  35: "bg-amber-100 text-amber-800 border-amber-300",
  36: "bg-blue-100 text-blue-800 border-blue-300",
  37: "bg-green-100 text-green-800 border-green-300",
  38: "bg-green-100 text-green-800 border-green-300",
};

// Badge styling + label for tipo_solicitud ("creacion" | "modificacion").
const TIPO_SOLICITUD_BADGE: Record<string, { label: string; className: string }> = {
  creacion: {
    label: "Creación",
    className: "bg-violet-100 text-violet-800 border-violet-300",
  },
  modificacion: {
    label: "Modificación",
    className: "bg-cyan-100 text-cyan-800 border-cyan-300",
  },
};

export default function DisenoServicioTable({
  records,
}: {
  records: DisenoServicioListItem[];
}) {
  const router = useRouter();
  const [localRecords, setLocalRecords] = useState<DisenoServicioListItem[]>(records);
  const [editingRecord, setEditingRecord] = useState<DisenoServicioListItem | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  const handleOpenEdit = (e: React.MouseEvent, record: DisenoServicioListItem) => {
    e.stopPropagation();
    setEditingRecord(record);
    setNewTitle(record.nombre_sugerido || "");
    setErrorMsg(null);
  };

  const handleSaveTitle = async () => {
    if (!editingRecord) return;
    const trimmed = newTitle.trim();
    if (!trimmed) {
      setErrorMsg("El título sugerido no puede estar vacío.");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    try {
      await updateNombreSugerido(editingRecord.id, trimmed);
      setLocalRecords((prev) =>
        prev.map((r) =>
          r.id === editingRecord.id ? { ...r, nombre_sugerido: trimmed } : r
        )
      );
      setEditingRecord(null);
      router.refresh();
    } catch (err: any) {
      console.error("Error al actualizar título:", err);
      setErrorMsg(err?.message || "No se pudo actualizar el título sugerido.");
    } finally {
      setIsSaving(false);
    }
  };

  if (localRecords.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500 text-sm">
          No hay solicitudes de nuevos servicios que coincidan con los filtros.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Nombre Sugerido</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Tipo Solicitud</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Tipo Servicio</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Solicitante</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Departamento</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Estatus</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Fecha Solicitud</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {localRecords.map((record) => (
              <tr
                key={record.id}
                onClick={() => router.push(`/dashboard/capacitacion/nuevos-servicios/${record.id}`)}
                className="hover:bg-indigo-50/60 cursor-pointer transition-colors group"
              >
                <td className="px-4 py-3 text-gray-900 font-medium">
                  <div className="flex items-center justify-between gap-2">
                    <span className="group-hover:text-indigo-950 transition-colors">
                      {record.nombre_sugerido}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleOpenEdit(e, record)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-100/60 rounded-md transition-all shrink-0"
                      title="Editar título sugerido"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {(() => {
                    const tipo = (record.tipo_solicitud || "").toLowerCase();
                    const cfg = TIPO_SOLICITUD_BADGE[tipo];
                    if (!cfg) return <span className="text-gray-400">—</span>;
                    return (
                      <Badge className={`${cfg.className} border`}>
                        {cfg.label}
                      </Badge>
                    );
                  })()}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {record.tipo_servicio || "—"}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {record.solicitante_nombre || "—"}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {record.solicitante_departamento || "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    className={`${STATUS_COLORS[record.id_estatus] || "bg-gray-100 text-gray-700 border-gray-300"} border`}
                  >
                    {record.estatus_nombre || "Desconocido"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {record.fecha_solicitud
                    ? new Date(record.fecha_solicitud).toLocaleDateString("es-VE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal para editar Título Sugerido */}
      {editingRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => !isSaving && setEditingRecord(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100 space-y-4 animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                  <Pencil className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Modificar Título Sugerido
                  </h3>
                  <p className="text-xs text-gray-500">
                    Solicitud #{editingRecord.id} · {editingRecord.estatus_nombre || "Pendiente"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isSaving && setEditingRecord(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold text-gray-700">
                  Nombre o Título Sugerido
                </Label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  disabled={isSaving}
                  placeholder="Ingrese el título del servicio"
                  className="mt-1.5 font-medium"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitle();
                    if (e.key === "Escape") setEditingRecord(null);
                  }}
                />
              </div>

              {errorMsg && (
                <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                  {errorMsg}
                </p>
              )}

              <p className="text-[11px] text-gray-500">
                Este nombre se reflejará en el listado, en los encabezados del diseño de servicio y en los documentos PDF generados (RG-NEG-003).
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingRecord(null)}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveTitle}
                disabled={isSaving || !newTitle.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar Título"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
