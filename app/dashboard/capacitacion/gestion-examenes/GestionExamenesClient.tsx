"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  FileCheck2,
  Plus,
  Search,
  Layers,
  QrCode,
  Users,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Trash2,
  ExternalLink,
  Laptop,
  BookOpen,
} from "lucide-react";
import type { EvaluacionPlantilla, OSIEvaluacion } from "@/types/evaluacion";
import AssignOSIExamModal from "./AssignOSIExamModal";
import OSIExamQRModal from "./OSIExamQRModal";
import OSIExamSubmissionsModal from "./OSIExamSubmissionsModal";
import { deleteEvaluacionPlantilla } from "@/app/actions/evaluaciones-cursos";

interface CourseOption {
  id: number;
  nombre: string;
}

interface OSIRow {
  id_osi: number;
  nro_osi: string;
  servicio: string;
  nombre_empresa: string;
  has_evaluation: boolean;
  evaluation_title?: string;
  evaluation_questions_count?: number;
  submissions_count?: number;
}

interface GestionExamenesClientProps {
  initialTemplates: EvaluacionPlantilla[];
  initialOsis: OSIRow[];
  courses: CourseOption[];
}

export default function GestionExamenesClient({
  initialTemplates,
  initialOsis,
  courses,
}: GestionExamenesClientProps) {
  const [activeTab, setActiveTab] = useState<"plantillas" | "osis">("plantillas");
  const [templates, setTemplates] = useState<EvaluacionPlantilla[]>(initialTemplates);
  const [osis, setOsis] = useState<OSIRow[]>(initialOsis);
  const [searchTerm, setSearchTerm] = useState("");

  // Modals state
  const [assigningOsi, setAssigningOsi] = useState<OSIRow | null>(null);
  const [qrModalOsi, setQrModalOsi] = useState<OSIRow | null>(null);
  const [submissionsModalOsi, setSubmissionsModalOsi] = useState<OSIRow | null>(null);

  // Filtered OSIs
  const filteredOsis = osis.filter((o) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      o.nro_osi.toLowerCase().includes(term) ||
      o.servicio.toLowerCase().includes(term) ||
      o.nombre_empresa.toLowerCase().includes(term)
    );
  });

  const handleDeleteTemplate = async (tpl: EvaluacionPlantilla) => {
    if (!confirm(`¿Eliminar la plantilla "${tpl.titulo}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    const res = await deleteEvaluacionPlantilla(tpl.id);
    if (res.success) {
      setTemplates(templates.filter((t) => t.id !== t.id));
    } else {
      alert(`Error al eliminar: ${res.error || "error desconocido"}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-sm">
              <FileCheck2 className="w-5 h-5" />
            </div>
            Evaluaciones Digitales de Cursos
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            Gestiona los bancos de preguntas estándar por curso y asigna exámenes digitales con código QR y modo Kiosk para las aulas de SHA.
          </p>
        </div>

        {activeTab === "plantillas" && (
          <Link
            href="/dashboard/capacitacion/gestion-examenes/plantillas/nueva"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Plantilla</span>
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6 text-sm">
          <button
            onClick={() => setActiveTab("plantillas")}
            className={`py-3 px-1 border-b-2 font-medium flex items-center gap-2 transition-colors ${
              activeTab === "plantillas"
                ? "border-teal-600 text-teal-700 font-bold"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Layers className="w-4 h-4" />
            Plantillas Maestras ({templates.length})
          </button>

          <button
            onClick={() => setActiveTab("osis")}
            className={`py-3 px-1 border-b-2 font-medium flex items-center gap-2 transition-colors ${
              activeTab === "osis"
                ? "border-teal-600 text-teal-700 font-bold"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Evaluaciones por OSI ({osis.filter((o) => o.has_evaluation).length} activas)
          </button>
        </nav>
      </div>

      {/* TAB 1: PLANTILLAS POR CURSO */}
      {activeTab === "plantillas" && (
        <div className="space-y-4">
          {templates.length === 0 ? (
            <div className="text-center py-12 bg-white border border-dashed border-gray-300 rounded-xl p-8">
              <FileCheck2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-800 mb-1">
                No hay plantillas de evaluación creadas
              </h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto mb-4">
                Crea plantillas estándar con preguntas de selección simple (3 opciones por defecto) para asociarlas rápidamente a los servicios.
              </p>
              <Link
                href="/dashboard/capacitacion/gestion-examenes/plantillas/nueva"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>Crear primera plantilla</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded">
                        {tpl.curso_nombre || "General / Multicurso"}
                      </span>
                      <span className="text-xs font-semibold text-gray-500">
                        Nota mín: <strong className="text-gray-800">{tpl.nota_aprobatoria}</strong>/20
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-gray-900 line-clamp-2">
                        {tpl.titulo}
                      </h3>
                      {tpl.descripcion && (
                        <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                          {tpl.descripcion}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-600 pt-1 border-t border-gray-100">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                        <strong>{tpl.preguntas_count || 0}</strong> preguntas
                      </span>
                      <span>•</span>
                      {tpl.tipo_evaluacion === "pre_post" ? (
                        <span className="font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded text-[10px]">
                          Pre y Post
                        </span>
                      ) : (
                        <span>Examen regular</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-gray-100">
                    <Link
                      href={`/dashboard/capacitacion/gestion-examenes/plantillas/${tpl.id}`}
                      className="inline-flex items-center text-xs h-7 px-2.5 text-blue-700 bg-white border border-blue-200 hover:bg-blue-50 rounded-lg font-medium transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1" />
                      Editar
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteTemplate(tpl)}
                      className="text-xs h-7 px-2 text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EVALUACIONES POR OSI */}
      {activeTab === "osis" && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex items-center gap-3 bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
            <Search className="w-4 h-4 text-gray-400 shrink-0 ml-1" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por N° OSI (ej. 2026-042), nombre del curso o empresa cliente..."
              className="flex-1 text-xs sm:text-sm bg-transparent border-0 focus:outline-none focus:ring-0 placeholder-gray-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="text-xs text-gray-400 hover:text-gray-600 px-2"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* OSIs Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50/80 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3 text-left">N° OSI</th>
                    <th className="px-4 py-3 text-left">Cliente / Empresa</th>
                    <th className="px-4 py-3 text-left">Curso / Servicio</th>
                    <th className="px-4 py-3 text-center">Evaluación Digital</th>
                    <th className="px-4 py-3 text-center">Evaluados</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredOsis.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-400">
                        No se encontraron OSIs que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    filteredOsis.map((osi) => (
                      <tr key={osi.id_osi} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">
                          {osi.nro_osi}
                        </td>
                        <td className="px-4 py-3 text-gray-700 font-medium">
                          {osi.nombre_empresa}
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                          {osi.servicio}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {osi.has_evaluation ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              Asignada ({osi.evaluation_questions_count || 0} preg)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                              Sin evaluación
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {osi.has_evaluation ? (
                            <button
                              onClick={() => setSubmissionsModalOsi(osi)}
                              className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-0.5 rounded-md transition-colors"
                              title="Ver participantes evaluados"
                            >
                              <Users className="w-3 h-3" />
                              {osi.submissions_count || 0}
                            </button>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setAssigningOsi(osi)}
                              className="text-xs h-7 px-2.5 text-teal-700 border-teal-200 hover:bg-teal-50"
                            >
                              {osi.has_evaluation ? "Editar" : "Asignar"}
                            </Button>

                            {osi.has_evaluation && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setQrModalOsi(osi)}
                                  className="text-xs h-7 px-2 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                                  title="Ver Código QR para el aula"
                                >
                                  <QrCode className="w-3.5 h-3.5" />
                                </Button>

                                <a
                                  href={`/evaluacion/${osi.nro_osi}/kiosk`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center p-1.5 text-xs text-indigo-600 border border-indigo-200 hover:bg-indigo-50 rounded-md transition-colors"
                                  title="Abrir Kiosk de aula en nueva pestaña"
                                >
                                  <Laptop className="w-3.5 h-3.5" />
                                </a>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {assigningOsi && (
        <AssignOSIExamModal
          osi={assigningOsi}
          templates={templates}
          onClose={() => setAssigningOsi(null)}
          onSaved={() => {
            setAssigningOsi(null);
            window.location.reload();
          }}
        />
      )}

      {qrModalOsi && (
        <OSIExamQRModal
          osi={qrModalOsi}
          onClose={() => setQrModalOsi(null)}
        />
      )}

      {submissionsModalOsi && (
        <OSIExamSubmissionsModal
          osi={submissionsModalOsi}
          onClose={() => setSubmissionsModalOsi(null)}
        />
      )}
    </div>
  );
}

