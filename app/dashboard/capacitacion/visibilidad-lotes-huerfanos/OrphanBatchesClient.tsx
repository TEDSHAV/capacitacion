"use client";

import { useState, useCallback, useMemo } from "react";
import {
  getOrphanCertificateBatches,
  setOrphanBatchVisibility,
  getSedesForEmpresa,
  assignSedeToOrphanBatch,
} from "@/app/actions/cliente-portal";
import type { OrphanBatchSummary, EmpresaSedeOption } from "@/types";
import { Loader2, Eye, EyeOff, RefreshCw, FileStack, AlertCircle, Search, MapPin, ChevronDown } from "lucide-react";

export function OrphanBatchesClient() {
  const [batches, setBatches] = useState<OrphanBatchSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Per-row sede dropdown state: which nro_osi is currently open
  const [openSedeNro, setOpenSedeNro] = useState<number | null>(null);
  // Sedes fetched for the company of the currently-open row
  const [sedesForRow, setSedesForRow] = useState<EmpresaSedeOption[]>([]);
  const [sedesLoading, setSedesLoading] = useState(false);
  // Which nro_osi is currently saving a sede change
  const [savingSedeNro, setSavingSedeNro] = useState<number | null>(null);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getOrphanCertificateBatches();
      if (result.error) {
        setError(result.error);
      } else {
        setBatches(result.data || []);
      }
    } catch (err) {
      setError("Error al cargar los lotes sin OSI");
      console.error(err);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, []);

  const handleToggle = useCallback(
    async (nroOsi: number, currentVisible: boolean) => {
      setTogglingId(nroOsi);
      try {
        const result = await setOrphanBatchVisibility(nroOsi, currentVisible);
        if (result.success) {
          setBatches((prev) =>
            prev.map((b) =>
              b.nro_osi === nroOsi ? { ...b, visible: !currentVisible } : b,
            ),
          );
        } else {
          setError(result.error || "Error al actualizar la visibilidad");
        }
      } catch (err) {
        setError("Error inesperado");
        console.error(err);
      } finally {
        setTogglingId(null);
      }
    },
    [],
  );

  const handleOpenSedeDropdown = useCallback(
    async (batch: OrphanBatchSummary) => {
      // Toggle: if already open for this row, close it.
      if (openSedeNro === batch.nro_osi) {
        setOpenSedeNro(null);
        setSedesForRow([]);
        return;
      }
      setOpenSedeNro(batch.nro_osi);
      setSedesForRow([]);
      if (!batch.id_empresa) {
        return; // No company → no sedes to fetch
      }
      setSedesLoading(true);
      try {
        const result = await getSedesForEmpresa(batch.id_empresa);
        if (result.error) {
          setError(result.error);
        } else {
          setSedesForRow(result.data || []);
        }
      } catch (err) {
        setError("Error al cargar las sedes");
        console.error(err);
      } finally {
        setSedesLoading(false);
      }
    },
    [openSedeNro],
  );

  const handleAssignSede = useCallback(
    async (nroOsi: number, sedeId: number | null) => {
      setSavingSedeNro(nroOsi);
      setOpenSedeNro(null);
      try {
        const result = await assignSedeToOrphanBatch(nroOsi, sedeId);
        if (result.success) {
          // Update local state: find the sede name from the fetched list.
          const sedeName =
            sedeId === null
              ? null
              : sedesForRow.find((s) => s.id === sedeId)?.nombre_sede ?? null;
          setBatches((prev) =>
            prev.map((b) =>
              b.nro_osi === nroOsi
                ? {
                    ...b,
                    current_sede_id: sedeId,
                    current_sede_name: sedeName,
                  }
                : b,
            ),
          );
        } else {
          setError(result.error || "Error al asignar la sede");
        }
      } catch (err) {
        setError("Error inesperado");
        console.error(err);
      } finally {
        setSavingSedeNro(null);
      }
    },
    [sedesForRow],
  );

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = dateString.includes("T")
      ? new Date(dateString)
      : new Date(dateString + "T12:00:00");
    return date.toLocaleDateString("es-ES");
  };

  // Filter batches by company name or nro_osi
  const filteredBatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return batches;
    return batches.filter(
      (b) =>
        b.company_name.toLowerCase().includes(q) ||
        String(b.nro_osi).includes(q),
    );
  }, [batches, searchQuery]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
            <FileStack className="w-6 h-6 text-amber-600" />
            Lotes sin OSI en PRISMA — Visibilidad Cliente
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Certificados con nro_osi que no existen en ejecucion_osi.
            Herramienta administrativa para gestionar visibilidad y sede.
          </p>
        </div>
        <button
          onClick={fetchBatches}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {loaded ? "Actualizar" : "Cargar lotes"}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {loaded && !loading && batches.length === 0 && !error && (
        <div className="text-center py-12 text-gray-500">
          <FileStack className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No hay lotes sin OSI. Todos los certificados tienen un OSI válido.</p>
        </div>
      )}

      {batches.length > 0 && (
        <>
          {/* Search bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por empresa o nro OSI..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <span className="text-sm text-gray-500">
              {filteredBatches.length} de {batches.length} lote(s)
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    OSI #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Curso
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Empresa
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Sede
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Participantes
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Fecha Emisión
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredBatches.map((batch) => (
                  <tr key={batch.nro_osi} className="hover:bg-gray-50 align-top">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {batch.nro_osi}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {batch.course_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {batch.company_name}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {/* Current sede badge */}
                      {batch.current_sede_name ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-700">
                          <MapPin className="w-3 h-3" />
                          {batch.current_sede_name}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-amber-100 text-amber-700">
                          <MapPin className="w-3 h-3" />
                          Sin sede
                        </span>
                      )}
                      {/* Sede selector dropdown */}
                      <div className="relative mt-1.5">
                        <button
                          onClick={() => handleOpenSedeDropdown(batch)}
                          disabled={savingSedeNro === batch.nro_osi || !batch.id_empresa}
                          className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          title={batch.id_empresa ? "Cambiar sede" : "Sin empresa asociada"}
                        >
                          {savingSedeNro === batch.nro_osi ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                          Cambiar
                        </button>
                        {openSedeNro === batch.nro_osi && (
                          <div className="absolute z-20 mt-1 left-0 min-w-[200px] bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                            {sedesLoading ? (
                              <div className="px-3 py-2 text-xs text-gray-500 flex items-center gap-2">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Cargando sedes...
                              </div>
                            ) : sedesForRow.length === 0 ? (
                              <div className="px-3 py-2 text-xs text-gray-500">
                                No hay sedes activas para esta empresa
                              </div>
                            ) : (
                              <>
                                {batch.current_sede_id !== null && (
                                  <button
                                    onClick={() => handleAssignSede(batch.nro_osi, null)}
                                    className="block w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 border-b border-gray-100"
                                  >
                                    Quitar sede
                                  </button>
                                )}
                                {sedesForRow.map((sede) => (
                                  <button
                                    key={sede.id}
                                    onClick={() => handleAssignSede(batch.nro_osi, sede.id)}
                                    className={`block w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${
                                      sede.id === batch.current_sede_id
                                        ? "font-semibold text-green-700 bg-green-50"
                                        : "text-gray-700"
                                    }`}
                                  >
                                    {sede.nombre_sede}
                                    {sede.id === batch.current_sede_id && " ✓"}
                                  </button>
                                ))}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {batch.participant_count}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatDate(batch.fecha_emision)}
                    </td>
                    <td className="px-4 py-3">
                      {batch.visible ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-700">
                          <Eye className="w-3 h-3" />
                          Visible
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-amber-100 text-amber-700">
                          <EyeOff className="w-3 h-3" />
                          Oculto
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggle(batch.nro_osi, batch.visible)}
                        disabled={togglingId === batch.nro_osi}
                        className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                          batch.visible
                            ? "border-red-200 text-red-700 hover:bg-red-50"
                            : "border-green-200 text-green-700 hover:bg-green-50"
                        }`}
                        title={batch.visible ? "Ocultar para cliente" : "Mostrar para cliente"}
                      >
                        {togglingId === batch.nro_osi ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : batch.visible ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            Ocultar
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            Mostrar
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredBatches.length === 0 && searchQuery && (
            <div className="text-center py-8 text-gray-500 text-sm">
              No se encontraron lotes que coincidan con "{searchQuery}".
            </div>
          )}
        </>
      )}

      {/* Click-away overlay to close the sede dropdown */}
      {openSedeNro !== null && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setOpenSedeNro(null);
            setSedesForRow([]);
          }}
        />
      )}
    </div>
  );
}
