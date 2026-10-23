"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Save,
  CheckCheck,
  AlertCircle,
  Printer,
  Download,
  FileText,
  Target,
  Compass,
  ListOrdered,
  Plus,
  Eye,
  Pencil,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import CostTable from "./CostTable";
import {
  saveBloqueRecursos,
  saveBloqueHigieneSeguridad,
  saveBloquePlanificacion,
  saveBloqueControles,
  saveBloqueSalidas,
  finalizarSolicitud,
  updateNombreSugerido,
} from "@/app/actions/diseno-servicio";
import {
  CAP_CHECKLIST_ITEMS,
  ST_CHECKLIST_ITEMS,
  EMPTY_BLOQUE_RECURSOS,
  EMPTY_BLOQUE_HIGIENE,
  EMPTY_BLOQUE_PLANIFICACION,
  EMPTY_BLOQUE_CONTROLES,
  EMPTY_BLOQUE_SALIDAS,
  type DisenoServicioFullData,
  type BloqueRecursosRequisitos,
  type BloqueHigieneSeguridadAmbiente,
  type BloquePlanificacionFactibilidad,
  type BloqueControlesDiseno,
  type BloqueSalidasDiseno,
  type ControlDisenoEntry,
} from "@/types/diseno-servicio";

const STEPS = [
  { label: "Identificación", description: "Datos básicos" },
  { label: "Recursos", description: "Recursos y requisitos" },
  { label: "HSA", description: "Higiene y seguridad" },
  { label: "Planificación", description: "Factibilidad y plan" },
  { label: "Controles", description: "Fase de revisión" },
  { label: "Salidas", description: "Salidas del diseño" },
];

const LIST_PATH = "/dashboard/capacitacion/nuevos-servicios";

