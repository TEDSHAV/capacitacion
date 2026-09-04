"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getFacilitatorByIdAction } from "@/app/actions/facilitators-crud";
import {
  getEvaluacionesByFacilitador,
  getEvaluacionById,
  saveEvaluacion,
  type EvaluacionPayload,
  type TipoEvaluacion,
  type FaseInicial,
  type FaseSeguimiento,
  type FaseReevaluacion,
} from "@/app/actions/evaluacion-facilitadores";
import {
  computePuntajeInicial,
  classifyInicial,
  computeGestionPct,
  computeSeguimientoTotal,
} from "@/app/actions/evaluacion-facilitadores-scoring";
import { toTitleCase } from "@/utils/string-utils";
import type { Facilitador } from "@/types";
import {
  ArrowLeft,
  Save,
  FileDown,
  Loader2,
  ClipboardCheck,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import {
  CRITERIA_SECTIONS,
  GESTION_ITEMS,
  CLASIFICACION_INICIAL,
  CLASIFICACION_REEVALUACION,
} from "@/lib/evaluacion-facilitadores-criteria";
import EvaluacionHistory from "./EvaluacionHistory";

interface EvaluacionFormClientProps {
  facilitadorId: number;
  mode?: "nueva";
  evaluadorNombre?: string;
  evaluadorCargo?: string;
}

interface HistoryRow {
  id: number;
  tipo_evaluacion: string;
  fecha_evaluacion: string;
  puntaje_total: number | null;
  porcentaje_total: number | null;
  condicion_final: string | null;
}

const TIPO_OPTIONS: { value: TipoEvaluacion; label: string }[] = [
  { value: "nuevo", label: "NUEVO (Verificación Inicial)" },
  { value: "seguimiento", label: "SEGUIMIENTO" },
  { value: "reevaluacion", label: "REEVALUACIÓN" },
];

const CONDICION_BADGE: Record<string, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  aprobado: { label: "Aprobado", cls: "bg-green-100 text-green-700 border-green-300", icon: CheckCircle2 },
  aprobado_supervision: { label: "Aprobado bajo supervisión", cls: "bg-amber-100 text-amber-700 border-amber-300", icon: AlertTriangle },
  no_aprobado: { label: "No aprobado", cls: "bg-red-100 text-red-700 border-red-300", icon: XCircle },
  aceptable: { label: "Aceptable", cls: "bg-green-100 text-green-700 border-green-300", icon: CheckCircle2 },
  no_aceptable: { label: "No aceptable", cls: "bg-red-100 text-red-700 border-red-300", icon: XCircle },
};

