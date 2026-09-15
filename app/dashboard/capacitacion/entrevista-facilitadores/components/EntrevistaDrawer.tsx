"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  X,
  User,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Car,
  Laptop,
  Plane,
  GraduationCap,
  FileCheck2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  Edit,
  Printer,
  UserCheck,
  Loader2,
  ExternalLink,
  Save,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import type {
  FacilitadorEntrevista,
  EntrevistaEstatus,
} from "@/types/entrevistas-facilitadores";
import { ESTATUS_CONFIG } from "@/types/entrevistas-facilitadores";
import {
  promoverAFacilitador,
  updateEntrevistaEstatus,
} from "@/app/actions/entrevistas-facilitadores";
import { useToast } from "@/lib/ui/toast-context";
import { toTitleCase } from "@/utils/string-utils";

interface EntrevistaDrawerProps {
  entrevista: FacilitadorEntrevista | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updated: FacilitadorEntrevista) => void;
  onPrint: (entrevista: FacilitadorEntrevista) => void;
}

export function EntrevistaDrawer({
  entrevista,
  isOpen,
  onClose,
  onUpdated,
  onPrint,
}: EntrevistaDrawerProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<"datos" | "competencias" | "evaluacion">("datos");
  const [isPromoting, setIsPromoting] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [currentEstatus, setCurrentEstatus] = useState<EntrevistaEstatus>("pendiente");
  const [observacionesNotes, setObservacionesNotes] = useState("");

  useEffect(() => {
    if (entrevista) {
      setCurrentEstatus(entrevista.estatus);
      setObservacionesNotes(entrevista.observaciones || "");
    }
  }, [entrevista]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !entrevista) return null;

  const initials = (entrevista.nombre_apellido || "A")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  const estatusConf = ESTATUS_CONFIG[entrevista.estatus] || ESTATUS_CONFIG.pendiente;

  const docsCount = [
    entrevista.doc_resumen_curricular,
    entrevista.doc_cedula_identidad,
    entrevista.doc_soportes_resumen_curricular,
    entrevista.doc_rif_actualizado,
    entrevista.doc_registro_inpsasel,
    entrevista.doc_factura_fiscal,
    entrevista.doc_titulo_universitario,
    entrevista.doc_declaracion_islr,
    entrevista.doc_formacion_docente,
    entrevista.doc_posee_laptop,
  ].filter(Boolean).length;

  const handlePromote = async () => {
    if (!confirm(`¿Deseas promover a ${toTitleCase(entrevista.nombre_apellido)} como facilitador activo? La entrevista se mantendrá registrada y se creará el perfil en Facilitadores.`)) {
      return;
    }

    setIsPromoting(true);
    try {
      const res = await promoverAFacilitador(entrevista.id);
      if (!res.success) {
        addToast(res.error || "Error al promover a facilitador", "error");
        return;
      }

      addToast("Aspirante promovido exitosamente a Facilitador", "success");
      if (res.entrevista) {
        onUpdated(res.entrevista);
      }
      router.refresh();
    } catch {
      addToast("Error de conexión al promover", "error");
    } finally {
      setIsPromoting(false);
    }
  };

  const handleSaveStatusNotes = async () => {
    setIsSavingStatus(true);
    try {
      const res = await updateEntrevistaEstatus(
        entrevista.id,
        currentEstatus,
        observacionesNotes
      );
      if (res.error || !res.entrevista) {
        addToast(res.error || "Error al actualizar", "error");
        return;
      }

      addToast("Estado y observaciones guardados", "success");
      onUpdated(res.entrevista);
    } catch {
      addToast("Error al guardar cambios", "error");
    } finally {
      setIsSavingStatus(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-6 py-5 bg-gradient-to-r from-violet-900 to-indigo-800 text-white flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center font-bold text-xl text-white shadow-inner">
                {initials}
              </div>
              <div>
                <h2 className="text-xl font-bold leading-tight capitalize">
                  {entrevista.nombre_apellido}
                </h2>
                <div className="flex items-center gap-2 mt-1 text-sm text-violet-200">
                  <span>C.I. {entrevista.cedula || "No registrada"}</span>
                  <span>•</span>
                  <span>Entrevista: {entrevista.fecha_entrevista}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                      entrevista.estatus === "aprobado"
                        ? "bg-emerald-500 text-white"
                        : entrevista.estatus === "rechazado"
                        ? "bg-rose-500 text-white"
                        : "bg-amber-500 text-white"
                    }`}
                  >
                    {entrevista.estatus}
                  </span>

                  {entrevista.facilitador_id ? (
                    <Link
                      href={`/dashboard/capacitacion/gestion-de-facilitadores?edit=${entrevista.facilitador_id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/80 text-white hover:bg-blue-500 transition-colors"
                      title="Ver perfil de Facilitador"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Promovido (ID #{entrevista.facilitador_id})
                      <ExternalLink className="w-3 h-3 ml-0.5" />
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Action Bar */}
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Link
                href={`/dashboard/capacitacion/entrevista-facilitadores/${entrevista.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              >
                <Edit className="w-4 h-4 text-violet-600" />
                Editar Formulario
              </Link>
              <button
                onClick={() => onPrint(entrevista)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              >
                <Printer className="w-4 h-4 text-blue-600" />
                Imprimir
              </button>
            </div>

            {!entrevista.facilitador_id && (
              <button
                onClick={handlePromote}
                disabled={isPromoting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                {isPromoting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserCheck className="w-4 h-4" />
                )}
                Promover a Facilitador
              </button>
            )}
          </div>

          {/* Tabs Navigation */}
          <div className="px-6 border-b border-gray-200 flex gap-6 bg-white shrink-0">
            <button
              onClick={() => setActiveTab("datos")}
              className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "datos"
                  ? "border-violet-600 text-violet-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <User className="w-4 h-4" />
              Datos & Documentos
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-normal">
                {docsCount}/10
              </span>
            </button>
            <button
              onClick={() => setActiveTab("competencias")}
              className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "competencias"
                  ? "border-violet-600 text-violet-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Competencias & Respuestas
            </button>
            <button
              onClick={() => setActiveTab("evaluacion")}
              className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "evaluacion"
                  ? "border-violet-600 text-violet-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <FileCheck2 className="w-4 h-4" />
              Evaluación & Estatus
            </button>
          </div>

          {/* Tab Content (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeTab === "datos" && (
              <>
                {/* Contact & Availability Cards */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4 text-violet-600" />
                    Información de Contacto y Movilidad
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{entrevista.telefono || "Sin teléfono"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span>{entrevista.email || "Sin email"}</span>
                    </div>
                    <div className="col-span-2 flex items-start gap-2 text-gray-600">
                      <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      <span>{entrevista.direccion || "Dirección no especificada"}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border ${
                        entrevista.posee_vehiculo
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-gray-50 text-gray-500 border-gray-200"
                      }`}
                    >
                      <Car className="w-3.5 h-3.5" />
                      Vehículo: {entrevista.posee_vehiculo ? "Sí" : "No"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border ${
                        entrevista.posee_laptop
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-gray-50 text-gray-500 border-gray-200"
                      }`}
                    >
                      <Laptop className="w-3.5 h-3.5" />
                      Laptop: {entrevista.posee_laptop ? "Sí" : "No"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border ${
                        entrevista.disponibilidad_viajar
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-gray-50 text-gray-500 border-gray-200"
                      }`}
                    >
                      <Plane className="w-3.5 h-3.5" />
                      Viajar: {entrevista.disponibilidad_viajar ? "Sí" : "No"}
                    </span>
                  </div>
                </div>

                {/* Nivel Educativo */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-violet-600" />
                    1. Nivel Educativo y Actualización
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-500 block text-xs">Nivel Técnico:</span>
                      <p className="font-medium text-gray-800">{entrevista.nivel_tecnico || "—"}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-xs">Universitario:</span>
                      <p className="font-medium text-gray-800">{entrevista.universitario || "—"}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-xs">Especialización:</span>
                      <p className="font-medium text-gray-800">{entrevista.posee_especializacion || "—"}</p>
                    </div>
                    <div className="pt-2 border-t border-gray-100">
                      <span className="text-gray-500 block text-xs">Último curso/taller/seminario con soporte:</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-semibold text-violet-700 uppercase">
                          {entrevista.ultimo_curso_tiempo ? entrevista.ultimo_curso_tiempo.replace(/_/g, " ") : "No especificado"}
                        </span>
                        {entrevista.ultimo_curso_descripcion && (
                          <span className="text-gray-700">— {entrevista.ultimo_curso_descripcion}</span>
                        )}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-gray-100">
                      <span className="text-gray-500 block text-xs">Manejo de herramientas audiovisuales:</span>
                      <span className="font-medium text-gray-800 uppercase">
                        {entrevista.manejo_herramientas_audiovisuales || "No especificado"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Documentación Legal 10 items */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                      <FileCheck2 className="w-4 h-4 text-violet-600" />
                      Documentación Legal Vigente / Soportes
                    </h3>
                    <span className="text-xs font-semibold px-2 py-0.5 bg-violet-100 text-violet-800 rounded-full">
                      {docsCount} de 10 Consignados
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {[
                      { label: "Resumen Curricular", checked: entrevista.doc_resumen_curricular },
                      { label: "Cédula de Identidad", checked: entrevista.doc_cedula_identidad },
                      { label: "Soportes de Resumen", checked: entrevista.doc_soportes_resumen_curricular },
                      { label: "RIF Actualizado", checked: entrevista.doc_rif_actualizado },
                      { label: "Registro INPSASEL", checked: entrevista.doc_registro_inpsasel },
                      { label: "Factura Fiscal", checked: entrevista.doc_factura_fiscal },
                      { label: "Título Univ. / Fondo Negro", checked: entrevista.doc_titulo_universitario },
                      { label: "Última Declaración ISLR", checked: entrevista.doc_declaracion_islr },
                      { label: "Formación Docente Certificada", checked: entrevista.doc_formacion_docente },
                      { label: "Posee Laptop", checked: entrevista.doc_posee_laptop },
                    ].map((doc, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-2 rounded-lg border ${
                          doc.checked
                            ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                            : "bg-gray-50 border-gray-200 text-gray-500"
                        }`}
                      >
                        <span className="font-medium">{doc.label}</span>
                        {doc.checked ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-gray-400 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeTab === "competencias" && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase">
                    Retos que ha tenido que enfrentar como facilitador
                  </h4>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {entrevista.retos_facilitador || "No documentado."}
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase">
                    Logros alcanzados en actividades de formación
                  </h4>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {entrevista.logros_formacion || "No documentado."}
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase">
                    Característica esencial con público heterogéneo
                  </h4>
                  <p className="text-sm font-medium text-violet-800 capitalize">
                    {entrevista.caracteristica_esencial || "No especificado"}
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase">
                    Ejemplo de habilidades de liderazgo
                  </h4>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {entrevista.ejemplo_liderazgo || "No documentado."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                    <h4 className="text-xs font-semibold text-emerald-700 uppercase">
                      5 Fortalezas
                    </h4>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {entrevista.fortalezas || "No documentado."}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                    <h4 className="text-xs font-semibold text-rose-700 uppercase">
                      5 Debilidades
                    </h4>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {entrevista.debilidades || "No documentado."}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase">
                      ¿Por qué quieres trabajar aquí?
                    </h4>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {entrevista.motivo_trabajar_aqui || "No documentado."}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase">
                      ¿Por qué debemos contratarte?
                    </h4>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {entrevista.por_que_contratarte || "No documentado."}
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase">
                    Temas del portafolio que puede impartir
                  </h4>
                  {Array.isArray(entrevista.temas_capacidades) && entrevista.temas_capacidades.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {entrevista.temas_capacidades.map((tema, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 bg-violet-50 border border-violet-200 text-violet-800 rounded-lg text-xs font-medium"
                        >
                          {tema}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No especificado</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === "evaluacion" && (
              <div className="space-y-6">
                {/* Interviewer & Date */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between text-sm">
                  <div>
                    <span className="text-xs text-gray-400 block">Entrevistado Por</span>
                    <span className="font-semibold text-gray-800">{entrevista.entrevistado_por || "No asignado"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 block">Fecha</span>
                    <span className="font-semibold text-gray-800">{entrevista.fecha_entrevista}</span>
                  </div>
                </div>

                {/* 6 Checklist Evaluation Items */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase">
                    Criterios de Evaluación en Entrevista (6 Puntos)
                  </div>
                  <div className="divide-y divide-gray-100 text-xs">
                    {(entrevista.evaluacion_items || []).map((it) => (
                      <div key={it.item_nro} className="p-3 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 flex-1">
                          <span className="font-bold text-gray-400 w-4">{it.item_nro}.</span>
                          <div>
                            <p className="font-medium text-gray-800">{it.criterio}</p>
                            {it.observacion && (
                              <p className="text-gray-500 mt-1 italic">{it.observacion}</p>
                            )}
                          </div>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 uppercase tracking-wider ${
                            it.cumplimiento === "cumple"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : it.cumplimiento === "cumple_parcial"
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : it.cumplimiento === "no_cumple"
                              ? "bg-rose-100 text-rose-800 border border-rose-300"
                              : "bg-gray-100 text-gray-500 border border-gray-200"
                          }`}
                        >
                          {it.cumplimiento ? it.cumplimiento.replace("_", " ") : "Sin evaluar"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status & Observations Quick Edit */}
                <div className="bg-violet-50/50 rounded-xl border border-violet-200 p-4 space-y-4">
                  <h4 className="text-sm font-semibold text-violet-900 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-violet-600" />
                    Actualizar Estatus y Observaciones Rápidas
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Estatus de la Entrevista
                      </label>
                      <div className="flex gap-2">
                        {(["pendiente", "aprobado", "rechazado"] as EntrevistaEstatus[]).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setCurrentEstatus(st)}
                            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold uppercase tracking-wider border transition-colors ${
                              currentEstatus === st
                                ? st === "aprobado"
                                  ? "bg-emerald-600 text-white border-emerald-600"
                                  : st === "rechazado"
                                  ? "bg-rose-600 text-white border-rose-600"
                                  : "bg-amber-600 text-white border-amber-600"
                                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Observaciones y Seguimiento
                      </label>
                      <textarea
                        rows={3}
                        value={observacionesNotes}
                        onChange={(e) => setObservacionesNotes(e.target.value)}
                        placeholder="Escribe aquí observaciones sobre la entrevista o el candidato..."
                        className="w-full text-xs p-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveStatusNotes}
                        disabled={isSavingStatus}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50"
                      >
                        {isSavingStatus ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        Guardar Cambios
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