export default function DisenoServicioWizard({
  solicitud,
  userData,
}: {
  solicitud: DisenoServicioFullData;
  userData: any;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCompleted = solicitud.id_estatus === 38;
  const [isReadOnly, setIsReadOnly] = useState<boolean>(() => {
    return searchParams.get("mode") === "readonly" || isCompleted;
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [showFinalizeSuccess, setShowFinalizeSuccess] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Editable suggested title state
  const [nombreSugerido, setNombreSugerido] = useState(solicitud.nombre_sugerido || "");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(solicitud.nombre_sugerido || "");
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  const handleSaveTitle = async () => {
    const trimmed = tempTitle.trim();
    if (!trimmed) {
      showSaveMessage("error", "El título sugerido no puede estar vacío.");
      return;
    }
    setIsSavingTitle(true);
    try {
      await updateNombreSugerido(solicitud.id, trimmed);
      setNombreSugerido(trimmed);
      solicitud.nombre_sugerido = trimmed;
      setIsEditingTitle(false);
      showSaveMessage("success", "Título sugerido actualizado correctamente.");
      router.refresh();
    } catch (e: any) {
      console.error("Error al actualizar título:", e);
      showSaveMessage("error", e?.message || "Error al actualizar el título sugerido.");
    } finally {
      setIsSavingTitle(false);
    }
  };

  const isCAP =
    solicitud.tipo_servicio?.toLowerCase().includes("cap") ||
    solicitud.tipo_servicio?.toLowerCase().includes("capacitaci") ||
    (solicitud.bloque_recursos_requisitos as any)?.tipo_naturaleza_servicio === "cap" ||
    solicitud.id_departamento_ejecutante === 3;

  // Block states — deep-merge with EMPTY defaults to handle partial JSONB from DB
  const [bloqueRecursos, setBloqueRecursos] = useState<BloqueRecursosRequisitos>(() => {
    const base = solicitud.bloque_recursos_requisitos
      ? {
          ...EMPTY_BLOQUE_RECURSOS,
          ...solicitud.bloque_recursos_requisitos,
          antecedentes: {
            ...EMPTY_BLOQUE_RECURSOS.antecedentes,
            ...(solicitud.bloque_recursos_requisitos.antecedentes || {}),
          },
        }
      : { ...EMPTY_BLOQUE_RECURSOS };

    if (!base.tipo_naturaleza_servicio) {
      base.tipo_naturaleza_servicio = isCAP ? "cap" : "st";
    }
    if (!base.proposito && solicitud.objetivo_proposito) {
      base.proposito = solicitud.objetivo_proposito;
    }
    return base;
  });

  const [bloqueHigiene, setBloqueHigiene] = useState<BloqueHigieneSeguridadAmbiente>(
    solicitud.bloque_higiene_seguridad_ambiente
      ? {
          ...EMPTY_BLOQUE_HIGIENE,
          ...solicitud.bloque_higiene_seguridad_ambiente,
          ambiental: {
            ...EMPTY_BLOQUE_HIGIENE.ambiental,
            ...(solicitud.bloque_higiene_seguridad_ambiente.ambiental || {}),
          },
          peligros: {
            ...EMPTY_BLOQUE_HIGIENE.peligros,
            ...(solicitud.bloque_higiene_seguridad_ambiente.peligros || {}),
          },
        }
      : EMPTY_BLOQUE_HIGIENE
  );

  const [bloquePlanificacion, setBloquePlanificacion] = useState<BloquePlanificacionFactibilidad>(() => {
    const base = solicitud.bloque_planificacion_factibilidad
      ? {
          ...EMPTY_BLOQUE_PLANIFICACION,
          ...solicitud.bloque_planificacion_factibilidad,
          aprobacion: {
            ...EMPTY_BLOQUE_PLANIFICACION.aprobacion,
            ...(solicitud.bloque_planificacion_factibilidad.aprobacion || {}),
          },
        }
      : { ...EMPTY_BLOQUE_PLANIFICACION };

    if (isCAP && (!base.equipos_asignados || base.equipos_asignados === "")) {
      base.equipos_asignados = "N/A";
    }
    if (!isCAP && (!base.software_material_asignado || base.software_material_asignado === "")) {
      base.software_material_asignado = "N/A";
    }

    const deptNames = ["servicios técnicos", "servicios tecnicos", "servicios_tecnicos", "capacitación", "capacitacion"];
    if (
      userData?.cargo &&
      (!base.aprobacion.cargo || deptNames.includes(base.aprobacion.cargo.toLowerCase().trim()))
    ) {
      base.aprobacion.cargo = userData.cargo;
    }

    return base;
  });

  const [bloqueControles, setBloqueControles] = useState<BloqueControlesDiseno>(
    solicitud.bloque_controles_diseno
      ? {
          ...EMPTY_BLOQUE_CONTROLES,
          ...solicitud.bloque_controles_diseno,
          revision: {
            ...EMPTY_BLOQUE_CONTROLES.revision,
            ...(solicitud.bloque_controles_diseno.revision || {}),
          },
          verificacion: {
            ...EMPTY_BLOQUE_CONTROLES.verificacion,
            ...(solicitud.bloque_controles_diseno.verificacion || {}),
          },
          validacion: {
            ...EMPTY_BLOQUE_CONTROLES.validacion,
            ...(solicitud.bloque_controles_diseno.validacion || {}),
          },
        }
      : EMPTY_BLOQUE_CONTROLES
  );

  const [bloqueSalidas, setBloqueSalidas] = useState<BloqueSalidasDiseno>(() => {
    const raw = solicitud.bloque_salidas_diseno
      ? { ...EMPTY_BLOQUE_SALIDAS, ...solicitud.bloque_salidas_diseno }
      : { ...EMPTY_BLOQUE_SALIDAS };

    const existingChecklist = raw.checklist || [];
    const existingCap = raw.checklist_cap || [];

    const isOldCapData =
      existingChecklist.length > 0 &&
      CAP_CHECKLIST_ITEMS.every((item) =>
        existingChecklist.some(
          (c) => c.item.toLowerCase() === item.toLowerCase()
        )
      );

    const baseStList =
      existingChecklist.length > 0 && !isOldCapData
        ? existingChecklist
        : ST_CHECKLIST_ITEMS.map((item) => ({
            item,
            aplica: "" as const,
            especifique: "",
          }));

    const baseCapList =
      existingCap.length > 0
        ? existingCap
        : isOldCapData
          ? existingChecklist
          : CAP_CHECKLIST_ITEMS.map((item) => ({
              item,
              aplica: "" as const,
              especifique: "",
            }));

    return {
      ...raw,
      checklist: baseStList.map((item) => ({
        ...item,
        aplica: item.aplica ? item.aplica : (isCAP ? ("no_aplica" as const) : ("" as const)),
      })),
      checklist_cap: baseCapList.map((item) => ({
        ...item,
        aplica: item.aplica ? item.aplica : (!isCAP ? ("no_aplica" as const) : ("" as const)),
      })),
    };
  });

  const showSaveMessage = (type: "success" | "error", text: string) => {
    setSaveMessage({ type, text });
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleSave = async (step: number, advance: boolean) => {
    setIsSaving(true);
    try {
      switch (step) {
        case 1:
          await saveBloqueRecursos(solicitud.id, bloqueRecursos);
          break;
        case 2:
          await saveBloqueHigieneSeguridad(solicitud.id, bloqueHigiene);
          break;
        case 3:
          await saveBloquePlanificacion(solicitud.id, bloquePlanificacion);
          break;
        case 4:
          await saveBloqueControles(solicitud.id, bloqueControles);
          break;
        case 5:
          await saveBloqueSalidas(solicitud.id, bloqueSalidas);
          break;
      }
      showSaveMessage("success", "Guardado correctamente");
      if (advance && step < 5) {
        setCurrentStep(step + 1);
      }
    } catch (error) {
      console.error("Save error:", error);
      showSaveMessage("error", "Error al guardar. Intente nuevamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalize = async () => {
    setIsSaving(true);
    try {
      await saveBloqueSalidas(solicitud.id, bloqueSalidas);
      await finalizarSolicitud(solicitud.id);
      setShowFinalizeConfirm(false);
      setShowFinalizeSuccess(true);
      // Auto-redirect to the list after the user has a chance to read the confirmation.
      setTimeout(() => {
        router.push(LIST_PATH);
      }, 3500);
    } catch (error) {
      console.error("Finalize error:", error);
      showSaveMessage("error", "Error al finalizar la solicitud.");
    } finally {
      setIsSaving(false);
    }
  };

  // PDF rendering helpers (client-side via @react-pdf/renderer)
  const renderPdfBlob = async () => {
    const { pdf } = await import("@react-pdf/renderer");
    const { default: DisenoServicioPdfDocument } = await import("./DisenoServicioPdfDocument");
    return pdf(<DisenoServicioPdfDocument solicitud={solicitud} />).toBlob();
  };

  // Fixed PDF preview in a new tab: opens window synchronously during click event to prevent popup blockers
  const handleViewPdf = async () => {
    setIsGeneratingPdf(true);
    const newWindow = typeof window !== "undefined" ? window.open("", "_blank") : null;
    if (newWindow) {
      newWindow.document.write(
        "<!DOCTYPE html><html><head><title>Generando PDF RG-NEG-003...</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui,-apple-system,sans-serif;color:#334155;background:#f8fafc;}</style></head><body><div style='text-align:center;'><p style='font-size:16px;font-weight:600;margin-bottom:8px;'>Generando documento RG-NEG-003</p><p style='font-size:13px;color:#64748b;'>Por favor espere mientras se prepara el archivo...</p></div></body></html>"
      );
    }
    try {
      const blob = await renderPdfBlob();
      const url = URL.createObjectURL(blob);
      if (newWindow && !newWindow.closed) {
        newWindow.location.href = url;
      } else {
        window.open(url, "_blank");
      }
      // Revoke after 2 minutes so the tab has ample time to display and allow print/download
      setTimeout(() => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      }, 120000);
    } catch (error) {
      if (newWindow && !newWindow.closed) {
        newWindow.close();
      }
      console.error("Error generating PDF for preview:", error);
      alert("Error al generar el PDF para previsualización");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const blob = await renderPdfBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = (nombreSugerido || solicitud.nombre_sugerido || `#${solicitud.id}`)
        .replace(/[^\w\-]+/g, "_")
        .slice(0, 60);
      a.download = `RG-NEG-003-${safeName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      }, 30000);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error al generar el PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const canGoBack = currentStep > 0;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Finalize Success Card */}
      {showFinalizeSuccess && (
        <div className="bg-white border border-green-200 rounded-xl shadow-sm p-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
              <CheckCircle2 className="h-9 w-9 text-green-600" />
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-gray-900">Solicitud Finalizada</h2>
            <p className="text-sm text-gray-600">
              La solicitud <span className="font-medium text-gray-900">&quot;{solicitud.nombre_sugerido}&quot;</span> ha sido finalizada correctamente.
            </p>
            <p className="text-sm text-gray-600">
              Se ha notificado al solicitante que su solicitud de diseño ha sido completada.
            </p>
            <p className="text-xs text-gray-400 pt-1">
              Serás redirigido al listado en unos segundos...
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <Button
              onClick={() => router.push(LIST_PATH)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex gap-2"
            >
              Volver al listado
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowFinalizeSuccess(false)}
            >
              Cerrar
            </Button>
          </div>
        </div>
      )}

      {!showFinalizeSuccess && (
        <>
          {/* Step Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {STEPS.map((step, idx) => (
                <div key={idx} className="flex items-center flex-1 last:flex-none">
                  <div
                    role="button"
                    tabIndex={isSaving ? -1 : 0}
                    onClick={() => !isSaving && setCurrentStep(idx)}
                    onKeyDown={(e) => {
                      if (!isSaving && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        setCurrentStep(idx);
                      }
                    }}
                    aria-label={`Ir al paso ${idx + 1}: ${step.label}`}
                    className={`flex flex-col items-center group ${isSaving ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                  >
                    <div
                      className={`flex items-center justify-center w-9 h-9 rounded-full border-2 text-sm font-semibold transition-all ${
                        idx === currentStep
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : idx < currentStep
                          ? "bg-green-500 text-white border-green-500 group-hover:scale-105"
                          : "bg-white text-gray-400 border-gray-300 group-hover:border-indigo-400 group-hover:text-indigo-600"
                      }`}
                    >
                      {idx < currentStep ? <CheckCircle2 className="h-5 w-5" /> : idx + 1}
                    </div>
                    <span className={`mt-1 text-[10px] text-center hidden sm:block ${idx === currentStep ? "text-indigo-600 font-medium" : "text-gray-400 group-hover:text-indigo-600"}`}>
                      {step.label}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 ${idx < currentStep ? "bg-green-500" : "bg-gray-200"}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Read-Only Status Banner */}
          {isReadOnly && (
            <div className="mb-4 bg-slate-50 border border-slate-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-700 shadow-2xs shrink-0">
                  <Eye className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {isCompleted ? "Servicio Finalizado · Modo de Solo Lectura" : "Modo Vista de Lectura"}
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {isCompleted
                      ? "Esta solicitud de diseño ha sido finalizada y no admite más modificaciones."
                      : "Está visualizando las especificaciones técnicas en modo lectura. Para editar los campos, active la edición."}
                  </p>
                </div>
              </div>
              {!isCompleted && (
                <Button
                  size="sm"
                  onClick={() => setIsReadOnly(false)}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 shrink-0 shadow-xs"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar Formulario
                </Button>
              )}
            </div>
          )}

          {/* PDF & Action Bar */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <FileText className="h-4 w-4 text-slate-500" />
              <span className="font-semibold text-gray-700">Registro Oficial:</span>
              <Badge className="bg-slate-100 text-slate-800 border-slate-300 text-[11px] font-semibold">
                RG-NEG-003 · Capacitación
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* RG-NEG-003 Action Group */}
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50/60 shadow-2xs">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleViewPdf}
                  disabled={isGeneratingPdf}
                  className="h-8 text-xs text-gray-700 hover:bg-white flex items-center gap-1.5 rounded-none px-3 font-medium transition-colors"
                  title="Ver PDF Registro Interno RG-NEG-003 en una nueva pestaña"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-600" />
                  {isGeneratingPdf ? "Generando..." : "Ver PDF RG-NEG-003"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf}
                  className="h-8 text-xs text-gray-700 hover:bg-white px-2.5 rounded-none border-l border-gray-200"
                  title="Descargar PDF Registro Interno RG-NEG-003"
                >
                  <Download className="h-3.5 w-3.5 text-slate-600" />
                </Button>
              </div>

              {/* Toggle Read-Only / Edit */}
              {!isCompleted && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsReadOnly(!isReadOnly)}
                  className={`h-8 text-xs font-semibold flex items-center gap-1.5 ${
                    isReadOnly
                      ? "bg-slate-900 text-white hover:bg-slate-800 border-slate-900"
                      : "bg-white text-slate-700 border-gray-300 hover:bg-slate-50"
                  }`}
                >
                  {isReadOnly ? (
                    <>
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5 text-slate-600" />
                      Solo Lectura
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Save Message */}
          {saveMessage && (
            <div
              className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
                saveMessage.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {saveMessage.type === "success" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              {saveMessage.text}
            </div>
          )}

          {/* Wizard Card */}
          <Card>
            <CardContent className="pt-6">
              {/* STEP 0: Identificación */}
              {currentStep === 0 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 mb-1">Identificación del Registro</h2>
                    <p className="text-sm text-gray-500">Datos cargados desde la solicitud inicial</p>
                  </div>

                  {/* Título Sugerido Editable */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        Título Sugerido del Servicio
                      </Label>
                      {isEditingTitle ? (
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setTempTitle(nombreSugerido);
                              setIsEditingTitle(false);
                            }}
                            disabled={isSavingTitle}
                            className="h-7 px-2 text-xs text-gray-600 hover:text-gray-900"
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleSaveTitle}
                            disabled={isSavingTitle || !tempTitle.trim()}
                            className="h-7 px-2.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                          >
                            {isSavingTitle ? "Guardando..." : "Guardar"}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setTempTitle(nombreSugerido);
                            setIsEditingTitle(true);
                          }}
                          className="h-7 px-2 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 flex items-center gap-1 font-medium"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar Título
                        </Button>
                      )}
                    </div>

                    {isEditingTitle ? (
                      <Input
                        value={tempTitle}
                        onChange={(e) => setTempTitle(e.target.value)}
                        disabled={isSavingTitle}
                        className="bg-white font-semibold text-gray-900 text-sm"
                        autoFocus
                        placeholder="Título o nombre sugerido del servicio"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveTitle();
                          if (e.key === "Escape") {
                            setTempTitle(nombreSugerido);
                            setIsEditingTitle(false);
                          }
                        }}
                      />
                    ) : (
                      <p className="text-base font-bold text-gray-900">
                        {nombreSugerido}
                      </p>
                    )}
                    <p className="text-[11px] text-gray-500">
                      Puede modificar el título oficial o sugerido en cualquier momento. Este nombre se reflejará en el listado y en todos los formatos generados.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-500 text-xs font-semibold">TIPO DE SOLICITUD</Label>
                      <p className="text-base font-medium text-gray-900 mt-1 capitalize">{solicitud.tipo_solicitud}</p>
                    </div>

                    <div>
                      <Label className="text-gray-500 text-xs font-semibold">FECHA DE SOLICITUD</Label>
                      <p className="text-base font-medium text-gray-900 mt-1">
                        {solicitud.fecha_solicitud
                          ? new Date(solicitud.fecha_solicitud).toLocaleDateString("es-VE", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs font-semibold">SOLICITANTE</Label>
                      <p className="text-base font-medium text-gray-900 mt-1">
                        {solicitud.solicitante_nombre || "—"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs font-semibold">CARGO DEL SOLICITANTE</Label>
                      <p className="text-base font-medium text-gray-900 mt-1">{solicitud.cargo_solicitante || "—"}</p>
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-gray-500 text-xs font-semibold">OBJETIVO O PROPÓSITO INICIAL</Label>
                      <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{solicitud.objetivo_proposito || "—"}</p>
                    </div>
                  </div>


                  {bloquePlanificacion.tiempo_estimado && (
                    <div className="border-t border-gray-200 pt-3 flex items-center gap-2 text-xs">
                      <Clock className="h-4 w-4 text-slate-700" />
                      <span className="font-bold text-gray-700 uppercase">Tiempo Estimado de Ejecución:</span>
                      <span className="font-medium text-gray-900">{bloquePlanificacion.tiempo_estimado}</span>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 1: Recursos y Requisitos */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  {/* Elementos de Salida - Rediseñado espacioso y amigable */}
                  <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-5">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-slate-900 hover:bg-slate-900 text-white text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5">
                            Elementos de Salida
                          </Badge>
                          <h2 className="text-base font-bold text-gray-900">
                            Definición del Servicio, Propósito y Objetivos
                          </h2>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Redacte detalladamente los objetivos y el alcance técnico que sustentarán la propuesta y la ejecución del servicio.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-5">
                      {/* OBJETIVO GENERAL */}
                      <div className="bg-gray-50/50 rounded-lg border border-gray-200 p-4 shadow-2xs">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs font-bold text-gray-800 tracking-wide flex items-center gap-1.5 uppercase">
                            <Target className="h-4 w-4 text-slate-800" />
                            Objetivo General
                          </Label>
                          <span className="text-[11px] text-gray-400 font-medium">Meta principal y alcance global</span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2.5">
                          Defina la meta global y el alcance técnico integral del servicio a desarrollar.
                        </p>
                        <Textarea
                          value={bloqueRecursos.objetivo || ""}
                          onChange={(e) => setBloqueRecursos({ ...bloqueRecursos, objetivo: e.target.value })}
                          placeholder="Ej: Desarrollar competencias técnicas y operativas en los participantes para la correcta aplicación de..."
                          rows={5}
                          disabled={isReadOnly}
                          className="w-full text-sm leading-relaxed border-gray-300 focus:border-slate-500 focus:ring-slate-300 bg-white"
                        />
                      </div>

                      {/* PROPÓSITO */}
                      <div className="bg-gray-50/50 rounded-lg border border-gray-200 p-4 shadow-2xs">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs font-bold text-gray-800 tracking-wide flex items-center gap-1.5 uppercase">
                            <Compass className="h-4 w-4 text-slate-800" />
                            Propósito del Servicio
                          </Label>
                          {solicitud.objetivo_proposito && !isReadOnly && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setBloqueRecursos({
                                  ...bloqueRecursos,
                                  proposito: solicitud.objetivo_proposito || "",
                                })
                              }
                              className="h-6 text-[10px] text-slate-700 hover:text-slate-900 border-slate-300 hover:bg-slate-50 px-2"
                              title="Restablecer con el propósito cargado en la solicitud inicial"
                            >
                              Copiar de Solicitud Inicial
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mb-2.5">
                          Justificación estratégica, impacto en la prevención de riesgos y valor agregado para el cliente.
                        </p>
                        <Textarea
                          value={bloqueRecursos.proposito ?? (solicitud.objetivo_proposito || "")}
                          onChange={(e) => setBloqueRecursos({ ...bloqueRecursos, proposito: e.target.value })}
                          placeholder="Ej: Cumplir con la legislación laboral vigente y prevenir riesgos ocupacionales en los trabajadores..."
                          rows={5}
                          disabled={isReadOnly}
                          className="w-full text-sm leading-relaxed border-gray-300 focus:border-slate-500 focus:ring-slate-300 bg-white"
                        />
                      </div>

                      {/* OBJETIVOS ESPECÍFICOS */}
                      <div className="bg-gray-50/50 rounded-lg border border-gray-200 p-4 shadow-2xs">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div>
                            <Label className="text-xs font-bold text-gray-800 tracking-wide flex items-center gap-1.5 uppercase">
                              <ListOrdered className="h-4 w-4 text-emerald-600" />
                              Objetivos Específicos
                            </Label>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Etapas operativas, módulos y productos verificables resultantes de la ejecución.
                            </p>
                          </div>
                          {!isReadOnly && (
                            <div className="flex items-center gap-1.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const current = bloqueRecursos.objetivo_especifico || "";
                                  const nextBullet = current.length > 0 && !current.endsWith("\n") ? "\n• " : "• ";
                                  setBloqueRecursos({
                                    ...bloqueRecursos,
                                    objetivo_especifico: current + nextBullet,
                                  });
                                }}
                                className="h-7 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 px-2 flex gap-1"
                              >
                                <Plus className="h-3 w-3" />
                                Insertar Viñeta
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const current = bloqueRecursos.objetivo_especifico || "";
                                  if (!current.trim()) return;
                                  const formatted = current
                                    .split("\n")
                                    .map((line) => {
                                      const trimmed = line.trim();
                                      if (!trimmed) return "";
                                      return trimmed.startsWith("•") || trimmed.startsWith("-")
                                        ? trimmed
                                        : `• ${trimmed}`;
                                    })
                                    .join("\n");
                                  setBloqueRecursos({
                                    ...bloqueRecursos,
                                    objetivo_especifico: formatted,
                                  });
                                }}
                                className="h-7 text-xs text-gray-600 hover:bg-gray-100 px-2"
                                title="Formatear cada línea con viñeta"
                              >
                                Formatear Lista
                              </Button>
                            </div>
                          )}
                        </div>
                        <Textarea
                          value={bloqueRecursos.objetivo_especifico || ""}
                          onChange={(e) => setBloqueRecursos({ ...bloqueRecursos, objetivo_especifico: e.target.value })}
                          placeholder={"• Identificar los conceptos y fundamentos normativos aplicables al servicio.\n• Aplicar técnicas preventivas y de control en las actividades operativas.\n• Evaluar casos prácticos y protocolos de respuesta ante incidentes."}
                          rows={6}
                          disabled={isReadOnly}
                          className="w-full text-sm leading-relaxed font-sans border-gray-300 focus:border-slate-500 focus:ring-slate-300 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-md font-semibold text-gray-900 mb-3">Recursos Necesarios para la Ejecución del Servicio</h3>
                    <div className="grid grid-cols-1 gap-4">
                      {/* Tiempo Estimado de Ejecución */}
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-gray-800 tracking-wide flex items-center gap-1.5 uppercase">
                            <Clock className="h-4 w-4 text-slate-700" />
                            Tiempo Estimado de Ejecución (Horas / Días / Semanas)
                          </Label>
                          <span className="text-[11px] text-gray-400 font-medium">Duración total esperada</span>
                        </div>
                        <Input
                          value={bloquePlanificacion.tiempo_estimado}
                          onChange={(e) => setBloquePlanificacion({ ...bloquePlanificacion, tiempo_estimado: e.target.value })}
                          placeholder="Ej: 40 horas / 5 días hábiles / 2 semanas"
                          className="text-sm bg-white border-gray-300"
                          disabled={isReadOnly}
                        />
                        <p className="text-[11px] text-gray-500">
                          Indique la duración estimada requerida para la ejecución de campo y entrega de resultados.
                        </p>
                      </div>

                      <div>
                        <Label>Personal Requerido</Label>
                        <Textarea
                          value={bloqueRecursos.personal_requerido}
                          onChange={(e) => setBloqueRecursos({ ...bloqueRecursos, personal_requerido: e.target.value })}
                          placeholder="Competencias y cantidad de trabajadores necesarios"
                          rows={3}
                          disabled={isReadOnly}
                        />
                      </div>
                      <div>
                        <Label>Equipos / Herramientas</Label>
                        <Textarea
                          value={bloqueRecursos.equipos_herramientas}
                          onChange={(e) => setBloqueRecursos({ ...bloqueRecursos, equipos_herramientas: e.target.value })}
                          placeholder="Equipos, instrumentos y herramientas requeridos"
                          rows={3}
                          disabled={isReadOnly}
                        />
                      </div>
                      <div>
                        <Label>Software / Aplicaciones</Label>
                        <Textarea
                          value={bloqueRecursos.software}
                          onChange={(e) => setBloqueRecursos({ ...bloqueRecursos, software: e.target.value })}
                          placeholder="Programas, licencias o software requeridos"
                          rows={2}
                          disabled={isReadOnly}
                        />
                      </div>
                      <div>
                        <Label>Infraestructura / Instalaciones</Label>
                        <Textarea
                          value={bloqueRecursos.infraestructura}
                          onChange={(e) => setBloqueRecursos({ ...bloqueRecursos, infraestructura: e.target.value })}
                          placeholder="Aulas, instalaciones o espacios requeridos"
                          rows={2}
                          disabled={isReadOnly}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-md font-semibold text-gray-900 mb-3">Requisitos, Mercado y Aceptación</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label>Requisitos del Cliente / Mercado</Label>
                        <Textarea
                          value={bloqueRecursos.requisitos_cliente}
                          onChange={(e) => setBloqueRecursos({ ...bloqueRecursos, requisitos_cliente: e.target.value })}
                          placeholder="Expectativas y especificaciones del cliente o mercado"
                          rows={3}
                          disabled={isReadOnly}
                        />
                      </div>
                      <div>
                        <Label>Requisitos Legales y Reglamentarios</Label>
                        <Textarea
                          value={bloqueRecursos.requisitos_legales}
                          onChange={(e) => setBloqueRecursos({ ...bloqueRecursos, requisitos_legales: e.target.value })}
                          placeholder="Normativas, leyes aplicables (LOTTT, LOPCYMAT, COVENIN, etc.)"
                          rows={3}
                          disabled={isReadOnly}
                        />
                      </div>
                      <div>
                        <Label>Criterios de Aceptación del Servicio</Label>
                        <Textarea
                          value={bloqueRecursos.criterios_aceptacion}
                          onChange={(e) => setBloqueRecursos({ ...bloqueRecursos, criterios_aceptacion: e.target.value })}
                          placeholder="Condiciones mínimas para considerar el servicio aceptado"
                          rows={3}
                          disabled={isReadOnly}
                        />
                      </div>
                      <div>
                        <Label>¿Existen Servicios Similares o Antecedentes?</Label>
                        <div className="flex items-center gap-6 mt-2">
                          <RadioGroup
                            value={bloqueRecursos.antecedentes.existe ? "si" : "no"}
                            onValueChange={(val) =>
                              !isReadOnly &&
                              setBloqueRecursos({
                                ...bloqueRecursos,
                                antecedentes: { ...bloqueRecursos.antecedentes, existe: val === "si" },
                              })
                            }
                            className="flex gap-4"
                          >
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="si" disabled={isReadOnly} />
                              <Label className="text-sm">Sí</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="no" disabled={isReadOnly} />
                              <Label className="text-sm">No</Label>
                            </div>
                          </RadioGroup>
                        </div>
                        {bloqueRecursos.antecedentes.existe && (
                          <div className="mt-3">
                            <Label>Especifique antecedentes</Label>
                            <Textarea
                              value={bloqueRecursos.antecedentes.especificacion}
                              onChange={(e) =>
                                setBloqueRecursos({
                                  ...bloqueRecursos,
                                  antecedentes: { ...bloqueRecursos.antecedentes, especificacion: e.target.value },
                                })
                              }
                              placeholder="Detalles de servicios similares previos"
                              rows={2}
                              disabled={isReadOnly}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Higiene, Seguridad y Ambiente */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 mb-1">Matriz de Aspectos e Impactos Ambientales</h2>
                    <p className="text-sm font-semibold text-gray-800">
                      ¿EL SERVICIO GENERA O PUEDE GENERAR ASPECTOS AMBIENTALES QUE NO SE ENCUENTREN EN LA MATRIZ?
                    </p>
                  </div>
                  <div className="space-y-3">
                    {[
                      { key: "generacion_residuos", label: "Generación de Residuos" },
                      { key: "consumo_energia", label: "Consumo de Energía" },
                      { key: "emisiones_vertidos", label: "Emisiones o Vertidos" },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <Label className="text-sm">{item.label}</Label>
                        <RadioGroup
                          value={
                            bloqueHigiene.ambiental[item.key as keyof typeof bloqueHigiene.ambiental] ? "si" : "no"
                          }
                          onValueChange={(val) =>
                            !isReadOnly &&
                            setBloqueHigiene({
                              ...bloqueHigiene,
                              ambiental: { ...bloqueHigiene.ambiental, [item.key]: val === "si" },
                            })
                          }
                          className="flex gap-4"
                        >
                          <div className="flex items-center gap-1">
                            <RadioGroupItem value="si" disabled={isReadOnly} />
                            <Label className="text-xs">Sí</Label>
                          </div>
                          <div className="flex items-center gap-1">
                            <RadioGroupItem value="no" disabled={isReadOnly} />
                            <Label className="text-xs">No</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    ))}
                    <div>
                      <Label>En caso afirmativo, describa la significancia y controles requeridos</Label>
                      <Textarea
                        value={bloqueHigiene.ambiental.significancia}
                        onChange={(e) =>
                          setBloqueHigiene({
                            ...bloqueHigiene,
                            ambiental: { ...bloqueHigiene.ambiental, significancia: e.target.value },
                          })
                        }
                        rows={3}
                        disabled={isReadOnly}
                      />
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-md font-semibold text-gray-900 mb-1">Matriz de Peligros y Riesgos</h3>
                    <p className="text-sm font-semibold text-gray-800 mb-3">
                      ¿EL SERVICIO INTRODUCE O MODIFICA PELIGROS QUE NO SE ENCUENTREN EN LA NPP?
                    </p>
                    <div className="space-y-3">
                      {[
                        { key: "biologicos", label: "Biológicos" },
                        { key: "mecanicos", label: "Mecánicos" },
                        { key: "ergonomicos", label: "Ergonómicos" },
                        { key: "electricos", label: "Eléctricos" },
                        { key: "quimicos", label: "Químicos" },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                          <Label className="text-sm">{item.label}</Label>
                          <Checkbox
                            checked={bloqueHigiene.peligros[item.key as keyof typeof bloqueHigiene.peligros] as boolean}
                            disabled={isReadOnly}
                            onCheckedChange={(checked) =>
                              setBloqueHigiene({
                                ...bloqueHigiene,
                                peligros: { ...bloqueHigiene.peligros, [item.key]: !!checked },
                              })
                            }
                          />
                        </div>
                      ))}
                      <div>
                        <Label>Otros peligros</Label>
                        <Input
                          value={bloqueHigiene.peligros.otros}
                          onChange={(e) =>
                            setBloqueHigiene({
                              ...bloqueHigiene,
                              peligros: { ...bloqueHigiene.peligros, otros: e.target.value },
                            })
                          }
                          placeholder="Especifique otros peligros"
                          disabled={isReadOnly}
                        />
                      </div>
                      <div>
                        <Label>Descripción de peligros y controles requeridos</Label>
                        <Textarea
                          value={bloqueHigiene.peligros.descripcion}
                          onChange={(e) =>
                            setBloqueHigiene({
                              ...bloqueHigiene,
                              peligros: { ...bloqueHigiene.peligros, descripcion: e.target.value },
                            })
                          }
                          rows={3}
                          disabled={isReadOnly}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Factibilidad y Planificación */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 mb-1">Bloque II: Factibilidad y Planificación</h2>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label>Equipos / Instrumentos Asignados (Para Servicios Técnicos)</Label>
                      <Input
                        value={isCAP ? "N/A" : bloquePlanificacion.equipos_asignados}
                        onChange={(e) => !isCAP && setBloquePlanificacion({ ...bloquePlanificacion, equipos_asignados: e.target.value })}
                        disabled={isCAP || isReadOnly}
                        placeholder={isCAP ? "N/A" : "Equipos e instrumentos asignados"}
                        className={isCAP || isReadOnly ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}
                      />
                    </div>
                    <div>
                      <Label>Software / Material Didáctico Asignados (Para Capacitación)</Label>
                      <Input
                        value={!isCAP ? "N/A" : bloquePlanificacion.software_material_asignado}
                        onChange={(e) => isCAP && setBloquePlanificacion({ ...bloquePlanificacion, software_material_asignado: e.target.value })}
                        disabled={!isCAP || isReadOnly}
                        placeholder={!isCAP ? "N/A" : "Material didáctico asignado"}
                        className={!isCAP || isReadOnly ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}
                      />
                    </div>
                  </div>

                  {/* Tiempo Estimado de Ejecución */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-gray-800 tracking-wide flex items-center gap-1.5 uppercase">
                          <Clock className="h-4 w-4 text-slate-700" />
                          Tiempo Estimado de Ejecución (Horas / Días / Semanas)
                        </Label>
                        <span className="text-[11px] text-gray-500 font-medium">Duración total estimada</span>
                      </div>
                      <Input
                        value={bloquePlanificacion.tiempo_estimado}
                        onChange={(e) => setBloquePlanificacion({ ...bloquePlanificacion, tiempo_estimado: e.target.value })}
                        placeholder="Ej: 40 horas / 5 días hábiles / 2 semanas"
                        className="bg-white border-gray-300 text-sm max-w-md"
                        disabled={isReadOnly}
                      />
                      <p className="text-xs text-gray-500">
                        Indique la duración técnica total estimada para el desarrollo, ejecución y entrega de resultados.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-md font-semibold text-gray-900 mb-3">Estructura de Costo Estimada</h3>
                    <CostTable
                      items={bloquePlanificacion.estructura_costos}
                      disabled={isReadOnly}
                      onChange={(items) =>
                        setBloquePlanificacion({
                          ...bloquePlanificacion,
                          estructura_costos: items,
                          costo_total: items.reduce((sum, item) => sum + item.total, 0),
                        })
                      }
                    />
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-md font-semibold text-gray-900 mb-3">Evaluación de Viabilidad del Servicio</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Viabilidad Técnica</Label>
                        <RadioGroup
                          value={bloquePlanificacion.viabilidad_tecnica}
                          onValueChange={(val) =>
                            !isReadOnly && setBloquePlanificacion({ ...bloquePlanificacion, viabilidad_tecnica: val as any })
                          }
                          className="flex gap-6 mt-2"
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="favorable" disabled={isReadOnly} />
                            <Label className="text-sm">Favorable</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="no_favorable" disabled={isReadOnly} />
                            <Label className="text-sm">No Favorable</Label>
                          </div>
                        </RadioGroup>
                      </div>
                      <div>
                        <Label>Viabilidad Económica</Label>
                        <RadioGroup
                          value={bloquePlanificacion.viabilidad_economica}
                          onValueChange={(val) =>
                            !isReadOnly && setBloquePlanificacion({ ...bloquePlanificacion, viabilidad_economica: val as any })
                          }
                          className="flex gap-6 mt-2"
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="favorable" disabled={isReadOnly} />
                            <Label className="text-sm">Favorable</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="no_favorable" disabled={isReadOnly} />
                            <Label className="text-sm">No Favorable</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-md font-semibold text-gray-900 mb-3">Aprobación de Inicio de Diseño</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={bloquePlanificacion.aprobacion.aprobado}
                          disabled={isReadOnly}
                          onCheckedChange={(checked) => {
                            const isApproved = checked === true;
                            setBloquePlanificacion({
                              ...bloquePlanificacion,
                              aprobacion: {
                                nombre: isApproved ? (userData?.nombre_apellido || "") : "",
                                cargo: isApproved ? (userData?.cargo || userData?.rol || userData?.role || solicitud.cargo_solicitante || "") : "",
                                fecha: isApproved ? new Date().toISOString().split("T")[0] : "",
                                aprobado: isApproved,
                              },
                            });
                          }}
                        />
                        <Label>Aprobar inicio de diseño (se registrará su nombre, cargo y fecha automáticamente)</Label>
                      </div>
                      {bloquePlanificacion.aprobacion.aprobado && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-green-50 rounded-lg border border-green-200">
                          <div>
                            <Label className="text-xs text-gray-600">Nombre</Label>
                            <p className="text-sm font-medium text-gray-900">{bloquePlanificacion.aprobacion.nombre || "—"}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-600">Cargo</Label>
                            {isReadOnly ? (
                              <p className="text-sm font-medium text-gray-900">{bloquePlanificacion.aprobacion.cargo || "—"}</p>
                            ) : (
                              <Input
                                value={bloquePlanificacion.aprobacion.cargo}
                                onChange={(e) =>
                                  setBloquePlanificacion({
                                    ...bloquePlanificacion,
                                    aprobacion: {
                                      ...bloquePlanificacion.aprobacion,
                                      cargo: e.target.value,
                                    },
                                  })
                                }
                                placeholder="Cargo del aprobador"
                                className="h-8 text-xs bg-white mt-0.5"
                              />
                            )}
                          </div>
                          <div>
                            <Label className="text-xs text-gray-600">Fecha</Label>
                            <p className="text-sm font-medium text-gray-900">{bloquePlanificacion.aprobacion.fecha || "—"}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Controles del Diseño */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 mb-1">Bloque III: Controles del Diseño</h2>
                    <p className="text-sm text-gray-500">Fase de Revisión</p>
                  </div>
                  {[
                    { key: "revision", title: "Revisión", desc: "Evaluación de la capacidad de los resultados para cumplir con los requisitos estipulados" },
                    { key: "verificacion", title: "Verificación", desc: "Comprobación de que las salidas del diseño cumplen estrictamente con las entradas del Bloque I" },
                    { key: "validacion", title: "Validación", desc: "Confirmación mediante prueba piloto o simulacro de que el servicio es apto para el uso previsto" },
                  ].map((section) => {
                    const entry = bloqueControles[section.key as keyof BloqueControlesDiseno] as ControlDisenoEntry;
                    return (
                      <div key={section.key} className="border border-gray-200 rounded-lg p-4 space-y-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{section.title}</h3>
                          <p className="text-xs text-gray-500">{section.desc}</p>
                        </div>
                        <div>
                          <Label>Descripción de la actividad realizada</Label>
                          <Textarea
                            value={entry.descripcion}
                            onChange={(e) =>
                              setBloqueControles({
                                ...bloqueControles,
                                [section.key]: { ...entry, descripcion: e.target.value },
                              })
                            }
                            rows={2}
                            disabled={isReadOnly}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label>Responsable (Cargo)</Label>
                            <Input
                              value={entry.responsable}
                              onChange={(e) =>
                                setBloqueControles({
                                  ...bloqueControles,
                                  [section.key]: { ...entry, responsable: e.target.value },
                                })
                              }
                              placeholder="Cargo del responsable"
                              disabled={isReadOnly}
                            />
                          </div>
                          <div>
                            <Label>Fecha</Label>
                            <Input
                              type="date"
                              value={entry.fecha}
                              onChange={(e) =>
                                setBloqueControles({
                                  ...bloqueControles,
                                  [section.key]: { ...entry, fecha: e.target.value },
                                })
                              }
                              disabled={isReadOnly}
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Resultado</Label>
                          <RadioGroup
                            value={entry.resultado}
                            onValueChange={(val) =>
                              !isReadOnly &&
                              setBloqueControles({
                                ...bloqueControles,
                                [section.key]: { ...entry, resultado: val as any },
                              })
                            }
                            className="flex gap-6 mt-2"
                          >
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="conforme" disabled={isReadOnly} />
                              <Label className="text-sm">Conforme</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="no_conforme" disabled={isReadOnly} />
                              <Label className="text-sm">No Conforme</Label>
                            </div>
                          </RadioGroup>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* STEP 5: Salidas del Diseño */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 mb-1">Bloque IV: Salidas del Diseño y Desarrollo</h2>
                    <p className="text-sm text-gray-500">
                      Marque los documentos generados, en función del servicio aplicable
                    </p>
                  </div>

                  {/* Side-by-side ST + CAP checklists */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* ST Checklist */}
                    <div className="space-y-2">
                      <div className="text-sm font-bold text-gray-700 bg-gray-100 px-3 py-2 rounded-t border border-gray-200">
                        Servicio Técnico (ST)
                      </div>
                      {bloqueSalidas.checklist.map((checkItem, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border border-gray-200 rounded-lg">
                          <div className="flex-1">
                            <Label className="text-sm">{checkItem.item}</Label>
                          </div>
                          <div className="flex items-center gap-4">
                            <RadioGroup
                              value={checkItem.aplica}
                              onValueChange={(val) => {
                                if (isReadOnly) return;
                                const newChecklist = [...bloqueSalidas.checklist];
                                newChecklist[idx] = { ...checkItem, aplica: val as any };
                                setBloqueSalidas({ ...bloqueSalidas, checklist: newChecklist });
                              }}
                              className="flex gap-3"
                            >
                              <div className="flex items-center gap-1">
                                <RadioGroupItem value="aplica" disabled={isReadOnly} />
                                <Label className="text-xs">Aplica</Label>
                              </div>
                              <div className="flex items-center gap-1">
                                <RadioGroupItem value="no_aplica" disabled={isReadOnly} />
                                <Label className="text-xs">No Aplica</Label>
                              </div>
                            </RadioGroup>
                            {checkItem.aplica === "aplica" && (
                              <Input
                                value={checkItem.especifique}
                                onChange={(e) => {
                                  const newChecklist = [...bloqueSalidas.checklist];
                                  newChecklist[idx] = { ...checkItem, especifique: e.target.value };
                                  setBloqueSalidas({ ...bloqueSalidas, checklist: newChecklist });
                                }}
                                placeholder="Especifique"
                                className="h-8 w-40"
                                disabled={isReadOnly}
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* CAP Checklist */}
                    <div className="space-y-2">
                      <div className="text-sm font-bold text-gray-700 bg-gray-100 px-3 py-2 rounded-t border border-gray-200">
                        Capacitación (CAP)
                      </div>
                      {bloqueSalidas.checklist_cap.map((checkItem, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border border-gray-200 rounded-lg">
                          <div className="flex-1">
                            <Label className="text-sm">{checkItem.item}</Label>
                          </div>
                          <div className="flex items-center gap-4">
                            <RadioGroup
                              value={checkItem.aplica}
                              onValueChange={(val) => {
                                if (isReadOnly) return;
                                const newChecklist = [...bloqueSalidas.checklist_cap];
                                newChecklist[idx] = { ...checkItem, aplica: val as any };
                                setBloqueSalidas({ ...bloqueSalidas, checklist_cap: newChecklist });
                              }}
                              className="flex gap-3"
                            >
                              <div className="flex items-center gap-1">
                                <RadioGroupItem value="aplica" disabled={isReadOnly} />
                                <Label className="text-xs">Aplica</Label>
                              </div>
                              <div className="flex items-center gap-1">
                                <RadioGroupItem value="no_aplica" disabled={isReadOnly} />
                                <Label className="text-xs">No Aplica</Label>
                              </div>
                            </RadioGroup>
                            {checkItem.aplica === "aplica" && (
                              <Input
                                value={checkItem.especifique}
                                onChange={(e) => {
                                  const newChecklist = [...bloqueSalidas.checklist_cap];
                                  newChecklist[idx] = { ...checkItem, especifique: e.target.value };
                                  setBloqueSalidas({ ...bloqueSalidas, checklist_cap: newChecklist });
                                }}
                                placeholder="Especifique"
                                className="h-8 w-40"
                                disabled={isReadOnly}
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="space-y-3">
                      <div>
                        <Label>Declaración de Cumplimiento: ¿Las salidas del diseño cumplen con las entradas del Bloque I?</Label>
                        <RadioGroup
                          value={bloqueSalidas.declaracion_cumplimiento === null ? "" : bloqueSalidas.declaracion_cumplimiento ? "si" : "no"}
                          onValueChange={(val) =>
                            !isReadOnly &&
                            setBloqueSalidas({ ...bloqueSalidas, declaracion_cumplimiento: val === "si" })
                          }
                          className="flex gap-6 mt-2"
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="si" disabled={isReadOnly} />
                            <Label className="text-sm">Sí</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="no" disabled={isReadOnly} />
                            <Label className="text-sm">No</Label>
                          </div>
                        </RadioGroup>
                      </div>
                      <div>
                        <Label>Observaciones</Label>
                        <Textarea
                          value={bloqueSalidas.observaciones}
                          onChange={(e) => setBloqueSalidas({ ...bloqueSalidas, observaciones: e.target.value })}
                          rows={3}
                          placeholder="Texto libre"
                          disabled={isReadOnly}
                        />
                      </div>

                      <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 text-xs text-sky-900 mt-3">
                        <p className="font-semibold text-sky-950 mb-1">DECLARACIÓN DE CONFORMIDAD:</p>
                        <p>Se certifica que el diseño ha sido completado satisfactoriamente y los documentos han sido archivados en el servidor según la ruta establecida.</p>
                      </div>
                    </div>
                  </div>

                  {/* Finalize Confirmation */}
                  {showFinalizeConfirm && (
                    <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg space-y-3">
                      <p className="text-sm font-medium text-amber-800">
                        ¿Está seguro de que desea finalizar esta solicitud? Una vez finalizada, no podrá realizar más cambios.
                      </p>
                      <div className="flex gap-3">
                        <Button
                          onClick={handleFinalize}
                          disabled={isSaving}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {isSaving ? "Finalizando..." : "Sí, Finalizar"}
                        </Button>
                        <Button variant="outline" onClick={() => setShowFinalizeConfirm(false)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => canGoBack && setCurrentStep(currentStep - 1)}
              disabled={!canGoBack || isSaving}
              className="flex gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>

            <div className="flex gap-2">
              {currentStep > 0 && currentStep < 5 && !isReadOnly && (
                <Button
                  variant="outline"
                  onClick={() => handleSave(currentStep, false)}
                  disabled={isSaving || isCompleted}
                  className="flex gap-2"
                >
                  <Save className="h-4 w-4" />
                  Guardar
                </Button>
              )}

              {currentStep < 5 && isReadOnly && (
                <Button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white flex gap-2"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}

              {currentStep < 5 && !isReadOnly && (
                <Button
                  onClick={() => handleSave(currentStep, true)}
                  disabled={isSaving || isCompleted}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white flex gap-2"
                >
                  {isSaving ? "Guardando..." : "Guardar y Continuar"}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}

              {currentStep === 5 && !isCompleted && !isReadOnly && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleSave(5, false)}
                    disabled={isSaving}
                    className="flex gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Guardar
                  </Button>
                  <Button
                    onClick={() => setShowFinalizeConfirm(true)}
                    disabled={isSaving}
                    className="bg-green-600 hover:bg-green-700 text-white flex gap-2"
                  >
                    <CheckCheck className="h-4 w-4" />
                    Finalizar Solicitud
                  </Button>
                </>
              )}

              {isCompleted && (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-300 rounded-lg text-green-800 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Solicitud Completada
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
