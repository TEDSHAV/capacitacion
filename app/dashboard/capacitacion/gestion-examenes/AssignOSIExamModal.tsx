"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Layers,
  Save,
  Loader2,
  FileCheck2,
} from "lucide-react";
import type { EvaluacionPlantilla, EvaluacionPregunta, OSIEvaluacion } from "@/types/evaluacion";
import {
  getOSIEvaluacion,
  assignEvaluacionToOSI,
  removeOSIEvaluacion,
  getEvaluacionPlantilla,
} from "@/app/actions/evaluaciones-cursos";

interface AssignOSIExamModalProps {
  osi: {
    id_osi: number;
    nro_osi: string;
    servicio: string;
    nombre_empresa: string;
  };
  templates: EvaluacionPlantilla[];
  onClose: () => void;
  onSaved: () => void;
}

export default function AssignOSIExamModal({
  osi,
  templates,
  onClose,
  onSaved,
}: AssignOSIExamModalProps) {
  const [loading, setLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [titulo, setTitulo] = useState(`Evaluación: ${osi.servicio || "Curso"}`);
  const [notaAprobatoria, setNotaAprobatoria] = useState<number>(14);
  const [preguntas, setPreguntas] = useState<EvaluacionPregunta[]>([]);
  const [existingEvaluation, setExistingEvaluation] = useState<OSIEvaluacion | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing OSI evaluation if any
  useEffect(() => {
    let cancelled = false;
    getOSIEvaluacion(osi.id_osi)
      .then((res) => {
        if (cancelled) return;
        if (res.data) {
          setExistingEvaluation(res.data);
          setTitulo(res.data.titulo);
          setNotaAprobatoria(res.data.nota_aprobatoria);
          setPreguntas(res.data.preguntas || []);
          if (res.data.plantilla_id) {
            setSelectedTemplateId(String(res.data.plantilla_id));
          }
        }
      })
      .catch((err) => console.error("Error loading OSI evaluation:", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [osi.id_osi, osi.servicio]);

  // Load questions when template changes
  const handleTemplateSelect = async (tplIdStr: string) => {
    setSelectedTemplateId(tplIdStr);
    if (!tplIdStr) return;
    const tplId = parseInt(tplIdStr, 10);
    const res = await getEvaluacionPlantilla(tplId);
    if (res.data) {
      setTitulo(res.data.titulo);
      setNotaAprobatoria(res.data.nota_aprobatoria);
      setPreguntas(res.data.preguntas || []);
    }
  };

  const totalPoints = preguntas.reduce((sum, q) => sum + (Number(q.puntos) || 0), 0);
  const isPointsBalanced = Math.abs(totalPoints - 20) < 0.01;

  const handleAddQuestion = () => {
    const nextNum = preguntas.length + 1;
    const newQ: EvaluacionPregunta = {
      id: `q_${Date.now()}_${nextNum}`,
      enunciado: "",
      tipo: "single_choice",
      puntos: 2,
      orden: nextNum,
      opciones: [
        { id: `opt_${nextNum}_1`, texto: "", es_correcta: true },
        { id: `opt_${nextNum}_2`, texto: "", es_correcta: false },
        { id: `opt_${nextNum}_3`, texto: "", es_correcta: false },
      ],
    };
    setPreguntas([...preguntas, newQ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    setPreguntas(preguntas.filter((_, i) => i !== idx));
  };

  const handleUpdateQuestion = (idx: number, field: keyof EvaluacionPregunta, val: any) => {
    setPreguntas(preguntas.map((q, i) => (i === idx ? { ...q, [field]: val } : q)));
  };

  const handleOptionTextChange = (qIdx: number, optIdx: number, text: string) => {
    setPreguntas(
      preguntas.map((q, i) => {
        if (i !== qIdx) return q;
        return {
          ...q,
          opciones: q.opciones.map((o, oi) => (oi === optIdx ? { ...o, texto: text } : o)),
        };
      }),
    );
  };

  const handleSetCorrectOption = (qIdx: number, optIdx: number) => {
    setPreguntas(
      preguntas.map((q, i) => {
        if (i !== qIdx) return q;
        return {
          ...q,
          opciones: q.opciones.map((o, oi) => ({
            ...o,
            es_correcta: oi === optIdx,
          })),
        };
      }),
    );
  };

  const handleSave = async () => {
    setError(null);
    if (!titulo.trim()) {
      setError("El título de la evaluación es obligatorio.");
      return;
    }
    if (preguntas.length === 0) {
      setError("Debe agregar al menos una pregunta a la evaluación.");
      return;
    }

    setSaving(true);
    try {
      const res = await assignEvaluacionToOSI({
        id_osi: osi.id_osi,
        plantilla_id: selectedTemplateId ? parseInt(selectedTemplateId, 10) : null,
        titulo: titulo.trim(),
        nota_aprobatoria: notaAprobatoria,
        preguntas,
      });

      if (res.error) {
        setError(res.error);
      } else {
        onSaved();
      }
    } catch (err) {
      setError("Error al asignar la evaluación.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm("¿Está seguro de remover la evaluación de esta OSI? Los participantes ya no podrán realizar el examen digital.")) {
      return;
    }
    setSaving(true);
    try {
      const res = await removeOSIEvaluacion(osi.id_osi);
      if (res.error) {
        setError(res.error);
      } else {
        onSaved();
      }
    } catch (err) {
      setError("Error al eliminar la evaluación.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold shadow-sm">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded">
                  OSI: {osi.nro_osi}
                </span>
                <span className="text-xs text-gray-500 truncate max-w-xs">{osi.nombre_empresa}</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mt-0.5">
                {existingEvaluation ? "Editar Evaluación de la OSI" : "Asignar Evaluación a la OSI"}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Template Picker */}
          <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                Cargar desde Plantilla Maestra
              </label>
              {selectedTemplateId && (
                <span className="text-[11px] text-blue-700 font-medium">
                  Las preguntas se copian a esta OSI y pueden personalizarse independientemente.
                </span>
              )}
            </div>
            <select
              value={selectedTemplateId}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              className="w-full text-xs sm:text-sm border border-blue-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">-- Seleccionar una plantilla preconfigurada... --</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.titulo} ({t.preguntas_count || 0} preguntas) {t.curso_nombre ? `— ${t.curso_nombre}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Exam Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Título del Examen para esta OSI *
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="w-full text-xs sm:text-sm border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Nota Aprobatoria (0–20 pts)
              </label>
              <input
                type="number"
                min="1"
                max="20"
                step="0.5"
                value={notaAprobatoria}
                onChange={(e) => setNotaAprobatoria(Number(e.target.value))}
                className="w-full text-xs sm:text-sm border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Questions Header */}
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Preguntas de la Evaluación ({preguntas.length})
              </h3>
              <p className="text-xs text-gray-500">
                Preguntas que responderán los participantes al escanear el QR o en el Kiosk del aula.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 border ${
                  isPointsBalanced
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-amber-50 text-amber-800 border-amber-200"
                }`}
              >
                <span>Total: {totalPoints.toFixed(1)} / 20 pts</span>
                {isPointsBalanced ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                )}
              </div>

              <Button
                type="button"
                onClick={handleAddQuestion}
                size="sm"
                className="bg-teal-600 hover:bg-teal-700 text-xs h-8"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Agregar Pregunta
              </Button>
            </div>
          </div>

          {/* Questions List */}
          {preguntas.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
              <p className="text-xs text-gray-500 mb-3">
                No hay preguntas configuradas para esta evaluación. Selecciona una plantilla arriba o agrega preguntas manualmente.
              </p>
              <Button type="button" onClick={handleAddQuestion} size="sm" variant="outline" className="text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" />
                Agregar primera pregunta
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {preguntas.map((q, qIdx) => (
                <div
                  key={q.id || qIdx}
                  className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0">
                        {qIdx + 1}
                      </span>
                      <span className="text-xs font-semibold text-gray-700">
                        Pregunta #{qIdx + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <span>Valor:</span>
                        <input
                          type="number"
                          min="0.5"
                          max="20"
                          step="0.5"
                          value={q.puntos}
                          onChange={(e) =>
                            handleUpdateQuestion(qIdx, "puntos", Number(e.target.value))
                          }
                          className="w-14 text-center border border-gray-300 rounded px-1.5 py-0.5 text-xs font-bold"
                        />
                        <span>pts</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(qIdx)}
                        className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={2}
                    value={q.enunciado}
                    onChange={(e) => handleUpdateQuestion(qIdx, "enunciado", e.target.value)}
                    placeholder="Escriba el enunciado de la pregunta aquí..."
                    className="w-full text-xs sm:text-sm border border-gray-300 rounded-md p-2 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />

                  <div className="space-y-2">
                    {q.opciones.map((opt, optIdx) => (
                      <div
                        key={opt.id || optIdx}
                        className={`flex items-center gap-2 p-2 rounded-md border text-xs ${
                          opt.es_correcta
                            ? "bg-emerald-50/60 border-emerald-300"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                          <input
                            type="radio"
                            name={`osi_correct_${qIdx}`}
                            checked={opt.es_correcta}
                            onChange={() => handleSetCorrectOption(qIdx, optIdx)}
                            className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                          />
                          <span className="font-bold text-gray-700 w-5">
                            {String.fromCharCode(65 + optIdx)})
                          </span>
                        </label>

                        <input
                          type="text"
                          value={opt.texto}
                          onChange={(e) =>
                            handleOptionTextChange(qIdx, optIdx, e.target.value)
                          }
                          placeholder={`Opción ${String.fromCharCode(65 + optIdx)}...`}
                          className="flex-1 border border-gray-200 rounded px-2.5 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />

                        {opt.es_correcta && (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded shrink-0">
                            Correcta
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
          <div>
            {existingEvaluation && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleRemove}
                disabled={saving}
                className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Desactivar evaluación
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="text-xs">
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-4"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  Guardar y Activar para esta OSI
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

