"use client";

import { memo, useState, useEffect, useRef } from "react";
import { toTitleCase } from "@/utils/string-utils";
import { CertificateManagement } from "@/types";
import { Button } from "@/components/ui/button";
import { Loader2, Pencil } from "lucide-react";

interface CertificateTableProps {
  certificates: CertificateManagement[];
  loading?: boolean;
  onViewCertificate?: (certificate: CertificateManagement) => void;
  onDownloadCertificate?: (certificate: CertificateManagement) => void;
  onVerifyCertificate?: (certificate: CertificateManagement) => void;
  onEditCertificate?: (certificate: CertificateManagement) => void;
  onScoreUpdate?: (
    certificateId: number,
    newScore: number,
  ) => Promise<{ success: boolean; message: string }>;
  headerActions?: React.ReactNode;
}

function CertificateTableComponent({
  certificates,
  loading,
  onViewCertificate,
  onDownloadCertificate,
  onVerifyCertificate,
  onEditCertificate,
  onScoreUpdate,
  headerActions,
}: CertificateTableProps) {
  // Inline score editing state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [savingId, setSavingId] = useState<number | null>(null);
  // Optimistic local overrides for displayed score (cleared on refetch via parent)
  const [scoreOverrides, setScoreOverrides] = useState<Record<number, number>>(
    {},
  );
  const editInputRef = useRef<HTMLInputElement | null>(null);

  // Focus the input when editing starts
  useEffect(() => {
    if (editingId !== null && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // Clear optimistic overrides whenever the certificates list changes (refetch)
  useEffect(() => {
    setScoreOverrides({});
  }, [certificates]);

  const startEdit = (certificate: CertificateManagement) => {
    if (!onScoreUpdate) return;
    setEditingId(certificate.id);
    setEditValue(String(certificate.calificacion));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const commitEdit = async (certificate: CertificateManagement) => {
    const parsed = parseFloat(editValue);
    if (!Number.isFinite(parsed)) {
      alert("Ingrese una calificación válida.");
      cancelEdit();
      return;
    }
    if (parsed < 0 || parsed > 20) {
      alert("La calificación debe estar entre 0 y 20.");
      cancelEdit();
      return;
    }

    // No change → just close
    if (parsed === certificate.calificacion) {
      cancelEdit();
      return;
    }

    if (!onScoreUpdate) {
      cancelEdit();
      return;
    }

    setSavingId(certificate.id);
    // Optimistic local update
    setScoreOverrides((prev) => ({ ...prev, [certificate.id]: parsed }));

    try {
      const result = await onScoreUpdate(certificate.id, parsed);
      if (!result.success) {
        // Revert optimistic update
        setScoreOverrides((prev) => {
          const next = { ...prev };
          delete next[certificate.id];
          return next;
        });
        alert(`Error: ${result.message}`);
      }
    } catch (err) {
      setScoreOverrides((prev) => {
        const next = { ...prev };
        delete next[certificate.id];
        return next;
      });
      alert("Ocurrió un error al actualizar la calificación.");
    } finally {
      setSavingId(null);
      setEditingId(null);
      setEditValue("");
    }
  };
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    // Adding T12:00:00 to avoid timezone shift for YYYY-MM-DD strings
    const date = dateString.includes("T")
      ? new Date(dateString)
      : new Date(dateString + "T12:00:00");
    return date.toLocaleDateString("es-ES");
  };

  const formatCedula = (cedula: string, nacionalidad: string) => {
    const prefix = nacionalidad === "extranjero" ? "E" : "V";
    return `${prefix}-${cedula}`;
  };

  const getParticipant = (certificate: CertificateManagement) => {
    const participant = certificate.participantes_certificados;
    return Array.isArray(participant) ? participant[0] : participant;
  };

  const getCompany = (certificate: CertificateManagement) => {
    const company = certificate.empresas;
    return Array.isArray(company) ? company[0] : company;
  };

  const getCourse = (certificate: CertificateManagement) => {
    const course = certificate.catalogo_servicios;
    return Array.isArray(course) ? course[0] : course;
  };

  const getFacilitator = (certificate: CertificateManagement) => {
    const facilitator = certificate.facilitadores;
    return Array.isArray(facilitator) ? facilitator[0] : facilitator;
  };

  const getStatusBadge = (
    isActive: boolean,
    fechaVencimiento: string | null,
  ) => {
    const now = new Date();
    // Adding T12:00:00 to avoid timezone shift for YYYY-MM-DD strings
    const expiryDate =
      fechaVencimiento && !fechaVencimiento.includes("T")
        ? new Date(fechaVencimiento + "T12:00:00")
        : fechaVencimiento
          ? new Date(fechaVencimiento)
          : null;
    const isExpired = expiryDate && expiryDate < now;

    if (!isActive) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
          Inactivo
        </span>
      );
    }

    if (isExpired) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
          Expirado
        </span>
      );
    }

    return (
      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
        Activo
      </span>
    );
  };

  const getScoreColor = (score: number) => {
    // Grading scale is 0-20
    if (score >= 18) return "text-green-600 font-medium";
    if (score >= 16) return "text-blue-600 font-medium";
    if (score >= 14) return "text-yellow-600 font-medium";
    return "text-red-600 font-medium";
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse"></div>
        </div>
        <div className="divide-y divide-gray-200">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="px-6 py-4 animate-pulse">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (certificates.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          No se encontraron certificados
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          No hay certificados que coincidan con los criterios de búsqueda
          actuales.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Certificados ({certificates.length})
        </h3>
        {headerActions && <div>{headerActions}</div>}
      </div>

      <table className="w-full table-fixed divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="w-[17%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Participante
            </th>
            <th className="w-[17%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Empresa
            </th>
            <th className="w-[22%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Curso
            </th>
            <th className="hidden lg:table-cell w-[13%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Facilitador
            </th>
            <th className="w-[11%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Emisión
            </th>
            <th className="hidden lg:table-cell w-[11%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Vencimiento
            </th>
            <th className="w-[7%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Pts
            </th>
            <th className="w-[15%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {certificates.map((certificate) => {
            const participant = getParticipant(certificate);
            const company = getCompany(certificate);
            const course = getCourse(certificate);
            const facilitator = getFacilitator(certificate);

            return (
              <tr key={certificate.id} className="hover:bg-gray-50">
                <td className="px-3 py-3">
                  <div
                    className="text-sm font-medium text-gray-900 truncate"
                    title={participant?.nombre || ""}
                  >
                    {participant?.nombre
                      ? toTitleCase(participant.nombre)
                      : "-"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {participant &&
                      formatCedula(
                        participant.cedula,
                        participant.nacionalidad,
                      )}
                  </div>
                </td>

                <td className="px-3 py-3">
                  <div
                    className="text-sm text-gray-900 truncate"
                    title={company?.razon_social || ""}
                  >
                    {company?.razon_social || "-"}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {company?.rif || ""}
                  </div>
                </td>

                <td className="px-3 py-3">
                  <div
                    className="text-sm text-gray-900 line-clamp-2"
                    title={course?.nombre || ""}
                  >
                    {course?.nombre || "-"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {course?.horas_estimadas
                      ? `${course.horas_estimadas}h`
                      : ""}
                  </div>
                </td>

                <td className="hidden lg:table-cell px-3 py-3">
                  <div
                    className="text-sm text-gray-900 truncate"
                    title={facilitator?.nombre_apellido || ""}
                  >
                    {facilitator?.nombre_apellido
                      ? toTitleCase(facilitator.nombre_apellido)
                      : "-"}
                  </div>
                </td>

                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatDate(certificate.fecha_emision)}
                  </div>
                  {certificate.nro_osi && (
                    <div className="text-xs text-gray-500">
                      OSI: {certificate.nro_osi}
                    </div>
                  )}
                </td>

                <td className="hidden lg:table-cell px-3 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatDate(certificate.fecha_vencimiento)}
                  </div>
                </td>

                <td className="px-3 py-3 whitespace-nowrap">
                  {editingId === certificate.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        ref={editInputRef}
                        type="number"
                        min={0}
                        max={20}
                        step={0.1}
                        value={editValue}
                        disabled={savingId === certificate.id}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            commitEdit(certificate);
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            cancelEdit();
                          }
                        }}
                        onBlur={() => commitEdit(certificate)}
                        className="w-16 px-1.5 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50"
                      />
                      {savingId === certificate.id && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                      )}
                    </div>
                  ) : (
                    <div
                      className={`group inline-flex items-center gap-1 text-sm font-medium ${getScoreColor(scoreOverrides[certificate.id] ?? certificate.calificacion)} ${onScoreUpdate ? "cursor-pointer hover:bg-blue-50 rounded px-1 -mx-1" : ""}`}
                      title={onScoreUpdate ? "Click para editar" : undefined}
                      onClick={() => startEdit(certificate)}
                    >
                      {(scoreOverrides[certificate.id] ?? certificate.calificacion).toFixed(1)}
                      {onScoreUpdate && (
                        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                      )}
                    </div>
                  )}
                </td>

                <td className="px-3 py-3">
                  <div className="flex flex-col gap-1">
                    {onViewCertificate && (
                      <button
                        onClick={() => onViewCertificate(certificate)}
                        className="w-full text-xs text-center py-1 px-2 rounded border border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                        title="Ver certificado"
                      >
                        Ver
                      </button>
                    )}
                    {onDownloadCertificate && (
                      <button
                        onClick={() => onDownloadCertificate(certificate)}
                        className="w-full text-xs text-center py-1 px-2 rounded border border-green-200 text-green-600 hover:bg-green-50 hover:border-green-300 transition-colors"
                        title="Descargar certificado"
                      >
                        Descargar
                      </button>
                    )}
                    {onEditCertificate && (
                      <button
                        onClick={() => onEditCertificate(certificate)}
                        className="w-full text-xs text-center py-1 px-2 rounded border border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-300 transition-colors"
                        title="Editar o reeditar certificado"
                      >
                        Editar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default memo(CertificateTableComponent);
