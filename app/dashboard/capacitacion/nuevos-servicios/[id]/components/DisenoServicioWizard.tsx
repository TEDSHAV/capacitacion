"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Save,
  CheckCheck,
  AlertCircle,
  Printer,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import CostTable from "./CostTable";
import {
  saveBloqueRecursos,
  saveBloqueHigieneSeguridad,
  saveBloquePlanificacion,
  saveBloqueControles,
  saveBloqueSalidas,
  finalizarSolicitud,
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
  { label: "Cabecera", description: "Datos de cabecera (Negocios)" },
  { label: "Recursos", description: "Recursos y requisitos" },
  { label: "Higiene y Ambiente", description: "Seguridad y ambiente" },
  { label: "Factibilidad", description: "Planificación y factibilidad" },
  { label: "Controles", description: "Controles del diseño" },
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
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [showFinalizeSuccess, setShowFinalizeSuccess] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Block states — deep-merge with EMPTY defaults to handle partial JSONB from DB
  const [bloqueRecursos, setBloqueRecursos] = useState<BloqueRecursosRequisitos>(
    solicitud.bloque_recursos_requisitos
      ? {
          ...EMPTY_BLOQUE_RECURSOS,
          ...solicitud.bloque_recursos_requisitos,
          antecedentes: {
            ...EMPTY_BLOQUE_RECURSOS.antecedentes,
            ...solicitud.bloque_recursos_requisitos.antecedentes,
          },
        }
      : EMPTY_BLOQUE_RECURSOS
  );
  const [bloqueHigiene, setBloqueHigiene] = useState<BloqueHigieneSeguridadAmbiente>(
    solicitud.bloque_higiene_seguridad_ambiente
      ? {
          ...EMPTY_BLOQUE_HIGIENE,
          ...solicitud.bloque_higiene_seguridad_ambiente,
          ambiental: {
            ...EMPTY_BLOQUE_HIGIENE.ambiental,
            ...solicitud.bloque_higiene_seguridad_ambiente.ambiental,
          },
          peligros: {
            ...EMPTY_BLOQUE_HIGIENE.peligros,
            ...solicitud.bloque_higiene_seguridad_ambiente.peligros,
          },
        }
      : EMPTY_BLOQUE_HIGIENE
  );
  const [bloquePlanificacion, setBloquePlanificacion] = useState<BloquePlanificacionFactibilidad>(
    solicitud.bloque_planificacion_factibilidad
      ? {
          ...EMPTY_BLOQUE_PLANIFICACION,
          ...solicitud.bloque_planificacion_factibilidad,
          aprobacion: {
            ...EMPTY_BLOQUE_PLANIFICACION.aprobacion,
            ...solicitud.bloque_planificacion_factibilidad.aprobacion,
          },
        }
      : EMPTY_BLOQUE_PLANIFICACION
  );
  const [bloqueControles, setBloqueControles] = useState<BloqueControlesDiseno>(
    solicitud.bloque_controles_diseno
      ? {
          ...EMPTY_BLOQUE_CONTROLES,
          ...solicitud.bloque_controles_diseno,
          revision: {
            ...EMPTY_BLOQUE_CONTROLES.revision,
            ...solicitud.bloque_controles_diseno.revision,
          },
          verificacion: {
            ...EMPTY_BLOQUE_CONTROLES.verificacion,
            ...solicitud.bloque_controles_diseno.verificacion,
          },
          validacion: {
            ...EMPTY_BLOQUE_CONTROLES.validacion,
            ...solicitud.bloque_controles_diseno.validacion,
          },
        }
      : EMPTY_BLOQUE_CONTROLES
  );
  const [bloqueSalidas, setBloqueSalidas] = useState<BloqueSalidasDiseno>(
    solicitud.bloque_salidas_diseno
      ? { ...EMPTY_BLOQUE_SALIDAS, ...solicitud.bloque_salidas_diseno }
      : EMPTY_BLOQUE_SALIDAS
  );

  const isCompleted = solicitud.id_estatus === 38;
  const isCAP = solicitud.tipo_servicio?.toLowerCase().includes("cap") || solicitud.tipo_servicio?.toLowerCase().includes("capacitaci");

  // Initialize both checklists (ST + CAP) if empty, migrating old CAP data if needed
  if (
    (bloqueSalidas.checklist?.length ?? 0) === 0 ||
    (bloqueSalidas.checklist_cap?.length ?? 0) === 0
  ) {
    const existingChecklist = bloqueSalidas.checklist || [];
    const existingCap = bloqueSalidas.checklist_cap || [];

    // Detect old CAP data stored in checklist (pre-dual-checklist migration)
    const isOldCapData =
      existingChecklist.length > 0 &&
      existingChecklist.every((c) =>
        CAP_CHECKLIST_ITEMS.some(
          (cap) => cap.toLowerCase() === c.item.toLowerCase()
        )
      );

    setBloqueSalidas({
      ...bloqueSalidas,
      checklist:
        existingChecklist.length > 0 && !isOldCapData
          ? existingChecklist
          : ST_CHECKLIST_ITEMS.map((item) => ({
              item,
              aplica: "" as const,
              especifique: "",
            })),
      checklist_cap:
        existingCap.length > 0
          ? existingCap
          : isOldCapData
            ? existingChecklist
            : CAP_CHECKLIST_ITEMS.map((item) => ({
                item,
                aplica: "" as const,
                especifique: "",
              })),
    });
  }

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
      // Auto-redirect to the list after the user has a chance to read the
      // confirmation. 3.5s is long enough to register, short enough to not
      // feel stuck.
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

  const handlePrintPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const blob = await renderPdfBlob();
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error("Error printing PDF:", e);
          window.open(url, "_blank");
        }
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(url);
        }, 1000);
      };
    } catch (error) {
      console.error("Error generating PDF for print:", error);
      alert("Error al generar el PDF para impresión");
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
      const safeName = (solicitud.nombre_sugerido || `#${solicitud.id}`)
        .replace(/[^\w\-]+/g, "_")
        .slice(0, 60);
      a.download = `RG-NEG-003-${safeName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
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

      {/* PDF Action Bar */}
      <div className="mb-4 flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrintPdf}
          disabled={isGeneratingPdf}
          className="flex gap-2"
        >
          <Printer className="h-4 w-4" />
          {isGeneratingPdf ? "Generando..." : "Ver PDF"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadPdf}
          disabled={isGeneratingPdf}
          className="flex gap-2"
        >
          <Download className="h-4 w-4" />
          {isGeneratingPdf ? "Generando..." : "Descargar PDF"}
        </Button>
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

      {/* Step Content */}
      <Card className="shadow-md border-gray-200">
        <CardContent className="p-6">
          {/* STEP 0: Header (read-only) */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">Datos de Cabecera</h2>
                <p className="text-sm text-gray-500">Información prefilled por Negocios (solo lectura)</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600 text-xs">Fecha de Solicitud</Label>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {solicitud.fecha_solicitud
                      ? new Date(solicitud.fecha_solicitud).toLocaleString("es-VE", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        }).replace(/\u00a0/g, " ")
                      : "—"}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600 text-xs">Tipo de Solicitud</Label>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {solicitud.tipo_solicitud === "creacion" ? "Nueva Creación" : "Modificación de Servicio Existente"}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600 text-xs">Tipo / Naturaleza del Servicio</Label>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {solicitud.tipo_servicio || "—"}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600 text-xs">Solicitante</Label>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {solicitud.solicitante_nombre || "—"}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600 text-xs">Cargo del Solicitante</Label>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {solicitud.cargo_solicitante || "—"}
                  </p>
                </div>
              </div>
              {isCompleted && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-green-800 mb-2">Aprobación Final</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-600 text-xs">Aprobado Por</Label>
                        <p className="text-sm font-medium text-gray-900 mt-1">
                          {solicitud.aprobador_nombre || "—"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-gray-600 text-xs">Fecha de Aprobación</Label>
                        <p className="text-sm font-medium text-gray-900 mt-1">
                          {solicitud.fecha_aprobacion
                            ? new Date(solicitud.fecha_aprobacion).toLocaleDateString("es-VE", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="border-t border-gray-200 pt-4">
                <div className="mb-2">
                  <Label className="text-gray-600 text-xs">Bloque I: Elementos de Entrada</Label>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label className="text-gray-600 text-xs">Nombre Sugerido del Servicio</Label>
                    <p className="text-sm font-medium text-gray-900 mt-1">{solicitud.nombre_sugerido}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600 text-xs">Objetivo / Propósito</Label>
                    <p className="text-sm font-medium text-gray-900 mt-1 whitespace-pre-wrap">{solicitud.objetivo_proposito}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: Recursos y Requisitos */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">Recursos Necesarios para la Ejecución</h2>
                <p className="text-sm text-gray-500">Llenado por Departamento Ejecutante</p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label>Personal Requerido</Label>
                  <Textarea
                    value={bloqueRecursos.personal_requerido}
                    onChange={(e) => setBloqueRecursos({ ...bloqueRecursos, personal_requerido: e.target.value })}
                    placeholder="Competencias y cantidad de trabajadores necesarios"
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Equipos y Herramientas</Label>
                  <Textarea
                    value={bloqueRecursos.equipos_herramientas}
                    onChange={(e) => setBloqueRecursos({ ...bloqueRecursos, equipos_herramientas: e.target.value })}
                    placeholder="Insumos físicos necesarios"
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Software</Label>
                  <Textarea
                    value={bloqueRecursos.software}
                    onChange={(e) => setBloqueRecursos({ ...bloqueRecursos, software: e.target.value })}
                    placeholder="Programas o licencias requeridas"
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Infraestructura</Label>
                  <Textarea
                    value={bloqueRecursos.infraestructura}
                    onChange={(e) => setBloqueRecursos({ ...bloqueRecursos, infraestructura: e.target.value })}
                    placeholder="Instalaciones, aulas o espacios requeridos"
                    rows={2}
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-md font-semibold text-gray-900 mb-3">Requisitos, Mercado y Aceptación</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label>Requisitos Legales y Reglamentarios</Label>
                    <Textarea
                      value={bloqueRecursos.requisitos_legales}
                      onChange={(e) => setBloqueRecursos({ ...bloqueRecursos, requisitos_legales: e.target.value })}
                      placeholder="Normativas, leyes o decretos aplicables según el país"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Requisitos del Cliente / Mercado</Label>
                    <Textarea
                      value={bloqueRecursos.requisitos_cliente}
                      onChange={(e) => setBloqueRecursos({ ...bloqueRecursos, requisitos_cliente: e.target.value })}
                      placeholder="Expectativas comerciales o especificaciones técnicas solicitadas"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Criterios de Aceptación del Servicio</Label>
                    <Textarea
                      value={bloqueRecursos.criterios_aceptacion}
                      onChange={(e) => setBloqueRecursos({ ...bloqueRecursos, criterios_aceptacion: e.target.value })}
                      placeholder="Condiciones mínimas que garantizan que el servicio sea exitoso"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-md font-semibold text-gray-900 mb-3">Antecedentes</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={bloqueRecursos.antecedentes.existe}
                      onCheckedChange={(checked) =>
                        setBloqueRecursos({
                          ...bloqueRecursos,
                          antecedentes: { ...bloqueRecursos.antecedentes, existe: checked === true },
                        })
                      }
                    />
                    <Label>¿Existieron antecedentes o servicios similares?</Label>
                  </div>
                  {bloqueRecursos.antecedentes.existe && (
                    <div>
                      <Label>Especifique</Label>
                      <Input
                        value={bloqueRecursos.antecedentes.especificacion}
                        onChange={(e) =>
                          setBloqueRecursos({
                            ...bloqueRecursos,
                            antecedentes: { ...bloqueRecursos.antecedentes, especificacion: e.target.value },
                          })
                        }
                        placeholder="Indicar nombre o código del servicio anterior"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Higiene, Seguridad y Ambiente */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">Matriz de Aspectos e Impactos Ambientales</h2>
                <p className="text-sm text-gray-500">¿El servicio genera o puede generar los siguientes aspectos ambientales?</p>
              </div>
              <div className="space-y-3">
                {[
                  { key: "generacion_residuos", label: "Generación de Residuos" },
                  { key: "consumo_energia", label: "Consumo de Energía" },
                  { key: "emisiones_vertidos", label: "Emisiones o Vertidos" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <Label>{item.label}</Label>
                    <RadioGroup
                      value={bloqueHigiene.ambiental[item.key as keyof typeof bloqueHigiene.ambiental] ? "si" : "no"}
                      onValueChange={(val) =>
                        setBloqueHigiene({
                          ...bloqueHigiene,
                          ambiental: {
                            ...bloqueHigiene.ambiental,
                            [item.key]: val === "si",
                          },
                        })
                      }
                      className="flex gap-4"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="si" />
                        <Label className="text-sm">Sí</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="no" />
                        <Label className="text-sm">No</Label>
                      </div>
                    </RadioGroup>
                  </div>
                ))}
                {(bloqueHigiene.ambiental.generacion_residuos ||
                  bloqueHigiene.ambiental.consumo_energia ||
                  bloqueHigiene.ambiental.emisiones_vertidos) && (
                  <div>
                    <Label>Significancia (Descripción del impacto ambiental y controles asociados)</Label>
                    <Textarea
                      value={bloqueHigiene.ambiental.significancia}
                      onChange={(e) =>
                        setBloqueHigiene({
                          ...bloqueHigiene,
                          ambiental: { ...bloqueHigiene.ambiental, significancia: e.target.value },
                        })
                      }
                      rows={3}
                    />
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-md font-semibold text-gray-900 mb-1">Matriz de Peligros y Riesgos</h3>
                <p className="text-sm text-gray-500 mb-3">¿El servicio introduce o modifica peligros para el personal de SHA o del Cliente?</p>
                <div className="space-y-3">
                  {[
                    { key: "biologicos", label: "Biológicos" },
                    { key: "mecanicos", label: "Mecánicos" },
                    { key: "ergonomicos", label: "Ergonómicos" },
                    { key: "electricos", label: "Eléctricos" },
                    { key: "quimicos", label: "Químicos" },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <Label>{item.label}</Label>
                      <RadioGroup
                        value={bloqueHigiene.peligros[item.key as keyof typeof bloqueHigiene.peligros] ? "si" : "no"}
                        onValueChange={(val) =>
                          setBloqueHigiene({
                            ...bloqueHigiene,
                            peligros: {
                              ...bloqueHigiene.peligros,
                              [item.key]: val === "si",
                            },
                          })
                        }
                        className="flex gap-4"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="si" />
                          <Label className="text-sm">Sí</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="no" />
                          <Label className="text-sm">No</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  ))}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <Label>Otros (Especificar)</Label>
                    <Input
                      value={bloqueHigiene.peligros.otros}
                      onChange={(e) =>
                        setBloqueHigiene({
                          ...bloqueHigiene,
                          peligros: { ...bloqueHigiene.peligros, otros: e.target.value },
                        })
                      }
                      placeholder="Especificar otros peligros"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Descripción del Peligro (Nivel de riesgo estimado y controles de seguridad requeridos)</Label>
                    <Textarea
                      value={bloqueHigiene.peligros.descripcion}
                      onChange={(e) =>
                        setBloqueHigiene({
                          ...bloqueHigiene,
                          peligros: { ...bloqueHigiene.peligros, descripcion: e.target.value },
                        })
                      }
                      rows={3}
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
                <p className="text-sm text-gray-500">Llenado por Departamento Ejecutante</p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label>Nombre y Apellido del Recurso Asignado / Personal Técnico</Label>
                  <Input
                    value={bloquePlanificacion.recurso_asignado}
                    onChange={(e) => setBloquePlanificacion({ ...bloquePlanificacion, recurso_asignado: e.target.value })}
                    placeholder="Líder técnico del diseño"
                  />
                </div>
                <div>
                  <Label>Equipos / Instrumentos Asignados</Label>
                  <Input
                    value={bloquePlanificacion.equipos_asignados}
                    onChange={(e) => setBloquePlanificacion({ ...bloquePlanificacion, equipos_asignados: e.target.value })}
                    placeholder={isCAP ? "Específico si es Servicio Técnico" : "Equipos e instrumentos asignados"}
                  />
                </div>
                <div>
                  <Label>Software / Material Didáctico Asignado</Label>
                  <Input
                    value={bloquePlanificacion.software_material_asignado}
                    onChange={(e) => setBloquePlanificacion({ ...bloquePlanificacion, software_material_asignado: e.target.value })}
                    placeholder={isCAP ? "Material didáctico asignado" : "Software asignado"}
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-md font-semibold text-gray-900 mb-3">Estructura de Costo Estimada</h3>
                <CostTable
                  items={bloquePlanificacion.estructura_costos}
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
                        setBloquePlanificacion({ ...bloquePlanificacion, viabilidad_tecnica: val as any })
                      }
                      className="flex gap-6 mt-2"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="favorable" />
                        <Label className="text-sm">Favorable</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="no_favorable" />
                        <Label className="text-sm">No Favorable</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div>
                    <Label>Viabilidad Económica</Label>
                    <RadioGroup
                      value={bloquePlanificacion.viabilidad_economica}
                      onValueChange={(val) =>
                        setBloquePlanificacion({ ...bloquePlanificacion, viabilidad_economica: val as any })
                      }
                      className="flex gap-6 mt-2"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="favorable" />
                        <Label className="text-sm">Favorable</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="no_favorable" />
                        <Label className="text-sm">No Favorable</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-md font-semibold text-gray-900 mb-3">Tiempos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Tiempo Estimado (Horas/Días)</Label>
                    <Input
                      value={bloquePlanificacion.tiempo_estimado}
                      onChange={(e) => setBloquePlanificacion({ ...bloquePlanificacion, tiempo_estimado: e.target.value })}
                      placeholder="Ej: 40 horas / 5 días"
                    />
                  </div>
                  <div>
                    <Label>Fecha Estimada de Finalización</Label>
                    <Input
                      type="date"
                      value={bloquePlanificacion.fecha_estimada_finalizacion}
                      onChange={(e) => setBloquePlanificacion({ ...bloquePlanificacion, fecha_estimada_finalizacion: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-md font-semibold text-gray-900 mb-3">Aprobación de Inicio de Diseño</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={bloquePlanificacion.aprobacion.aprobado}
                      onCheckedChange={(checked) => {
                        const isApproved = checked === true;
                        setBloquePlanificacion({
                          ...bloquePlanificacion,
                          aprobacion: {
                            nombre: isApproved ? (userData?.nombre_apellido || "") : "",
                            cargo: isApproved ? (userData?.departamentos?.nombre || solicitud.cargo_solicitante || "") : "",
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
                        <p className="text-sm font-medium text-gray-900">{bloquePlanificacion.aprobacion.cargo || "—"}</p>
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
                <p className="text-sm text-gray-500">Fase de Revisión — Llenado por Departamento Ejecutante</p>
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
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Resultado</Label>
                      <RadioGroup
                        value={entry.resultado}
                        onValueChange={(val) =>
                          setBloqueControles({
                            ...bloqueControles,
                            [section.key]: { ...entry, resultado: val as any },
                          })
                        }
                        className="flex gap-6 mt-2"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="conforme" />
                          <Label className="text-sm">Conforme</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="no_conforme" />
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
                            const newChecklist = [...bloqueSalidas.checklist];
                            newChecklist[idx] = { ...checkItem, aplica: val as any };
                            setBloqueSalidas({ ...bloqueSalidas, checklist: newChecklist });
                          }}
                          className="flex gap-3"
                        >
                          <div className="flex items-center gap-1">
                            <RadioGroupItem value="aplica" />
                            <Label className="text-xs">Aplica</Label>
                          </div>
                          <div className="flex items-center gap-1">
                            <RadioGroupItem value="no_aplica" />
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
                            const newChecklist = [...bloqueSalidas.checklist_cap];
                            newChecklist[idx] = { ...checkItem, aplica: val as any };
                            setBloqueSalidas({ ...bloqueSalidas, checklist_cap: newChecklist });
                          }}
                          className="flex gap-3"
                        >
                          <div className="flex items-center gap-1">
                            <RadioGroupItem value="aplica" />
                            <Label className="text-xs">Aplica</Label>
                          </div>
                          <div className="flex items-center gap-1">
                            <RadioGroupItem value="no_aplica" />
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
                        setBloqueSalidas({ ...bloqueSalidas, declaracion_cumplimiento: val === "si" })
                      }
                      className="flex gap-6 mt-2"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="si" />
                        <Label className="text-sm">Sí</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="no" />
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
                    />
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
          {currentStep > 0 && currentStep < 5 && (
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

          {currentStep < 5 && (
            <Button
              onClick={() => handleSave(currentStep, true)}
              disabled={isSaving || isCompleted}
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex gap-2"
            >
              {isSaving ? "Guardando..." : "Guardar y Continuar"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}

          {currentStep === 5 && !isCompleted && (
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
