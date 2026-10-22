"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, X, Loader2 } from "lucide-react";
import type { FacilitadorEntrevista } from "@/types/entrevistas-facilitadores";
import { toTitleCase } from "@/utils/string-utils";

interface EntrevistaPrintViewProps {
  entrevista: FacilitadorEntrevista;
}

export function EntrevistaPrintView({ entrevista }: EntrevistaPrintViewProps) {
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-slate-200 text-gray-900">
      {/* Top Floating Toolbar (Hidden during print) */}
      <div className="print:hidden sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-300 shadow-sm px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/capacitacion/entrevista-facilitadores/${entrevista.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a la Entrevista
          </Link>
          <span className="text-gray-300">|</span>
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-tight">
              Formato de Entrevista — {toTitleCase(entrevista.nombre_apellido || "Aspirante")}
            </h1>
            <p className="text-[11px] text-gray-500">
              Vista oficial de impresión (2 páginas • Formato SHA de Venezuela)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handlePrint}
            disabled={isPrinting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isPrinting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            Imprimir / Guardar como PDF
          </button>
          <button
            type="button"
            onClick={() => window.close()}
            className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            title="Cerrar pestaña"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Embedded Print Styles for clean 2-page print without browser margin artifacts */}
      <style jsx global>{`
        @page {
          size: letter portrait;
          margin: 8mm 8mm 14mm 8mm;
        }

        @media print {
          html,
          body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            color: #111827 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print-container {
            padding: 0 !important;
            background: transparent !important;
          }

          .print-page-1 {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 10px 12px !important;
            border: 1.5px solid #111827 !important;
            background: #ffffff !important;
            box-sizing: border-box !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            break-after: page !important;
            page-break-after: always !important;
          }

          .print-page-2 {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 10px 12px !important;
            border: 1.5px solid #111827 !important;
            background: #ffffff !important;
            box-sizing: border-box !important;
            break-before: page !important;
            page-break-before: always !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .page-break-divider {
            display: none !important;
          }
        }
      `}</style>

      {/* Main Printable Document Area */}
      <div className="print-container max-w-[216mm] mx-auto py-6 px-4 print:p-0">
        <div id="entrevista-print-area" className="space-y-6 print:space-y-0">
          {/* ========================================================================= */}
          {/* PÁGINA 1: DATOS, NIVEL EDUCATIVO Y DOCUMENTACIÓN                         */}
          {/* ========================================================================= */}
          <div className="bg-white border border-gray-800 p-4 shadow-md print:shadow-none print-page-1 text-xs">
            {/* Header Box */}
            <div className="border-b border-gray-800 pb-2 mb-2.5">
              <div className="flex items-center justify-between">
                <div className="w-36 flex items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logo.png"
                    alt="SHA de Venezuela"
                    className="h-10 w-auto object-contain"
                  />
                </div>
                <div className="text-center flex-1 px-2">
                  <div className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                    SHA de Venezuela, C.A.
                  </div>
                  <div className="text-base font-bold uppercase tracking-wider text-gray-900">
                    Formato de Entrevista Facilitador
                  </div>
                </div>
                <div className="w-36 text-right text-[11px] font-mono text-gray-600">
                  <div>
                    <span className="font-bold">PÁGINA:</span> 1 de 2
                  </div>
                </div>
              </div>
            </div>

            {/* Main Document Table */}
            <div className="border border-gray-800">
              {/* ── DATOS DEL ASPIRANTE ──────────────────────────────────────────────── */}
              <div className="bg-gray-200 px-3 py-1 font-bold uppercase border-b border-gray-800 text-xs">
                Datos del Aspirante
              </div>

              <div className="grid grid-cols-12 border-b border-gray-800 divide-x divide-gray-800">
                <div className="col-span-8 p-2 flex items-end min-w-0">
                  <span className="font-bold shrink-0">NOMBRE Y APELLIDO:&nbsp;</span>
                  <span className="flex-1 border-b border-gray-400 pb-0.5 min-h-[16px] text-gray-800 uppercase font-medium truncate min-w-0">
                    {entrevista.nombre_apellido || ""}
                  </span>
                </div>
                <div className="col-span-4 p-2 flex items-end min-w-0">
                  <span className="font-bold shrink-0">C.I. NRO:&nbsp;</span>
                  <span className="flex-1 border-b border-gray-400 pb-0.5 min-h-[16px] text-gray-800 font-medium truncate min-w-0">
                    {entrevista.cedula || ""}
                  </span>
                </div>
              </div>

              {/* Responsive Row with Fixed Column Widths: Email gets 5 columns and truncate to never overflow */}
              <div className="grid grid-cols-12 border-b border-gray-800 divide-x divide-gray-800">
                <div className="col-span-4 p-2 flex items-end min-w-0">
                  <span className="font-bold shrink-0">DIRECCIÓN:&nbsp;</span>
                  <span
                    className="flex-1 border-b border-gray-400 pb-0.5 min-h-[16px] text-gray-800 font-medium truncate min-w-0"
                    title={entrevista.direccion || ""}
                  >
                    {entrevista.direccion || ""}
                  </span>
                </div>
                <div className="col-span-3 p-2 flex items-end min-w-0">
                  <span className="font-bold shrink-0">TELÉFONO:&nbsp;</span>
                  <span
                    className="flex-1 border-b border-gray-400 pb-0.5 min-h-[16px] text-gray-800 font-medium truncate min-w-0"
                    title={entrevista.telefono || ""}
                  >
                    {entrevista.telefono || ""}
                  </span>
                </div>
                <div className="col-span-5 p-2 flex items-end min-w-0 overflow-hidden">
                  <span className="font-bold shrink-0">EMAIL:&nbsp;</span>
                  <span
                    className="flex-1 border-b border-gray-400 pb-0.5 min-h-[16px] text-gray-800 font-medium text-[10.5px] leading-tight break-all min-w-0"
                    title={entrevista.email || ""}
                  >
                    {entrevista.email || ""}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-12 border-b border-gray-800 divide-x divide-gray-800 p-2 bg-gray-50/50 text-xs">
                <div className="col-span-4 flex items-center justify-between pr-2">
                  <span className="font-bold">POSEE VEHÍCULO:</span>
                  <span className="whitespace-nowrap font-medium">
                    {entrevista.posee_vehiculo ? "( X ) SI   (   ) NO" : "(   ) SI   (   ) NO"}
                  </span>
                </div>
                <div className="col-span-3 flex items-center justify-between px-2">
                  <span className="font-bold">POSEE LAPTOP:</span>
                  <span className="whitespace-nowrap font-medium">
                    {entrevista.posee_laptop ? "( X ) SI   (   ) NO" : "(   ) SI   (   ) NO"}
                  </span>
                </div>
                <div className="col-span-5 flex items-center justify-between pl-2">
                  <span className="font-bold">DISPONIBILIDAD DE VIAJAR:</span>
                  <span className="whitespace-nowrap font-medium">
                    {entrevista.disponibilidad_viajar ? "( X ) SI   (   ) NO" : "(   ) SI   (   ) NO"}
                  </span>
                </div>
              </div>

              {/* ── 1. NIVEL EDUCATIVO ──────────────────────────────────────────────── */}
              <div className="bg-gray-200 px-3 py-1 font-bold uppercase border-b border-gray-800 text-xs">
                1. Nivel Educativo (Describa el área al cual aplique)
              </div>

              <div className="p-2 border-b border-gray-800 flex items-end min-w-0">
                <span className="font-bold shrink-0">NIVEL TÉCNICO:&nbsp;</span>
                <span className="flex-1 border-b border-gray-400 pb-0.5 min-h-[16px] text-gray-800 font-medium truncate min-w-0">
                  {entrevista.nivel_tecnico || ""}
                </span>
              </div>

              <div className="p-2 border-b border-gray-800 flex items-end min-w-0">
                <span className="font-bold shrink-0">UNIVERSITARIO:&nbsp;</span>
                <span className="flex-1 border-b border-gray-400 pb-0.5 min-h-[16px] text-gray-800 font-medium truncate min-w-0">
                  {entrevista.universitario || ""}
                </span>
              </div>

              <div className="p-2 border-b border-gray-800 flex items-end min-w-0">
                <span className="font-bold shrink-0">POSEE ESPECIALIZACIÓN (Detalle):&nbsp;</span>
                <span className="flex-1 border-b border-gray-400 pb-0.5 min-h-[16px] text-gray-800 font-medium truncate min-w-0">
                  {entrevista.posee_especializacion || ""}
                </span>
              </div>

              <div className="p-2 border-b border-gray-800">
                <div className="font-bold text-xs mb-1.5 leading-snug">
                  ¿CUÁNDO REALIZÓ SU ÚLTIMO CURSO, TALLER, SEMINARIO O ACTUALIZACIÓN SOBRE EL ÁREA QUE SE DESENVUELVE COMO FACILITADOR? QUE TENGA SOPORTE FORMAL Y FÍSICO DEL MISMO:
                </div>
                <div className="flex gap-8 mb-2 text-xs">
                  <span>
                    {entrevista.ultimo_curso_tiempo === "6_meses" ? "( X )" : "(   )"} 6 MESES
                  </span>
                  <span>
                    {entrevista.ultimo_curso_tiempo === "12_meses" ? "( X )" : "(   )"} 12 MESES
                  </span>
                  <span>
                    {entrevista.ultimo_curso_tiempo === "mas_12_meses" ? "( X )" : "(   )"} + DE 12 MESES
                  </span>
                </div>
                <div className="flex items-end min-w-0">
                  <span className="font-bold shrink-0">DESCRIBA:&nbsp;</span>
                  <span className="flex-1 border-b border-gray-400 pb-0.5 min-h-[16px] text-gray-800 font-medium">
                    {entrevista.ultimo_curso_descripcion || ""}
                  </span>
                </div>
              </div>

              <div className="p-2 border-b border-gray-800">
                <div className="font-bold text-xs mb-1.5 leading-snug">
                  ¿CÓMO CONSIDERA QUE MANEJA LAS HERRAMIENTAS AUDIOVISUALES QUE FORMAN PARTE DE UNA CAPACITACIÓN, LAPTOP, VIDEO BEAM, CORNETAS, TELÉFONO, ENTRE OTROS.?
                </div>
                <div className="flex flex-wrap gap-6 text-xs">
                  <span>
                    {entrevista.manejo_herramientas_audiovisuales === "totalmente" ? "( X )" : "(   )"} TOTALMENTE
                  </span>
                  <span>
                    {entrevista.manejo_herramientas_audiovisuales === "con_limitacion" ? "( X )" : "(   )"} CON LIMITACIÓN
                  </span>
                  <span>
                    {entrevista.manejo_herramientas_audiovisuales === "en_aprendizaje" ? "( X )" : "(   )"} EN APRENDIZAJE
                  </span>
                  <span>
                    {entrevista.manejo_herramientas_audiovisuales === "no_se_manejarlos" ? "( X )" : "(   )"} NO SE MANEJARLOS
                  </span>
                </div>
              </div>

              {/* ── DOCUMENTACIÓN LEGAL VIGENTE ────────────────────────────────────── */}
              <div className="bg-gray-200 px-3 py-1 font-bold uppercase border-b border-gray-800 text-xs">
                Documentación Legal Vigente con la que cuente de manera digital y física / Soportes
              </div>

              <div className="grid grid-cols-2 divide-x divide-gray-800 text-xs">
                <div className="divide-y divide-gray-400">
                  <div className="flex justify-between items-center p-2">
                    <span>RESUMEN CURRICULAR</span>
                    <span className="font-medium whitespace-nowrap">
                      {entrevista.doc_resumen_curricular ? "( X ) SI   (   ) NO" : "(   ) SI   (   ) NO"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2">
                    <span>SOPORTES DE RESUMEN CURRICULAR</span>
                    <span className="font-medium whitespace-nowrap">
                      {entrevista.doc_soportes_resumen_curricular ? "( X ) SI   (   ) NO" : "(   ) SI   (   ) NO"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2">
                    <span>REGISTRO ANTE EL INPSASEL</span>
                    <span className="font-medium whitespace-nowrap">
                      {entrevista.doc_registro_inpsasel ? "( X ) SI   (   ) NO" : "(   ) SI   (   ) NO"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2">
                    <span>TÍTULO UNIVERSITARIO O FONDO NEGRO</span>
                    <span className="font-medium whitespace-nowrap">
                      {entrevista.doc_titulo_universitario ? "( X ) SI   (   ) NO" : "(   ) SI   (   ) NO"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2">
                    <span>POSEE FORMACIÓN DOCENTE CERTIFICADA</span>
                    <span className="font-medium whitespace-nowrap">
                      {entrevista.doc_formacion_docente ? "( X ) SI   (   ) NO" : "(   ) SI   (   ) NO"}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-gray-400">
                  <div className="flex justify-between items-center p-2">
                    <span>CÉDULA DE IDENTIDAD</span>
                    <span className="font-medium whitespace-nowrap">
                      {entrevista.doc_cedula_identidad ? "( X ) SI   (   ) NO" : "(   ) SI   (   ) NO"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2">
                    <span>RIF ACTUALIZADO</span>
                    <span className="font-medium whitespace-nowrap">
                      {entrevista.doc_rif_actualizado ? "( X ) SI   (   ) NO" : "(   ) SI   (   ) NO"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2">
                    <span>FACTURA FISCAL</span>
                    <span className="font-medium whitespace-nowrap">
                      {entrevista.doc_factura_fiscal ? "( X ) SI   (   ) NO" : "(   ) SI   (   ) NO"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2">
                    <span>ÚLTIMA DECLARACIÓN DE ISLR</span>
                    <span className="font-medium whitespace-nowrap">
                      {entrevista.doc_declaracion_islr ? "( X ) SI   (   ) NO" : "(   ) SI   (   ) NO"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2">
                    <span>POSEE LAPTOP</span>
                    <span className="font-medium whitespace-nowrap">
                      {entrevista.doc_posee_laptop ? "( X ) SI   (   ) NO" : "(   ) SI   (   ) NO"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Page Break Divider on Screen */}
          <div className="page-break-divider print:hidden my-6 py-2 border-y-2 border-dashed border-gray-400 text-center text-gray-500 font-semibold text-xs bg-white/60 rounded">
            — Salto de Página (Página 2 en Impresión / PDF) —
          </div>

          {/* ========================================================================= */}
          {/* PÁGINA 2: COMPETENCIAS Y TEMAS A IMPARTIR                                 */}
          {/* ========================================================================= */}
          <div className="bg-white border border-gray-800 p-4 shadow-md print:shadow-none print-page-2 text-xs">
            {/* Header Box */}
            <div className="border-b border-gray-800 pb-2 mb-2.5">
              <div className="flex items-center justify-between">
                <div className="w-36 flex items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logo.png"
                    alt="SHA de Venezuela"
                    className="h-10 w-auto object-contain"
                  />
                </div>
                <div className="text-center flex-1 px-2">
                  <div className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                    SHA de Venezuela, C.A.
                  </div>
                  <div className="text-base font-bold uppercase tracking-wider text-gray-900">
                    Formato de Entrevista Facilitador
                  </div>
                </div>
                <div className="w-36 text-right text-[11px] font-mono text-gray-600">
                  <div>
                    <span className="font-bold">PÁGINA:</span> 2 de 2
                  </div>
                </div>
              </div>
            </div>

            {/* Competencies Section */}
            <div className="border border-gray-800">
              <div className="bg-gray-200 px-2.5 py-0.5 font-bold uppercase border-b border-gray-800 text-[11px]">
                Preguntas de Desenvolvimiento y Competencias
              </div>

              <div className="grid grid-cols-2 divide-x divide-gray-800 border-b border-gray-800">
                <div className="p-2">
                  <div className="font-bold text-[11px] mb-1">
                    NOMBRE AL MENOS 2 RETOS QUE HA TENIDO QUE ENFRENTAR COMO FACILITADOR:
                  </div>
                  {entrevista.retos_facilitador ? (
                    <p className="whitespace-pre-wrap text-gray-800 text-xs">
                      {entrevista.retos_facilitador}
                    </p>
                  ) : (
                    <div className="space-y-2 pt-1">
                      <div className="border-b border-gray-400 h-3.5 w-full" />
                      <div className="border-b border-gray-400 h-3.5 w-full" />
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <div className="font-bold text-[11px] mb-1">
                    NOMBRE AL MENOS 2 LOGROS QUE HA ALCANZADO EN ALGUNA ACTIVIDAD DE FORMACIÓN:
                  </div>
                  {entrevista.logros_formacion ? (
                    <p className="whitespace-pre-wrap text-gray-800 text-xs">
                      {entrevista.logros_formacion}
                    </p>
                  ) : (
                    <div className="space-y-2 pt-1">
                      <div className="border-b border-gray-400 h-3.5 w-full" />
                      <div className="border-b border-gray-400 h-3.5 w-full" />
                    </div>
                  )}
                </div>
              </div>

              <div className="p-2 border-b border-gray-800">
                <div className="font-bold text-[11px] mb-1">
                  ¿CUÁL DE LAS SIGUIENTES CARACTERÍSTICAS ES ESENCIAL PARA UN FACILITADOR QUE TRABAJA CON PÚBLICO OBJETIVO HETEROGÉNEOS?
                </div>
                <div className="flex flex-wrap gap-8 text-xs pt-0.5">
                  <span>
                    {entrevista.caracteristica_esencial === "empatia" ? "( X )" : "(   )"} a) Empatía
                  </span>
                  <span>
                    {entrevista.caracteristica_esencial === "introversion" ? "( X )" : "(   )"} b) Introversión
                  </span>
                  <span>
                    {entrevista.caracteristica_esencial === "autoritarismo" ? "( X )" : "(   )"} c) Autoritarismo
                  </span>
                  <span>
                    {entrevista.caracteristica_esencial === "indiferencia" ? "( X )" : "(   )"} d) Indiferencia
                  </span>
                </div>
              </div>

              <div className="p-2 border-b border-gray-800">
                <div className="font-bold text-[11px] mb-1">
                  DA UN EJEMPLO DE CUÁNDO HAS PODIDO USAR TUS HABILIDADES DE LIDERAZGO:
                </div>
                {entrevista.ejemplo_liderazgo ? (
                  <p className="whitespace-pre-wrap text-gray-800 text-xs">
                    {entrevista.ejemplo_liderazgo}
                  </p>
                ) : (
                  <div className="space-y-2 pt-1">
                    <div className="border-b border-gray-400 h-3.5 w-full" />
                    <div className="border-b border-gray-400 h-3.5 w-full" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 divide-x divide-gray-800 border-b border-gray-800">
                <div className="p-2">
                  <div className="font-bold text-[11px] mb-1">LISTA 5 FORTALEZAS:</div>
                  {entrevista.fortalezas ? (
                    <p className="whitespace-pre-wrap text-gray-800 text-xs">
                      {entrevista.fortalezas}
                    </p>
                  ) : (
                    <div className="space-y-1.5 text-xs pt-0.5">
                      <div className="flex items-end"><span className="font-bold shrink-0">1.&nbsp;</span><span className="flex-1 border-b border-gray-400 min-h-[13px]" /></div>
                      <div className="flex items-end"><span className="font-bold shrink-0">2.&nbsp;</span><span className="flex-1 border-b border-gray-400 min-h-[13px]" /></div>
                      <div className="flex items-end"><span className="font-bold shrink-0">3.&nbsp;</span><span className="flex-1 border-b border-gray-400 min-h-[13px]" /></div>
                      <div className="flex items-end"><span className="font-bold shrink-0">4.&nbsp;</span><span className="flex-1 border-b border-gray-400 min-h-[13px]" /></div>
                      <div className="flex items-end"><span className="font-bold shrink-0">5.&nbsp;</span><span className="flex-1 border-b border-gray-400 min-h-[13px]" /></div>
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <div className="font-bold text-[11px] mb-1">LISTA 5 DEBILIDADES:</div>
                  {entrevista.debilidades ? (
                    <p className="whitespace-pre-wrap text-gray-800 text-xs">
                      {entrevista.debilidades}
                    </p>
                  ) : (
                    <div className="space-y-1.5 text-xs pt-0.5">
                      <div className="flex items-end"><span className="font-bold shrink-0">1.&nbsp;</span><span className="flex-1 border-b border-gray-400 min-h-[13px]" /></div>
                      <div className="flex items-end"><span className="font-bold shrink-0">2.&nbsp;</span><span className="flex-1 border-b border-gray-400 min-h-[13px]" /></div>
                      <div className="flex items-end"><span className="font-bold shrink-0">3.&nbsp;</span><span className="flex-1 border-b border-gray-400 min-h-[13px]" /></div>
                      <div className="flex items-end"><span className="font-bold shrink-0">4.&nbsp;</span><span className="flex-1 border-b border-gray-400 min-h-[13px]" /></div>
                      <div className="flex items-end"><span className="font-bold shrink-0">5.&nbsp;</span><span className="flex-1 border-b border-gray-400 min-h-[13px]" /></div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 divide-x divide-gray-800 border-b border-gray-800">
                <div className="p-2">
                  <div className="font-bold text-[11px] mb-1">¿POR QUÉ QUIERES TRABAJAR AQUÍ?:</div>
                  {entrevista.motivo_trabajar_aqui ? (
                    <p className="whitespace-pre-wrap text-gray-800 text-xs">
                      {entrevista.motivo_trabajar_aqui}
                    </p>
                  ) : (
                    <div className="space-y-2 pt-1">
                      <div className="border-b border-gray-400 h-3.5 w-full" />
                      <div className="border-b border-gray-400 h-3.5 w-full" />
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <div className="font-bold text-[11px] mb-1">¿POR QUÉ DEBEMOS CONTRATARTE?:</div>
                  {entrevista.por_que_contratarte ? (
                    <p className="whitespace-pre-wrap text-gray-800 text-xs">
                      {entrevista.por_que_contratarte}
                    </p>
                  ) : (
                    <div className="space-y-2 pt-1">
                      <div className="border-b border-gray-400 h-3.5 w-full" />
                      <div className="border-b border-gray-400 h-3.5 w-full" />
                    </div>
                  )}
                </div>
              </div>

              {/* ── CUÁLES TEMAS CONSIDERAS TENER LAS CAPACIDADES PARA IMPARTIR ────── */}
              <div className="p-2.5">
                <div className="font-bold text-[11px] mb-2 uppercase tracking-wide text-gray-900">
                  CUÁLES TEMAS CONSIDERAS TENER LAS CAPACIDADES PARA IMPARTIR:
                </div>
                {Array.isArray(entrevista.temas_capacidades) && entrevista.temas_capacidades.length > 0 ? (
                  <div className="space-y-2 text-xs text-gray-800">
                    {entrevista.temas_capacidades.map((tema, i) => (
                      <div key={i} className="border-b border-gray-400 pb-0.5 w-full">
                        {tema}
                      </div>
                    ))}
                    {Array.from({ length: Math.max(2, 6 - entrevista.temas_capacidades.length) }).map((_, idx) => (
                      <div key={`blank-${idx}`} className="border-b border-gray-400 h-4.5 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2 pt-0.5 pb-1">
                    <div className="border-b border-gray-400 h-4.5 w-full" />
                    <div className="border-b border-gray-400 h-4.5 w-full" />
                    <div className="border-b border-gray-400 h-4.5 w-full" />
                    <div className="border-b border-gray-400 h-4.5 w-full" />
                    <div className="border-b border-gray-400 h-4.5 w-full" />
                    <div className="border-b border-gray-400 h-4.5 w-full" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
