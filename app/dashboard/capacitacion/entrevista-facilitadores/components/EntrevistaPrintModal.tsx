"use client";

import React, { useState, useEffect } from "react";
import { X, Printer, Loader2 } from "lucide-react";
import type { FacilitadorEntrevista } from "@/types/entrevistas-facilitadores";

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
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen || !entrevista) return null;

  const handlePrint = () => {
    const printArea = document.getElementById("entrevista-print-area");
    if (!printArea) {
      window.print();
      return;
    }

    setPrinting(true);

    // Remove any previous print iframe
    const oldIframe = document.getElementById("entrevista-print-iframe");
    if (oldIframe) {
      oldIframe.remove();
    }

    const iframe = document.createElement("iframe");
    iframe.id = "entrevista-print-iframe";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      setPrinting(false);
      window.print();
      return;
    }

    // Extract all live CSS rules from document.styleSheets
    let liveCss = "";
    try {
      Array.from(document.styleSheets).forEach((sheet) => {
        try {
          if (sheet.cssRules) {
            Array.from(sheet.cssRules).forEach((rule) => {
              const ruleText = rule.cssText;
              if (
                !ruleText.includes("visibility: hidden") &&
                !ruleText.includes("body > *:not")
              ) {
                liveCss += ruleText + "\n";
              }
            });
          }
        } catch {
          if (sheet.href) {
            liveCss += `@import url("${sheet.href}");\n`;
          }
        }
      });
    } catch (e) {
      console.warn("Could not read document.styleSheets:", e);
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>Formato de Entrevista Facilitador</title>
          <style>
            ${liveCss}

            @page {
              size: letter portrait;
              margin: 8mm 8mm 14mm 8mm;
            }

            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #111827 !important;
              width: 100% !important;
              height: auto !important;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
              -webkit-font-smoothing: antialiased !important;
              -moz-osx-font-smoothing: grayscale !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            * {
              box-sizing: border-box !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            #entrevista-print-area {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
            }

            .print-page-1 {
              width: calc(100% - 8px) !important;
              max-width: calc(100% - 8px) !important;
              margin: 2px auto 0 auto !important;
              padding: 12px 14px !important;
              border: 1.5px solid #111827 !important;
              background: #ffffff !important;
              box-sizing: border-box !important;
              height: auto !important;
              min-height: auto !important;
              max-height: none !important;
              break-inside: avoid !important;
              page-break-inside: avoid !important;
              break-after: page !important;
              page-break-after: always !important;
            }

            .print-page-2 {
              break-before: page !important;
              page-break-before: always !important;
              break-inside: avoid !important;
              page-break-inside: avoid !important;
              break-after: avoid !important;
              page-break-after: avoid !important;
              width: calc(100% - 8px) !important;
              max-width: calc(100% - 8px) !important;
              margin: 2px auto 0 auto !important;
              padding: 12px 14px !important;
              border: 1.5px solid #111827 !important;
              background: #ffffff !important;
              box-sizing: border-box !important;
              height: auto !important;
              min-height: auto !important;
              max-height: none !important;
            }

            .border-gray-800 {
              border-color: #111827 !important;
            }

            .border-gray-400 {
              border-color: #9ca3af !important;
            }

            .bg-gray-200 {
              background-color: #e5e7eb !important;
            }

            .page-break-divider {
              display: none !important;
            }
          </style>
        </head>
        <body style="background: white; margin: 0; padding: 2px 4px 10px 4px;">
          <div style="width: 100%; margin: 0; padding: 0;">
            ${printArea.innerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    const triggerPrint = () => {
      setPrinting(false);
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error("Print error:", err);
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 2500);
      }
    };

    const images = iframe.contentDocument?.images;
    if (images && images.length > 0) {
      let loaded = 0;
      const total = images.length;
      const onImg = () => {
        loaded++;
        if (loaded >= total) {
          setTimeout(triggerPrint, 150);
        }
      };
      for (let i = 0; i < total; i++) {
        if (images[i].complete) {
          onImg();
        } else {
          images[i].onload = onImg;
          images[i].onerror = onImg;
        }
      }
    } else {
      setTimeout(triggerPrint, 200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      {/* Modal Container */}
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Modal Toolbar (hidden when printing) */}
        <div className="print:hidden flex items-center justify-between px-6 py-3.5 bg-gray-100 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-gray-700" />
            <div>
              <h2 className="font-semibold text-gray-800 text-sm">
                Vista de Impresión — Formato de Entrevista Facilitador
              </h2>
              <p className="text-[11px] text-gray-500">
                Formato para aspirante/facilitador (2 páginas • Sin Sección 5 interna)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              disabled={printing}
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm cursor-pointer disabled:opacity-60"
            >
              {printing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              {printing ? "Preparando..." : "Imprimir / Guardar PDF"}
            </button>
            <button
              onClick={onClose}
              type="button"
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
              title="Cerrar vista previa"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Area for On-Screen View */}
        <div className="p-6 overflow-y-auto bg-gray-200 flex-1">
          {/* Printable Document Root */}
          <div
            id="entrevista-print-area"
            className="w-full max-w-[210mm] mx-auto bg-white text-gray-900 font-sans text-xs leading-normal shadow-md print:shadow-none print:m-0 print:p-0 print:max-w-none"
          >
            {/* ========================================================================= */}
            {/* PÁGINA 1: DATOS, NIVEL EDUCATIVO Y DOCUMENTACIÓN                         */}
            {/* ========================================================================= */}
            <div className="p-3 sm:p-4 bg-white border border-gray-800 print-page-1">
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
                  <div className="col-span-8 p-2 flex items-end">
                    <span className="font-bold shrink-0">NOMBRE Y APELLIDO:&nbsp;</span>
                    <span className="flex-1 border-b border-gray-400 pb-0.5 min-h-[16px] text-gray-800 uppercase font-medium">
                      {entrevista.nombre_apellido || ""}
                    </span>
                  </div>
                  <div className="col-span-4 p-2 flex items-end">
                    <span className="font-bold shrink-0">C.I. NRO:&nbsp;</span>
                    <span className="flex-1 border-b border-gray-400 pb-0.5 min-h-[16px] text-gray-800 font-medium">
                      {entrevista.cedula || ""}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-12 border-b border-gray-800 divide-x divide-gray-800">
                  <div className="col-span-6 p-2 flex items-end">
                    <span className="font-bold shrink-0">DIRECCIÓN:&nbsp;</span>
                    <span className="flex-1 border-b border-gray-400 pb-0.5 min-h-[16px] text-gray-800 font-medium">
                      {entrevista.direccion || ""}
                    </span>
                  </div>
                  <div className="col-span-3 p-2 flex items-end">
                    <span className="font-bold shrink-0">TELÉFONO:&nbsp;</span>
                    <span className="flex-1 border-b border-gray-400 pb-0.5 min-h-[16px] text-gray-800 font-medium">
                      {entrevista.telefono || ""}
                    </span>
                  </div>
                  <div className="col-span-3 p-2 flex items-end">
                    <span className="font-bold shrink-0">EMAIL:&nbsp;</span>
                    <span className="flex-1 border-b border-gray-400 pb-0.5 min-h-[16px] text-gray-800 font-medium">
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

                <div className="p-2 border-b border-gray-800 flex items-end">
                  <span className="font-bold shrink-0">NIVEL TÉCNICO:&nbsp;</span>
                  <span className="flex-1 border-b border-gray-400 pb-0.5 min-h-[16px] text-gray-800 font-medium">
                    {entrevista.nivel_tecnico || ""}
                  </span>
                </div>

                <div className="p-2 border-b border-gray-800 flex items-end">
                  <span className="font-bold shrink-0">UNIVERSITARIO:&nbsp;</span>
                  <span className="flex-1 border-b border-gray-400 pb-0.5 min-h-[16px] text-gray-800 font-medium">
                    {entrevista.universitario || ""}
                  </span>
                </div>

                <div className="p-2 border-b border-gray-800 flex items-end">
                  <span className="font-bold shrink-0">POSEE ESPECIALIZACIÓN (Detalle):&nbsp;</span>
                  <span className="flex-1 border-b border-gray-400 pb-0.5 min-h-[16px] text-gray-800 font-medium">
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
                  <div className="flex items-end">
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

            {/* Visual Page Break Indicator for On-Screen Preview */}
            <div className="page-break-divider print:hidden my-5 py-2.5 border-y-2 border-dashed border-gray-400 text-center text-gray-500 font-semibold text-xs bg-gray-50">
              — Salto de Página (Página 2 en Impresión / PDF) —
            </div>

            {/* ========================================================================= */}
            {/* PÁGINA 2: COMPETENCIAS Y TEMAS A IMPARTIR                                 */}
            {/* ========================================================================= */}
            <div className="p-3 sm:p-4 bg-white border border-gray-800 print-page-2">
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
                {/* Full width lines for text, not numbered, so they can write as many as they want */}
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
                      {/* Additional blank lines so they can write more if desired */}
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
    </div>
  );
}
