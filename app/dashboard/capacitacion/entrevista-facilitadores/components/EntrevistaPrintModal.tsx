"use client";

import React from "react";
import { X, Printer } from "lucide-react";
import type { FacilitadorEntrevista } from "@/types/entrevistas-facilitadores";
import { toTitleCase } from "@/utils/string-utils";

interface EntrevistaPrintModalProps {
  entrevista: FacilitadorEntrevista | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EntrevistaPrintModal({
  entrevista,
  isOpen,
  onClose,
}: EntrevistaPrintModalProps) {
  if (!isOpen || !entrevista) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      const [y, m, d] = dateStr.split("-");
      return `${d}/${m}/${y}`;
    } catch {
      return dateStr;
    }
  };

  const ultimoCursoLabel = (val?: string | null) => {
    switch (val) {
      case "6_meses":
        return "6 MESES";
      case "12_meses":
        return "12 MESES";
      case "mas_12_meses":
        return "+ DE 12 MESES";
      default:
        return "—";
    }
  };

  const audiovisualLabel = (val?: string | null) => {
    switch (val) {
      case "totalmente":
        return "TOTALMENTE";
      case "con_limitacion":
        return "CON LIMITACIÓN";
      case "en_aprendizaje":
        return "EN APRENDIZAJE";
      case "no_se_manejarlos":
        return "NO SE MANEJARLOS";
      default:
        return "—";
    }
  };

  const caracteristicaLabel = (val?: string | null) => {
    switch (val) {
      case "empatia":
        return "a) Empatía";
      case "introversion":
        return "b) Introversión";
      case "autoritarismo":
        return "c) Autoritarismo";
      case "indiferencia":
        return "d) Indiferencia";
      default:
        return val || "—";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      {/* Container */}
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Modal Toolbar (hidden when printing) */}
        <div className="print:hidden flex items-center justify-between px-6 py-4 bg-gray-100 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-gray-700" />
            <h2 className="font-semibold text-gray-800">
              Vista de Impresión — Formato de Entrevista Facilitador
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Imprimir / Guardar PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Area */}
        <div className="p-8 overflow-y-auto print:p-0 print:overflow-visible text-gray-900 bg-white font-sans text-xs">
          {/* Header */}
          <div className="border border-gray-800 mb-4">
            <div className="p-2 text-center border-b border-gray-800 bg-gray-100 font-bold uppercase tracking-wider text-sm">
              Formato de Entrevista Facilitador
            </div>

            {/* Aspirante Data */}
            <div className="bg-gray-200 px-3 py-1 font-bold uppercase border-b border-gray-800">
              Datos del Aspirante
            </div>
            <div className="grid grid-cols-12 border-b border-gray-800 divide-x divide-gray-800">
              <div className="col-span-8 p-2">
                <span className="font-bold">NOMBRE Y APELLIDO: </span>
                <span className="uppercase">{entrevista.nombre_apellido}</span>
              </div>
              <div className="col-span-4 p-2">
                <span className="font-bold">C.I. NRO: </span>
                <span>{entrevista.cedula || "—"}</span>
              </div>
            </div>

            <div className="grid grid-cols-12 border-b border-gray-800 divide-x divide-gray-800">
              <div className="col-span-6 p-2">
                <span className="font-bold">DIRECCIÓN: </span>
                <span>{entrevista.direccion || "—"}</span>
              </div>
              <div className="col-span-3 p-2">
                <span className="font-bold">TELÉFONO: </span>
                <span>{entrevista.telefono || "—"}</span>
              </div>
              <div className="col-span-3 p-2">
                <span className="font-bold">EMAIL: </span>
                <span>{entrevista.email || "—"}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 border-b border-gray-800 divide-x divide-gray-800 p-2">
              <div>
                <span className="font-bold">POSEE VEHÍCULO: </span>
                <span>{entrevista.posee_vehiculo ? "( X ) SI   (   ) NO" : "(   ) SI   ( X ) NO"}</span>
              </div>
              <div>
                <span className="font-bold">POSEE LAPTOP: </span>
                <span>{entrevista.posee_laptop ? "( X ) SI   (   ) NO" : "(   ) SI   ( X ) NO"}</span>
              </div>
              <div>
                <span className="font-bold">DISPONIBILIDAD DE VIAJAR: </span>
                <span>{entrevista.disponibilidad_viajar ? "( X ) SI   (   ) NO" : "(   ) SI   ( X ) NO"}</span>
              </div>
            </div>

            {/* 1. Nivel Educativo */}
            <div className="bg-gray-200 px-3 py-1 font-bold uppercase border-b border-gray-800">
              1. Nivel Educativo (Describa el área al cual aplique)
            </div>
            <div className="p-2 border-b border-gray-800">
              <span className="font-bold">NIVEL TÉCNICO: </span>
              <span>{entrevista.nivel_tecnico || "—"}</span>
            </div>
            <div className="p-2 border-b border-gray-800">
              <span className="font-bold">UNIVERSITARIO: </span>
              <span>{entrevista.universitario || "—"}</span>
            </div>
            <div className="p-2 border-b border-gray-800">
              <span className="font-bold">POSEE ESPECIALIZACIÓN (Detalle): </span>
              <span>{entrevista.posee_especializacion || "—"}</span>
            </div>
            <div className="p-2 border-b border-gray-800">
              <div className="font-bold mb-1">
                ¿CUÁNDO REALIZÓ SU ÚLTIMO CURSO, TALLER, SEMINARIO O ACTUALIZACIÓN SOBRE EL ÁREA QUE SE DESENVUELVE COMO FACILITADOR? QUE TENGA SOPORTE FORMAL Y FÍSICO DEL MISMO:
              </div>
              <div className="mb-1">
                <span>{ultimoCursoLabel(entrevista.ultimo_curso_tiempo)}</span>
              </div>
              <div>
                <span className="font-bold">DESCRIBA: </span>
                <span>{entrevista.ultimo_curso_descripcion || "—"}</span>
              </div>
            </div>
            <div className="p-2 border-b border-gray-800">
              <div className="font-bold mb-1">
                ¿CÓMO CONSIDERA QUE MANEJA LAS HERRAMIENTAS AUDIOVISUALES QUE FORMAN PARTE DE UNA CAPACITACIÓN, LAPTOP, VIDEO BEAM, CORNETAS, TELÉFONO, ENTRE OTROS.?
              </div>
              <div>{audiovisualLabel(entrevista.manejo_herramientas_audiovisuales)}</div>
            </div>

            {/* Documentación Legal */}
            <div className="bg-gray-200 px-3 py-1 font-bold uppercase border-b border-gray-800">
              Documentación Legal Vigente con la que cuente de manera digital y física / Soportes
            </div>
            <div className="grid grid-cols-2 divide-x divide-gray-800 border-b border-gray-800">
              <div className="divide-y divide-gray-400">
                <div className="flex justify-between p-1.5">
                  <span>RESUMEN CURRICULAR</span>
                  <span className="font-bold">{entrevista.doc_resumen_curricular ? "( X ) SI  (   ) NO" : "(   ) SI  ( X ) NO"}</span>
                </div>
                <div className="flex justify-between p-1.5">
                  <span>SOPORTES DE RESUMEN CURRICULAR</span>
                  <span className="font-bold">{entrevista.doc_soportes_resumen_curricular ? "( X ) SI  (   ) NO" : "(   ) SI  ( X ) NO"}</span>
                </div>
                <div className="flex justify-between p-1.5">
                  <span>REGISTRO ANTE EL INPSASEL</span>
                  <span className="font-bold">{entrevista.doc_registro_inpsasel ? "( X ) SI  (   ) NO" : "(   ) SI  ( X ) NO"}</span>
                </div>
                <div className="flex justify-between p-1.5">
                  <span>TÍTULO UNIVERSITARIO O FONDO NEGRO</span>
                  <span className="font-bold">{entrevista.doc_titulo_universitario ? "( X ) SI  (   ) NO" : "(   ) SI  ( X ) NO"}</span>
                </div>
                <div className="flex justify-between p-1.5">
                  <span>POSEE FORMACIÓN DOCENTE CERTIFICADA</span>
                  <span className="font-bold">{entrevista.doc_formacion_docente ? "( X ) SI  (   ) NO" : "(   ) SI  ( X ) NO"}</span>
                </div>
              </div>
              <div className="divide-y divide-gray-400">
                <div className="flex justify-between p-1.5">
                  <span>CÉDULA DE IDENTIDAD</span>
                  <span className="font-bold">{entrevista.doc_cedula_identidad ? "( X ) SI  (   ) NO" : "(   ) SI  ( X ) NO"}</span>
                </div>
                <div className="flex justify-between p-1.5">
                  <span>RIF ACTUALIZADO</span>
                  <span className="font-bold">{entrevista.doc_rif_actualizado ? "( X ) SI  (   ) NO" : "(   ) SI  ( X ) NO"}</span>
                </div>
                <div className="flex justify-between p-1.5">
                  <span>FACTURA FISCAL</span>
                  <span className="font-bold">{entrevista.doc_factura_fiscal ? "( X ) SI  (   ) NO" : "(   ) SI  ( X ) NO"}</span>
                </div>
                <div className="flex justify-between p-1.5">
                  <span>ÚLTIMA DECLARACIÓN DE ISLR</span>
                  <span className="font-bold">{entrevista.doc_declaracion_islr ? "( X ) SI  (   ) NO" : "(   ) SI  ( X ) NO"}</span>
                </div>
                <div className="flex justify-between p-1.5">
                  <span>POSEE LAPTOP</span>
                  <span className="font-bold">{entrevista.doc_posee_laptop ? "( X ) SI  (   ) NO" : "(   ) SI  ( X ) NO"}</span>
                </div>
              </div>
            </div>

            {/* Preguntas de desenvolvimiento */}
            <div className="bg-gray-200 px-3 py-1 font-bold uppercase border-b border-gray-800">
              Preguntas de Desenvolvimiento y Competencias
            </div>
            <div className="grid grid-cols-2 divide-x divide-gray-800 border-b border-gray-800">
              <div className="p-2">
                <div className="font-bold mb-1">NOMBRE AL MENOS 2 RETOS QUE HA TENIDO QUE ENFRENTAR COMO FACILITADOR:</div>
                <p className="whitespace-pre-wrap text-gray-700">{entrevista.retos_facilitador || "—"}</p>
              </div>
              <div className="p-2">
                <div className="font-bold mb-1">NOMBRE AL MENOS 2 LOGROS QUE HA ALCANZADO EN ALGUNA ACTIVIDAD DE FORMACIÓN:</div>
                <p className="whitespace-pre-wrap text-gray-700">{entrevista.logros_formacion || "—"}</p>
              </div>
            </div>

            <div className="p-2 border-b border-gray-800">
              <div className="font-bold mb-1">
                ¿CUÁL DE LAS SIGUIENTES CARACTERÍSTICAS ES ESENCIAL PARA UN FACILITADOR QUE TRABAJA CON PÚBLICO OBJETIVO HETEROGÉNEOS?
              </div>
              <p className="text-gray-800 font-medium">{caracteristicaLabel(entrevista.caracteristica_esencial)}</p>
            </div>

            <div className="p-2 border-b border-gray-800">
              <div className="font-bold mb-1">DA UN EJEMPLO DE CUÁNDO HAS PODIDO USAR TUS HABILIDADES DE LIDERAZGO:</div>
              <p className="whitespace-pre-wrap text-gray-700">{entrevista.ejemplo_liderazgo || "—"}</p>
            </div>

            <div className="grid grid-cols-2 divide-x divide-gray-800 border-b border-gray-800">
              <div className="p-2">
                <div className="font-bold mb-1">LISTA 5 FORTALEZAS:</div>
                <p className="whitespace-pre-wrap text-gray-700">{entrevista.fortalezas || "—"}</p>
              </div>
              <div className="p-2">
                <div className="font-bold mb-1">LISTA 5 DEBILIDADES:</div>
                <p className="whitespace-pre-wrap text-gray-700">{entrevista.debilidades || "—"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-gray-800 border-b border-gray-800">
              <div className="p-2">
                <div className="font-bold mb-1">¿POR QUÉ QUIERES TRABAJAR AQUÍ?:</div>
                <p className="whitespace-pre-wrap text-gray-700">{entrevista.motivo_trabajar_aqui || "—"}</p>
              </div>
              <div className="p-2">
                <div className="font-bold mb-1">¿POR QUÉ DEBEMOS CONTRATARTE?:</div>
                <p className="whitespace-pre-wrap text-gray-700">{entrevista.por_que_contratarte || "—"}</p>
              </div>
            </div>

            <div className="p-2 border-b border-gray-800">
              <div className="font-bold mb-1">
                CUÁLES TEMAS DE LOS QUE FORMAN PARTE DEL PORTAFOLIO CONSIDERAS TENER LAS CAPACIDADES PARA IMPARTIR:
              </div>
              {Array.isArray(entrevista.temas_capacidades) && entrevista.temas_capacidades.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-1">
                  {entrevista.temas_capacidades.map((tema, i) => (
                    <span key={i} className="inline-block bg-gray-100 border border-gray-300 px-2 py-0.5 rounded text-xs">
                      {tema}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">No especificado</p>
              )}
            </div>

            {/* Evaluación de la Entrevista */}
            <div className="bg-gray-200 px-3 py-1 font-bold uppercase border-b border-gray-800">
              Evaluación de la Entrevista
            </div>
            <div className="grid grid-cols-12 border-b border-gray-800 divide-x divide-gray-800">
              <div className="col-span-6 p-2">
                <span className="font-bold">FECHA DE ENTREVISTA: </span>
                <span>{formatDate(entrevista.fecha_entrevista)}</span>
              </div>
              <div className="col-span-6 p-2">
                <span className="font-bold">ENTREVISTADO POR: </span>
                <span>{entrevista.entrevistado_por || "—"}</span>
              </div>
            </div>

            {/* Checklist items */}
            <div className="border-b border-gray-800">
              <table className="w-full text-left divide-y divide-gray-400">
                <thead className="bg-gray-100 font-bold">
                  <tr>
                    <th className="p-1.5 w-10 text-center">N°</th>
                    <th className="p-1.5">Criterio de Evaluación</th>
                    <th className="p-1.5 w-36 text-center">Resultado</th>
                    <th className="p-1.5">Observación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {(entrevista.evaluacion_items || []).map((it) => (
                    <tr key={it.item_nro}>
                      <td className="p-1.5 text-center font-bold">{it.item_nro}</td>
                      <td className="p-1.5">{it.criterio}</td>
                      <td className="p-1.5 text-center font-medium">
                        {it.cumplimiento === "cumple"
                          ? "Cumple"
                          : it.cumplimiento === "cumple_parcial"
                          ? "Cumple Parcial"
                          : it.cumplimiento === "no_cumple"
                          ? "No Cumple"
                          : "—"}
                      </td>
                      <td className="p-1.5 text-gray-700">{it.observacion || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Observaciones generales y estatus */}
            <div className="p-2 border-b border-gray-800">
              <div className="font-bold mb-1">OBSERVACIONES GENERALES:</div>
              <p className="whitespace-pre-wrap text-gray-800 min-h-[40px]">
                {entrevista.observaciones || "Sin observaciones adicionales."}
              </p>
            </div>

            <div className="grid grid-cols-2 divide-x divide-gray-800 p-2">
              <div>
                <span className="font-bold text-sm">ESTATUS FINAL: </span>
                <span className="font-bold uppercase text-sm ml-2">
                  {entrevista.estatus === "aprobado"
                    ? "APROBADO"
                    : entrevista.estatus === "rechazado"
                    ? "RECHAZADO"
                    : "PENDIENTE"}
                </span>
                {entrevista.facilitador_id && (
                  <span className="ml-2 text-xs text-blue-700 font-medium">
                    (Promovido a Facilitador ID #{entrevista.facilitador_id})
                  </span>
                )}
              </div>
              <div className="flex justify-between items-end px-4">
                <div className="text-center w-40 border-t border-gray-800 pt-1 mt-6">
                  Firma del Entrevistador
                </div>
                <div className="text-center w-40 border-t border-gray-800 pt-1 mt-6">
                  Firma del Aspirante
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
