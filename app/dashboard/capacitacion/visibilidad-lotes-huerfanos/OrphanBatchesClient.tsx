"use client";

import { useState, useCallback, useMemo } from "react";
import {
  getOrphanCertificateBatches,
  setOrphanBatchVisibility,
} from "@/app/actions/cliente-portal";
import type { OrphanBatchSummary } from "@/types";
import { Loader2, Eye, EyeOff, RefreshCw, FileStack, AlertCircle, Search } from "lucide-react";

export function OrphanBatchesClient() {
  const [batches, setBatches] = useState<OrphanBatchSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
      setError("Error al cargar los lotes huérfanos");
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
            Lotes Huérfanos — Visibilidad Cliente
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Certificados con nro_osi que no existen en ejecucion_osi.
            Disponible solo en desarrollo.
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
          <p>No hay lotes huérfanos. Todos los certificados tienen un OSI válido.</p>
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
                  <tr key={batch.nro_osi} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {batch.nro_osi}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {batch.course_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {batch.company_name}
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
    </div>
  );
}