export default function EvaluacionFormClient({
  facilitadorId,
  mode,
  evaluadorNombre: defaultEvaluadorNombre = "",
  evaluadorCargo: defaultEvaluadorCargo = "",
}: EvaluacionFormClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("evalId");
  const isNewMode = mode === "nueva" && !editId;

  const [facilitador, setFacilitador] = useState<Facilitador | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Form state
  const [tipoEvaluacion, setTipoEvaluacion] = useState<TipoEvaluacion>("nuevo");
  const [fechaEvaluacion, setFechaEvaluacion] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [evaluadorNombre, setEvaluadorNombre] = useState(defaultEvaluadorNombre);
  const [evaluadorCargo, setEvaluadorCargo] = useState(defaultEvaluadorCargo);
  const [recomendadoPor, setRecomendadoPor] = useState("");
  const [tipoProveedor, setTipoProveedor] = useState("");
  const [entrevista, setEntrevista] = useState("");
  const [firma, setFirma] = useState("");

  // Phase 1 — sections: { [sectionKey]: { opcion: string | null, observacion: string } | { opciones: string[], observacion: string } }
  const [faseInicial, setFaseInicial] = useState<FaseInicial["secciones"]>({});
  const [observacionesInicial, setObservacionesInicial] = useState("");

  // Phase 2
  const [docsInicialesPct, setDocsInicialesPct] = useState<number>(0);
  const [encuestasPct, setEncuestasPct] = useState<number>(0);
  const [gestionItems, setGestionItems] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [segObservaciones, setSegObservaciones] = useState("");
  const [segOportunidades, setSegOportunidades] = useState("");
  const [segMetodologias, setSegMetodologias] = useState("");

  // Phase 3
  const [reevaluacionOsis, setReevaluacionOsis] = useState<
    { nro_osi: string; docs: number; encuestas: number; gestion: number; total: number }[]
  >([{ nro_osi: "", docs: 0, encuestas: 0, gestion: 0, total: 0 }]);
  const [reevaluacionCondicion, setReevaluacionCondicion] = useState("aprobado");

  const hasInitialized = useRef(false);

  // Load facilitador + history + (optional) edit data
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    async function load() {
      const [facResult, histResult] = await Promise.all([
        getFacilitatorByIdAction(String(facilitadorId)),
        getEvaluacionesByFacilitador(facilitadorId),
      ]);

      if (facResult.data) {
        setFacilitador(facResult.data as Facilitador);
      }

      if (histResult.evaluaciones) {
        setHistory(histResult.evaluaciones as unknown as HistoryRow[]);
      }

      // Load edit data if evalId is present
      if (editId) {
        const evalResult = await getEvaluacionById(parseInt(editId));
        if (evalResult.evaluacion) {
          const ev = evalResult.evaluacion as any;
          setTipoEvaluacion(ev.tipo_evaluacion);
          setFechaEvaluacion(ev.fecha_evaluacion);
          setEvaluadorNombre(ev.evaluador_nombre || "");
          setEvaluadorCargo(ev.evaluador_cargo || "");
          setRecomendadoPor(ev.recomendado_por || "");
          setTipoProveedor(ev.tipo_proveedor || "");
          setEntrevista(ev.entrevista || "");
          setFirma(ev.firma || "");
          setObservacionesInicial(ev.observaciones || "");

          if (ev.fase_inicial) {
            const fi = ev.fase_inicial as FaseInicial;
            setFaseInicial(fi.secciones || {});
          }

          if (ev.fase_seguimiento) {
            const fs = ev.fase_seguimiento as FaseSeguimiento;
            setDocsInicialesPct(fs.docs_iniciales_pct ?? 0);
            setEncuestasPct(fs.encuestas_pct ?? 0);
            if (fs.gestion_actividades?.items) {
              setGestionItems(fs.gestion_actividades.items);
            }
            setSegObservaciones(fs.observaciones || "");
            setSegOportunidades(fs.oportunidades_mejora || "");
            setSegMetodologias(fs.metodologias || "");
          }

          if (ev.fase_reevaluacion) {
            const fr = ev.fase_reevaluacion as FaseReevaluacion;
            if (fr.osis) {
              setReevaluacionOsis(
                fr.osis.map((o) => ({
                  nro_osi: o.nro_osi,
                  docs: o.docs ?? 0,
                  encuestas: o.encuestas ?? 0,
                  gestion: o.gestion ?? 0,
                  total: o.total ?? 0,
                })),
              );
            }
            setReevaluacionCondicion(fr.condicion || "aprobado");
          }
        }
      }

      setLoading(false);
    }
    load();
  }, [facilitadorId, editId]);

  // ─── Computed values ──────────────────────────────────────────────────────

  const faseInicialObj: FaseInicial = useMemo(
    () => ({ secciones: faseInicial }),
    [faseInicial],
  );

  const puntajeTotal = useMemo(
    () => computePuntajeInicial(faseInicialObj),
    [faseInicialObj],
  );

  const condicionInicial = useMemo(
    () => classifyInicial(puntajeTotal),
    [puntajeTotal],
  );

  const gestionPct = useMemo(
    () => computeGestionPct(gestionItems),
    [gestionItems],
  );

  const seguimientoTotal = useMemo(
    () =>
      computeSeguimientoTotal({
        docs_iniciales_pct: docsInicialesPct,
        encuestas_pct: encuestasPct,
        gestion_actividades: { items: gestionItems, pct: gestionPct },
      }),
    [docsInicialesPct, encuestasPct, gestionPct, gestionItems],
  );

  const reevaluacionAvg = useMemo(() => {
    if (reevaluacionOsis.length === 0) return 0;
    return (
      reevaluacionOsis.reduce((s, o) => s + (o.total || 0), 0) /
      reevaluacionOsis.length
    );
  }, [reevaluacionOsis]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const toggleSection = (key: string) =>
    setCollapsedSections((p) => ({ ...p, [key]: !p[key] }));

  const setSingleOption = (sectionKey: string, option: string) => {
    setFaseInicial((p) => ({
      ...p,
      [sectionKey]: {
        ...(p[sectionKey as keyof typeof p] || {}),
        opcion: option,
        observacion: (p[sectionKey as keyof typeof p] as any)?.observacion || "",
      },
    }));
  };

  const setMultiOption = (sectionKey: string, option: string, checked: boolean) => {
    setFaseInicial((p) => {
      const existing = (p[sectionKey as keyof typeof p] as any) || { opciones: [] };
      const current: string[] = existing.opciones || [];
      const next = checked
        ? [...current, option]
        : current.filter((o) => o !== option);
      return {
        ...p,
        [sectionKey]: {
          opciones: next,
          observacion: existing.observacion || "",
        },
      };
    });
  };

  const setSectionObservacion = (sectionKey: string, observacion: string) => {
    setFaseInicial((p) => {
      const existing = (p[sectionKey as keyof typeof p] as any) || {};
      const isMulti = CRITERIA_SECTIONS.find((s) => s.key === sectionKey)?.multi;
      return {
        ...p,
        [sectionKey]: isMulti
          ? { opciones: existing.opciones || [], observacion }
          : { opcion: existing.opcion || null, observacion },
      };
    });
  };

  const buildPayload = useCallback(
    (): EvaluacionPayload => {
      const faseSeg: FaseSeguimiento | null =
        tipoEvaluacion === "seguimiento"
          ? {
              docs_iniciales_pct: docsInicialesPct,
              encuestas_pct: encuestasPct,
              gestion_actividades: {
                items: gestionItems,
                pct: gestionPct,
              },
              total_pct: seguimientoTotal,
              observaciones: segObservaciones,
              oportunidades_mejora: segOportunidades,
              metodologias: segMetodologias,
            }
          : null;

      const faseReev: FaseReevaluacion | null =
        tipoEvaluacion === "reevaluacion"
          ? {
              osis: reevaluacionOsis.map((o) => ({
                nro_osi: o.nro_osi,
                docs: o.docs,
                encuestas: o.encuestas,
                gestion: o.gestion,
                total: o.total,
              })),
              condicion: reevaluacionCondicion,
            }
          : null;

      return {
        id: editId ? parseInt(editId) : undefined,
        facilitador_id: facilitadorId,
        tipo_evaluacion: tipoEvaluacion,
        evaluador_nombre: evaluadorNombre || null,
        evaluador_cargo: evaluadorCargo || null,
        recomendado_por: recomendadoPor || null,
        tipo_proveedor: tipoProveedor || null,
        entrevista: entrevista || null,
        firma: firma || null,
        fecha_evaluacion: fechaEvaluacion,
        fase_inicial: { secciones: faseInicial, total_puntos: puntajeTotal },
        fase_seguimiento: faseSeg,
        fase_reevaluacion: faseReev,
        observaciones: observacionesInicial || null,
      };
    },
    [
      editId,
      facilitadorId,
      tipoEvaluacion,
      evaluadorNombre,
      evaluadorCargo,
      recomendadoPor,
      tipoProveedor,
      entrevista,
      firma,
      fechaEvaluacion,
      faseInicial,
      puntajeTotal,
      docsInicialesPct,
      encuestasPct,
      gestionItems,
      gestionPct,
      seguimientoTotal,
      segObservaciones,
      segOportunidades,
      segMetodologias,
      reevaluacionOsis,
      reevaluacionCondicion,
      observacionesInicial,
    ],
  );

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await saveEvaluacion(buildPayload());
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess("Evaluación guardada exitosamente.");
        // Refresh history
        const histResult = await getEvaluacionesByFacilitador(facilitadorId);
        if (histResult.evaluaciones) {
          setHistory(histResult.evaluaciones as unknown as HistoryRow[]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    setError(null);
    try {
      const payload = buildPayload();
      const response = await fetch("/api/generate-evaluacion-facilitador-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          facilitador_nombre: facilitador?.nombre_apellido || "",
          facilitador_cedula: facilitador?.cedula || null,
          facilitador_rif: facilitador?.rif || null,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Error al generar el PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      const safeName = (facilitador?.nombre_apellido || "facilitador")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .substring(0, 50);
      a.download = `evaluacion_facilitador_${safeName}.pdf`;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al descargar PDF.");
    } finally {
      setDownloading(false);
    }
  };

  const updateReevaluacionOsi = (
    index: number,
    field: "nro_osi" | "docs" | "encuestas" | "gestion",
    value: string | number,
  ) => {
    setReevaluacionOsis((p) =>
      p.map((o, i) => {
        if (i !== index) return o;
        const updated = { ...o, [field]: value };
        updated.total = (updated.docs || 0) * 0.4 + (updated.encuestas || 0) * 0.4 + (updated.gestion || 0) * 0.2;
        return updated;
      }),
    );
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-white min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
        <p className="text-sm text-gray-500 mt-3">Cargando...</p>
      </div>
    );
  }

  if (!facilitador) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-white">
        <div className="text-center py-16">
          <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            No se encontró el facilitador.
          </p>
          <button
            onClick={() =>
              router.push("/dashboard/capacitacion/evaluacion-facilitadores")
            }
            className="mt-4 text-sm text-violet-600 hover:underline bg-transparent border-0 cursor-pointer"
          >
            Volver al listado
          </button>
        </div>
      </div>
    );
  }

  const condicionBadge = CONDICION_BADGE[tipoEvaluacion === "nuevo" ? condicionInicial : seguimientoTotal >= 0.8 ? "aceptable" : "no_aceptable"];

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-white">
      {/* Back link */}
      <button
        onClick={() =>
          router.push("/dashboard/capacitacion/evaluacion-facilitadores")
        }
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 bg-transparent border-0 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al listado
      </button>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Evaluación de Facilitador
        </h1>
        <p className="mt-1 text-gray-600">
          {toTitleCase(facilitador.nombre_apellido || "")}
          {facilitador.cedula && ` · C.I. ${facilitador.cedula}`}
          {facilitador.rif && ` · RIF ${facilitador.rif}`}
        </p>
        <p className="text-xs text-gray-400 mt-1">RG-CAP-004</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* Main form */}
        <div className="space-y-6">
          {/* ─── Datos del Facilitador ─── */}
          <SectionCard title="DATOS DEL FACILITADOR" defaultOpen>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Nombre y Apellido" value={toTitleCase(facilitador.nombre_apellido || "")} readOnly />
              <Field label="Cédula de Identidad" value={facilitador.cedula || "—"} readOnly />
              <InputField label="Tipo de Proveedor" value={tipoProveedor} onChange={setTipoProveedor} />
              <InputField label="Entrevista" value={entrevista} onChange={setEntrevista} />
              <InputField label="Nombre y Apellido del Evaluador" value={evaluadorNombre} onChange={setEvaluadorNombre} />
              <InputField label="Cargo del Evaluador" value={evaluadorCargo} onChange={setEvaluadorCargo} />
              <InputField label="Recomendado Por" value={recomendadoPor} onChange={setRecomendadoPor} />
              <InputField label="Firma" value={firma} onChange={setFirma} />
            </div>
          </SectionCard>

          {/* ─── Tipo de Evaluación ─── */}
          <SectionCard title="NIVEL DE CUMPLIMIENTO DE REQUISITOS INICIALES" defaultOpen>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  Tipo de Evaluación
                </label>
                <div className="flex flex-wrap gap-3">
                  {TIPO_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`inline-flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer text-sm transition-colors ${
                        tipoEvaluacion === opt.value
                          ? "border-violet-400 bg-violet-50 text-violet-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="tipo_evaluacion"
                        value={opt.value}
                        checked={tipoEvaluacion === opt.value}
                        onChange={(e) => setTipoEvaluacion(e.target.value as TipoEvaluacion)}
                        className="accent-violet-600"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
              <InputField
                label="Fecha de Evaluación"
                type="date"
                value={fechaEvaluacion}
                onChange={setFechaEvaluacion}
              />
            </div>
          </SectionCard>

          {/* ─── Phase 1: Verificación Inicial ─── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ClipboardCheck className="w-5 h-5 text-violet-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Verificación Inicial — Aspectos a Evaluar
              </h2>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Marque con una &quot;X&quot; los criterios que cumple el facilitador.
            </p>

            <div className="space-y-3">
              {CRITERIA_SECTIONS.map((section) => {
                const collapsed = collapsedSections[section.key];
                const sectionData = faseInicial[section.key as keyof typeof faseInicial] as any;
                const selectedOption = sectionData?.opcion;
                const selectedOptions: string[] = sectionData?.opciones || [];
                const sectionPoints = section.multi
                  ? selectedOptions.reduce(
                      (sum, key) =>
                        sum + (section.options.find((o) => o.key === key)?.puntos ?? 0),
                      0,
                    )
                  : section.options.find((o) => o.key === selectedOption)?.puntos ?? 0;

                return (
                  <div
                    key={section.key}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => toggleSection(section.key)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {collapsed ? (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                        <span className="text-sm font-semibold text-gray-900">
                          {section.title}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-violet-600">
                        {sectionPoints} pts
                      </span>
                    </button>

                    {!collapsed && (
                      <div className="p-4">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-2 pr-2 text-xs font-semibold text-gray-500">
                                Criterio
                              </th>
                              <th className="text-center py-2 px-2 text-xs font-semibold text-gray-500 w-20">
                                Cumple
                              </th>
                              <th className="text-center py-2 px-2 text-xs font-semibold text-gray-500 w-16">
                                Ptos.
                              </th>
                              <th className="text-center py-2 px-2 text-xs font-semibold text-gray-500 w-16">
                                %B
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {section.options.map((opt) => {
                              const isChecked = section.multi
                                ? selectedOptions.includes(opt.key)
                                : selectedOption === opt.key;
                              return (
                                <tr key={opt.key} className="border-b border-gray-100">
                                  <td className="py-2 pr-2 text-gray-700">
                                    {opt.label}
                                  </td>
                                  <td className="text-center py-2 px-2">
                                    <input
                                      type={section.multi ? "checkbox" : "radio"}
                                      name={`section_${section.key}`}
                                      checked={isChecked}
                                      onChange={(e) => {
                                        if (section.multi) {
                                          setMultiOption(section.key, opt.key, e.target.checked);
                                        } else {
                                          setSingleOption(section.key, opt.key);
                                        }
                                      }}
                                      className="w-4 h-4 accent-violet-600"
                                    />
                                  </td>
                                  <td className="text-center py-2 px-2 text-gray-600">
                                    {opt.puntos}
                                  </td>
                                  <td className="text-center py-2 px-2 text-gray-600">
                                    {opt.pct ?? "—"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        <div className="mt-3">
                          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                            Observaciones
                          </label>
                          <textarea
                            value={sectionData?.observacion || ""}
                            onChange={(e) =>
                              setSectionObservacion(section.key, e.target.value)
                            }
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                            placeholder="Observaciones de esta sección..."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Total + Classification */}
            <div className="mt-4 p-4 bg-violet-50 border border-violet-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-900">
                  TOTAL (Verificación Inicial)
                </span>
                <span className="text-2xl font-bold text-violet-700">
                  {puntajeTotal.toFixed(1)} pts
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Clasificación:</span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${condicionBadge.cls}`}
                >
                  <condicionBadge.icon className="w-3 h-3" />
                  {condicionBadge.label}
                </span>
              </div>
            </div>

            {/* Classification table */}
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Rango</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Resultado</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {CLASIFICACION_INICIAL.map((row) => (
                    <tr
                      key={row.rango}
                      className={`border-t border-gray-100 ${
                        condicionInicial ===
                        (row.resultado === "APROBADO"
                          ? "aprobado"
                          : row.resultado === "APROBADO BAJO SUPERVISIÓN"
                            ? "aprobado_supervision"
                            : "no_aprobado")
                          ? "bg-violet-50"
                          : ""
                      }`}
                    >
                      <td className="px-3 py-2 text-gray-700">{row.rango}</td>
                      <td className="px-3 py-2 font-semibold text-gray-900">{row.resultado}</td>
                      <td className="px-3 py-2 text-gray-600">{row.descripcion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Observaciones generales */}
            <div className="mt-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                Observaciones de la Verificación Inicial
              </label>
              <textarea
                value={observacionesInicial}
                onChange={(e) => setObservacionesInicial(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="Observaciones generales..."
              />
            </div>
          </div>

          {/* ─── Phase 2: Seguimiento ─── */}
          {tipoEvaluacion === "seguimiento" && (
            <div className="border-2 border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <ClipboardCheck className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Evaluación de Seguimiento
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <NumberInputField
                  label="Documentación Inicial (40%)"
                  value={docsInicialesPct}
                  onChange={setDocsInicialesPct}
                  step={0.01}
                  min={0}
                  max={1}
                  hint="Valor decimal (0-1)"
                />
                <NumberInputField
                  label="Encuestas de Satisfacción (40%)"
                  value={encuestasPct}
                  onChange={setEncuestasPct}
                  step={0.01}
                  min={0}
                  max={1}
                  hint="Valor decimal (0-1)"
                />
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                    Gestión de Actividades (20%)
                  </label>
                  <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm text-gray-700">
                    {(gestionPct * 100).toFixed(1)}% (auto)
                  </div>
                </div>
              </div>

              {/* Gestión items */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Gestión de Actividades y Compromiso (escala 1-5)
                </h3>
                <p className="text-xs text-gray-500 mb-3">
                  1 = Malo / 2 = Poco aceptable / 3 = Bueno / 4 = Muy bueno / 5 = Excelente
                </p>
                <div className="space-y-2">
                  {GESTION_ITEMS.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-2 border border-gray-100 rounded-md"
                    >
                      <span className="flex-1 text-sm text-gray-700">{item.label}</span>
                      <select
                        value={gestionItems[i] || 0}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setGestionItems((p) => p.map((v, idx) => (idx === i ? val : v)));
                        }}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {[0, 1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-end">
                  <span className="text-sm font-semibold text-gray-900">
                    Total: {gestionItems.reduce((s, v) => s + v, 0)} / 30
                  </span>
                </div>
              </div>

              {/* Resultados finales */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">
                    TOTAL de Evaluación de Seguimiento
                  </span>
                  <span className="text-2xl font-bold text-blue-700">
                    {(seguimientoTotal * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              <TextAreaField label="Observaciones" value={segObservaciones} onChange={setSegObservaciones} />
              <TextAreaField label="Oportunidades de Mejora" value={segOportunidades} onChange={setSegOportunidades} />
              <TextAreaField label="Metodologías Complementarias" value={segMetodologias} onChange={setSegMetodologias} />
            </div>
          )}

          {/* ─── Phase 3: Reevaluación ─── */}
          {tipoEvaluacion === "reevaluacion" && (
            <div className="border-2 border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <ClipboardCheck className="w-5 h-5 text-amber-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Reevaluación del Facilitador
                </h2>
              </div>

              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Componente</th>
                      {reevaluacionOsis.map((_, i) => (
                        <th key={i} className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                          N° OSI
                        </th>
                      ))}
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Resultado</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* OSI number row */}
                    <tr className="border-t border-gray-100">
                      <td className="px-3 py-2 text-xs font-semibold text-gray-500">N° OSI</td>
                      {reevaluacionOsis.map((o, i) => (
                        <td key={i} className="px-3 py-2">
                          <input
                            type="text"
                            value={o.nro_osi}
                            onChange={(e) => updateReevaluacionOsi(i, "nro_osi", e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                            placeholder="OSI-XXX"
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2"></td>
                    </tr>
                    {/* Docs row */}
                    <tr className="border-t border-gray-100">
                      <td className="px-3 py-2 text-xs text-gray-600">Documentación Inicial (40%)</td>
                      {reevaluacionOsis.map((o, i) => (
                        <td key={i} className="px-3 py-2">
                          <input
                            type="number"
                            step={0.01}
                            min={0}
                            max={1}
                            value={o.docs}
                            onChange={(e) => updateReevaluacionOsi(i, "docs", parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2 text-xs text-gray-400">—</td>
                      <td className="px-3 py-2"></td>
                    </tr>
                    {/* Encuestas row */}
                    <tr className="border-t border-gray-100">
                      <td className="px-3 py-2 text-xs text-gray-600">Encuestas de Satisfacción (40%)</td>
                      {reevaluacionOsis.map((o, i) => (
                        <td key={i} className="px-3 py-2">
                          <input
                            type="number"
                            step={0.01}
                            min={0}
                            max={1}
                            value={o.encuestas}
                            onChange={(e) => updateReevaluacionOsi(i, "encuestas", parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2 text-xs text-gray-400">—</td>
                      <td className="px-3 py-2"></td>
                    </tr>
                    {/* Gestión row */}
                    <tr className="border-t border-gray-100">
                      <td className="px-3 py-2 text-xs text-gray-600">Gestión de Actividades (20%)</td>
                      {reevaluacionOsis.map((o, i) => (
                        <td key={i} className="px-3 py-2">
                          <input
                            type="number"
                            step={0.01}
                            min={0}
                            max={1}
                            value={o.gestion}
                            onChange={(e) => updateReevaluacionOsi(i, "gestion", parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2 text-xs text-gray-400">—</td>
                      <td className="px-3 py-2"></td>
                    </tr>
                    {/* Total row */}
                    <tr className="border-t border-gray-200 bg-amber-50">
                      <td className="px-3 py-2 text-xs font-bold text-gray-900">TOTAL</td>
                      {reevaluacionOsis.map((o, i) => (
                        <td key={i} className="px-3 py-2 text-xs font-bold text-amber-700">
                          {((o.total || 0) * 100).toFixed(1)}%
                        </td>
                      ))}
                      <td className="px-3 py-2 text-xs font-bold text-amber-700">
                        Prom: {(reevaluacionAvg * 100).toFixed(1)}%
                      </td>
                      <td className="px-3 py-2"></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={() =>
                    setReevaluacionOsis((p) => [
                      ...p,
                      { nro_osi: "", docs: 0, encuestas: 0, gestion: 0, total: 0 },
                    ])
                  }
                  disabled={reevaluacionOsis.length >= 3}
                  className="text-xs px-3 py-1.5 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  + Agregar OSI
                </button>
                {reevaluacionOsis.length > 1 && (
                  <button
                    onClick={() =>
                      setReevaluacionOsis((p) => p.slice(0, -1))
                    }
                    className="text-xs px-3 py-1.5 border border-red-200 rounded-md text-red-600 hover:bg-red-50"
                  >
                    − Quitar OSI
                  </button>
                )}
              </div>

              {/* Classification */}
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-xs border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Rango</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Resultado</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Descripción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CLASIFICACION_REEVALUACION.map((row) => (
                      <tr
                        key={row.rango}
                        className={`border-t border-gray-100 ${
                          (reevaluacionAvg >= 0.8 && row.resultado === "ACEPTABLE") ||
                          (reevaluacionAvg < 0.8 && row.resultado === "NO ACEPTABLE")
                            ? "bg-amber-50"
                            : ""
                        }`}
                      >
                        <td className="px-3 py-2 text-gray-700">{row.rango}</td>
                        <td className="px-3 py-2 font-semibold text-gray-900">{row.resultado}</td>
                        <td className="px-3 py-2 text-gray-600">{row.descripcion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  Condición del Facilitador después de la Reevaluación
                </label>
                <select
                  value={reevaluacionCondicion}
                  onChange={(e) => setReevaluacionCondicion(e.target.value)}
                  className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="aprobado">APROBADO</option>
                  <option value="aprobado_supervision">APROBADO BAJO SUPERVISIÓN</option>
                  <option value="no_aprobado">NO APROBADO</option>
                </select>
              </div>
            </div>
          )}

          {/* ─── Action buttons ─── */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {editId ? "Actualizar" : "Guardar"}
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm disabled:opacity-50"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              Descargar PDF
            </button>
          </div>
        </div>

        {/* Sidebar: History */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <EvaluacionHistory
            facilitadorId={facilitadorId}
            history={history}
            currentEvalId={editId ? parseInt(editId) : undefined}
          />
        </div>
      </div>
    </div>
  );
}

// ─── UI helper components ────────────────────────────────────────────────────

function SectionCard({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-900">{title}</span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

function Field({
  label,
  value,
  readOnly,
}: {
  label: string;
  value: string;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
        {label}
      </label>
      <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm text-gray-700">
        {value}
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
      />
    </div>
  );
}

function NumberInputField({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
        {label}
      </label>
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
