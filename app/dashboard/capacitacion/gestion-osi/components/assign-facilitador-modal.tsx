"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus, Trash2, AlertCircle, CheckCircle2, Layers } from "lucide-react";
import {
  getAssignmentByOSI,
  getActiveFacilitatorsForDropdown,
  assignOSIToFacilitador,
  unassignOSIToFacilitador,
} from "@/app/actions/osi-facilitador-assignments";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AssignFacilitadorModalProps {
  osiId: number;
  osiNumber: string;
  osiCompany: string;
  /** Number of sessions for this OSI (used for per-session assignment). If <=1, hides the session selector. */
  sessionCount?: number;
  onClose: () => void;
}

export default function AssignFacilitadorModal({
  osiId,
  osiNumber,
  osiCompany,
  sessionCount = 1,
  onClose,
}: AssignFacilitadorModalProps) {
  const [loading, setLoading] = useState(true);
  const [currentAssignments, setCurrentAssignments] = useState<any[]>([]);
  const [facilitators, setFacilitators] = useState<any[]>([]);
  const [selectedFacilitadorId, setSelectedFacilitadorId] = useState<string>("");
  const [selectedSession, setSelectedSession] = useState<string>("all");
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hasMultipleSessions = sessionCount > 1;

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [assignRes, facilitatorsData] = await Promise.all([
        getAssignmentByOSI(osiId),
        getActiveFacilitatorsForDropdown(),
      ]);

      if (assignRes.error) {
        setError(assignRes.error);
      } else {
        // getAssignmentByOSI now returns an array (multiple facilitadores possible)
        setCurrentAssignments(Array.isArray(assignRes.data) ? assignRes.data : (assignRes.data ? [assignRes.data] : []));
      }
      setFacilitators(facilitatorsData || []);
    } catch (err) {
      setError("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [osiId]);

  const handleAssign = async () => {
    if (!selectedFacilitadorId) {
      setError("Seleccione un facilitador");
      return;
    }
    setAssigning(true);
    setError(null);
    setSuccess(null);

    const nroSesion = selectedSession === "all" ? null : parseInt(selectedSession);
    const result = await assignOSIToFacilitador(
      osiId,
      parseInt(selectedFacilitadorId),
      "direct",
      nroSesion,
    );
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("Facilitador asignado exitosamente");
      setSelectedFacilitadorId("");
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    }
    setAssigning(false);
  };

  const handleUnassign = async (assignmentId: number) => {
    if (!confirm("¿Está seguro de desasignar el facilitador de esta OSI?")) return;

    const result = await unassignOSIToFacilitador(assignmentId);
    if (result.error) {
      setError(result.error);
    } else {
      await loadData();
    }
  };

  const sessionLabel = (nroSesion: number | null) =>
    nroSesion === null ? "Todas las sesiones" : `Sesión ${nroSesion}`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] animate-in fade-in duration-200">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[85vh] overflow-y-auto shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Asignar Facilitador
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {osiNumber} — {osiCompany}
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={onClose}
          >
            ✕
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm text-gray-500 mt-2">Cargando...</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Current Assignments (now a list — multiple facilitadores possible) */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Facilitador(es) Actual(es)
              </h4>
              {currentAssignments.length > 0 ? (
                <div className="space-y-2">
                  {currentAssignments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">
                          {a.facilitadores?.nombre_apellido}
                        </span>
                        <span className="text-xs text-gray-500">
                          Cédula: {a.facilitadores?.cedula || "N/A"}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          {sessionLabel(a.nro_sesion)}
                        </span>
                      </div>
                      <button
                        onClick={() => handleUnassign(a.id)}
                        className="text-red-500 hover:text-red-700 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                        title="Desasignar facilitador"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic py-3">
                  No hay facilitador asignado a esta OSI
                </p>
              )}
            </div>

            {/* Assign New Facilitador */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Asignar Nuevo Facilitador
              </h4>

              <Select
                value={selectedFacilitadorId}
                onValueChange={setSelectedFacilitadorId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar facilitador..." />
                </SelectTrigger>
                <SelectContent>
                  {facilitators.map((f) => (
                    <SelectItem key={f.id} value={f.id.toString()}>
                      {f.nombre_apellido}
                      {f.cedula ? ` — ${f.cedula}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Session selector — only shown when OSI has multiple sessions */}
              {hasMultipleSessions && (
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Sesión
                  </label>
                  <Select
                    value={selectedSession}
                    onValueChange={setSelectedSession}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar sesión..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las sesiones</SelectItem>
                      {Array.from({ length: sessionCount }, (_, i) => i + 1).map((n) => (
                        <SelectItem key={n} value={n.toString()}>
                          Sesión {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-md flex items-start gap-2 text-red-700 text-sm mt-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-50 border border-green-100 rounded-md flex items-start gap-2 text-green-700 text-sm mt-3">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <Button
                onClick={handleAssign}
                disabled={!selectedFacilitadorId || assigning}
                className="w-full mt-3"
              >
                {assigning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Asignando...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Asignar
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
