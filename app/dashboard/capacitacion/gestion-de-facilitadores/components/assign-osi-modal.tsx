"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Loader2, Plus, Trash2, AlertCircle, CheckCircle2, Search } from "lucide-react";
import {
  getAssignmentsByFacilitador,
  getAllOSIsForAssignment,
  assignOSIToFacilitador,
  unassignOSIToFacilitador,
} from "@/app/actions/osi-facilitador-assignments";

interface AssignOSIModalProps {
  facilitadorId: number;
  facilitadorName: string;
  onClose: () => void;
}

export default function AssignOSIModal({
  facilitadorId,
  facilitadorName,
  onClose,
}: AssignOSIModalProps) {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [allOsis, setAllOsis] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOsiId, setSelectedOsiId] = useState<number | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [assignRes, osis] = await Promise.all([
        getAssignmentsByFacilitador(facilitadorId),
        getAllOSIsForAssignment(),
      ]);

      if (assignRes.error) {
        setError(assignRes.error);
      } else {
        setAssignments(assignRes.data || []);
      }
      setAllOsis(osis || []);
    } catch (err) {
      setError("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [facilitadorId]);

  const assignedOsiIds = new Set(assignments.map((a) => a.osi_id));

  const filteredOsis = allOsis.filter(
    (osi) =>
      !assignedOsiIds.has(osi.id_osi) &&
      (osi.nro_osi?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        osi.nombre_empresa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        osi.servicio?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAssign = async () => {
    if (!selectedOsiId) {
      setError("Seleccione una OSI");
      return;
    }
    setAssigning(true);
    setError(null);
    setSuccess(null);

    const result = await assignOSIToFacilitador(selectedOsiId, facilitadorId, "direct");
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("OSI asignada exitosamente");
      setSelectedOsiId(null);
      setSearchTerm("");
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    }
    setAssigning(false);
  };

  const handleUnassign = async (assignmentId: number) => {
    if (!confirm("¿Está seguro de desasignar esta OSI del facilitador?")) return;

    const result = await unassignOSIToFacilitador(assignmentId);
    if (result.error) {
      setError(result.error);
    } else {
      await loadData();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] animate-in fade-in duration-200">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Asignar OSI a Facilitador
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {facilitadorName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm text-gray-500 mt-2">Cargando...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Assignments */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                OSIs Asignadas ({assignments.length})
              </h4>
              {assignments.length === 0 ? (
                <p className="text-sm text-gray-400 italic py-3">
                  No hay OSIs asignadas a este facilitador
                </p>
              ) : (
                <div className="space-y-2">
                  {assignments.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">
                          {a.osi?.nro_osi || `OSI #${a.osi_id}`}
                        </span>
                        <span className="text-xs text-gray-500">
                          {a.osi?.nombre_empresa} — {a.osi?.servicio}
                        </span>
                      </div>
                      <button
                        onClick={() => handleUnassign(a.id)}
                        className="text-red-500 hover:text-red-700 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                        title="Desasignar OSI"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Assignment */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Asignar Nueva OSI
              </h4>

              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar OSI por número, empresa o servicio..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {searchTerm && filteredOsis.length > 0 && (
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md mb-3">
                  {filteredOsis.map((osi) => (
                    <button
                      key={osi.id_osi}
                      onClick={() => {
                        setSelectedOsiId(osi.id_osi);
                        setSearchTerm(
                          `${osi.nro_osi} — ${osi.nombre_empresa}`
                        );
                      }}
                      className={`w-full text-left p-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0 ${
                        selectedOsiId === osi.id_osi ? "bg-blue-50" : ""
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">
                          {osi.nro_osi}
                        </span>
                        <span className="text-xs text-gray-500">
                          {osi.nombre_empresa} — {osi.servicio}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searchTerm && filteredOsis.length === 0 && (
                <p className="text-sm text-gray-400 italic py-2">
                  No se encontraron OSIs disponibles
                </p>
              )}

              {selectedOsiId && (
                <div className="flex items-center gap-2 mb-3 p-2 bg-blue-50 rounded-md">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-700">
                    OSI seleccionada. Click &quot;Asignar&quot; para confirmar.
                  </span>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-md flex items-start gap-2 text-red-700 text-sm mb-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-50 border border-green-100 rounded-md flex items-start gap-2 text-green-700 text-sm mb-3">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <Button
                onClick={handleAssign}
                disabled={!selectedOsiId || assigning}
                className="w-full"
              >
                {assigning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Asignando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Asignar OSI
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
