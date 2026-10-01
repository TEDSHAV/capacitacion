"use client";

import { useState } from "react";
import {
  Receipt,
  FileCheck2,
  Clock,
  CheckCircle2,
  Upload,
  AlertCircle,
  Building2,
  ExternalLink,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FacilitadorPurchaseOrder } from "@/app/actions/facilitador-facturacion";
import { uploadFacilitadorInvoice } from "@/app/actions/facilitador-facturacion";

interface FacilitadorFacturacionViewProps {
  initialOrders?: FacilitadorPurchaseOrder[];
  facilitadorId: number;
}

export function FacilitadorFacturacionView({
  initialOrders = [],
  facilitadorId,
}: FacilitadorFacturacionViewProps) {
  const [orders, setOrders] = useState<FacilitadorPurchaseOrder[]>(initialOrders);
  const [filterTab, setFilterTab] = useState<"pendientes" | "historial">("pendientes");
  const [selectedOrderForUpload, setSelectedOrderForUpload] = useState<FacilitadorPurchaseOrder | null>(null);

  // Form state for modal
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [numeroFactura, setNumeroFactura] = useState("");
  const [numeroControl, setNumeroControl] = useState("");
  const [fechaEmision, setFechaEmision] = useState(() => new Date().toISOString().split("T")[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Counters
  const pendientes = orders.filter((o) => o.status === "pendiente_factura");
  const historial = orders.filter((o) => o.status !== "pendiente_factura");

  const displayedOrders = filterTab === "pendientes" ? pendientes : historial;

  const handleOpenUploadModal = (order: FacilitadorPurchaseOrder) => {
    setSelectedOrderForUpload(order);
    setInvoiceFile(null);
    setNumeroFactura("");
    setNumeroControl("");
    setFechaEmision(new Date().toISOString().split("T")[0]);
    setUploadError(null);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setSelectedOrderForUpload(null);
    setInvoiceFile(null);
    setUploadError(null);
  };

  const handleSubmitInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForUpload) return;

    if (!invoiceFile) {
      setUploadError("Por favor selecciona el archivo de la factura (PDF o imagen).");
      return;
    }

    if (!numeroFactura.trim()) {
      setUploadError("Por favor ingresa el número de la factura.");
      return;
    }

    setIsSubmitting(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", invoiceFile);
      formData.append("poId", String(selectedOrderForUpload.id));
      formData.append("osiId", String(selectedOrderForUpload.osiId));
      formData.append("nroOsi", String(selectedOrderForUpload.nroOsi));
      formData.append("numeroFactura", numeroFactura.trim());
      formData.append("numeroControl", numeroControl.trim());
      formData.append("fechaEmision", fechaEmision);

      const result = await uploadFacilitadorInvoice(formData);

      if (result.success) {
        // Update local order state
        setOrders((prev) =>
          prev.map((o) => {
            if (o.id === selectedOrderForUpload.id) {
              return {
                ...o,
                status: "factura_enviada",
                factura: {
                  id: result.attachment?.id,
                  numeroFactura: numeroFactura.trim(),
                  numeroControl: numeroControl.trim(),
                  fechaEmision,
                  fileName: invoiceFile.name,
                  storagePath: result.attachment?.storage_path,
                  uploadedAt: new Date().toISOString(),
                },
              };
            }
            return o;
          })
        );

        setUploadSuccess(
          `Factura ${numeroFactura.trim()} enviada exitosamente para la Orden ${selectedOrderForUpload.poNumber}.`
        );
        setSelectedOrderForUpload(null);
        setTimeout(() => setUploadSuccess(null), 6000);
      } else {
        setUploadError(result.error || "No se pudo subir la factura. Intenta de nuevo.");
      }
    } catch (err) {
      setUploadError((err as Error).message || "Error al procesar la factura.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header with Explanation */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-white via-sky-50/40 to-blue-50/20 border border-sky-100 shadow-2xs space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Órdenes de Compra y Facturación
            </h2>
            <p className="text-xs text-slate-500">
              Consulta de órdenes de compra emitidas y remisión de facturas
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1">
          Una vez ejecutado y verificado tu servicio, Administración emite la{" "}
          <strong>Orden de Compra (OC)</strong> correspondiente. Cuando tu orden esté disponible,
          adjunta aquí tu factura fiscal para iniciar el trámite administrativo de pago.
        </p>
      </div>

      {/* Success Notification Alert */}
      {uploadSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm flex items-start gap-3 shadow-2xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">¡Factura enviada a Administración!</p>
            <p className="text-emerald-800 text-xs">{uploadSuccess}</p>
          </div>
        </div>
      )}

      {/* KPI Stats Grid (3 Clean Operational Cards, No Financials) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* KPI 1: Total POs */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
            Órdenes Emitidas
          </span>
          <p className="text-2xl font-bold text-slate-900">{orders.length}</p>
          <span className="text-[11px] text-slate-500 block">Emitidas por Administración</span>
        </div>

        {/* KPI 2: Pendientes por Facturar */}
        <div
          onClick={() => setFilterTab("pendientes")}
          className={`p-4.5 rounded-xl border transition-all cursor-pointer shadow-2xs space-y-1 ${
            filterTab === "pendientes"
              ? "bg-amber-50/50 border-amber-300 ring-2 ring-amber-100"
              : "bg-white border-slate-200 hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-amber-700 block tracking-wider">
              Por Facturar
            </span>
            {pendientes.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </div>
          <p className="text-2xl font-bold text-amber-900">{pendientes.length}</p>
          <span className="text-[11px] text-amber-700 block">Requieren adjuntar factura</span>
        </div>

        {/* KPI 3: Facturadas */}
        <div
          onClick={() => setFilterTab("historial")}
          className={`p-4.5 rounded-xl border transition-all cursor-pointer shadow-2xs space-y-1 ${
            filterTab === "historial"
              ? "bg-emerald-50/50 border-emerald-300 ring-2 ring-emerald-100"
              : "bg-white border-slate-200 hover:border-emerald-300"
          }`}
        >
          <span className="text-[10px] font-bold uppercase text-emerald-700 block tracking-wider">
            Facturas Remitidas
          </span>
          <p className="text-2xl font-bold text-emerald-900">{historial.length}</p>
          <span className="text-[11px] text-emerald-700 block">En proceso de tramitación</span>
        </div>
      </div>

      {/* Segmented Filter Pills */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="grid grid-cols-1 sm:grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFilterTab("pendientes")}
            className={`px-3 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 font-semibold ${
              filterTab === "pendientes"
                ? "bg-white text-slate-900 font-bold shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/40"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Por Facturar ({pendientes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab("historial")}
            className={`px-3 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 font-semibold ${
              filterTab === "historial"
                ? "bg-white text-slate-900 font-bold shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/40"
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="hidden sm:inline">Facturas Enviadas ({historial.length})</span>
            <span className="sm:hidden">Enviadas ({historial.length})</span>
          </button>
        </div>

        <p className="text-xs text-slate-400 italic">
          Mostrando {displayedOrders.length} orden(es) de compra
        </p>
      </div>

      {/* Orders List */}
      {displayedOrders.length > 0 ? (
        <div className="grid gap-4">
          {displayedOrders.map((order) => {
            const isPending = order.status === "pendiente_factura";

            return (
              <div
                key={order.id}
                className={`bg-white border rounded-2xl p-5 shadow-2xs transition-all space-y-4 ${
                  isPending
                    ? "border-amber-200/90 hover:border-amber-300"
                    : "border-slate-200/90 hover:border-slate-300"
                }`}
              >
                {/* Order Top Meta */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider bg-slate-900 text-white px-2.5 py-1 rounded-md">
                      {order.poNumber}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider bg-sky-100 text-sky-800 px-2 py-0.5 rounded-md border border-sky-200">
                      OSI #{order.nroOsi}
                    </span>
                    {order.isSample && (
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        Muestra / Modelo
                      </span>
                    )}
                  </div>

                  <div>
                    {isPending ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        Pendiente de Factura
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Factura Remitida
                      </span>
                    )}
                  </div>
                </div>

                {/* Company & Service Info */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                      {order.empresa}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 font-medium pl-6">
                    {order.servicio}
                  </p>
                </div>

                {/* Operational Details Breakdown (No financial or honorarios info) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/60 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Fecha de Ejecución
                    </span>
                    <span className="font-bold text-slate-800 mt-0.5 block">
                      {order.fechaServicio || "--"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Emisión de Orden
                    </span>
                    <span className="font-bold text-slate-800 mt-0.5 block">
                      {order.issuedAt || "--"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Estado de Factura
                    </span>
                    <span className={`font-bold mt-0.5 block ${isPending ? "text-amber-700" : "text-emerald-700"}`}>
                      {isPending ? "Pendiente por Cargar" : "Factura Remitida"}
                    </span>
                  </div>
                </div>

                {/* Observaciones if any */}
                {order.observaciones && (
                  <p className="text-[11px] text-slate-500 italic bg-white p-2 rounded-lg border border-slate-100">
                    ℹ️ {order.observaciones}
                  </p>
                )}

                {/* Action or Invoice Submitted Card */}
                {isPending ? (
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
                    <p className="text-xs text-amber-700 font-medium flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                      Adjunta tu factura correspondiente a este servicio para que Administración procese el pago.
                    </p>

                    <Button
                      type="button"
                      onClick={() => handleOpenUploadModal(order)}
                      className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs h-10 px-5 rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Cargar Factura</span>
                    </Button>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-100">
                    <div className="p-3 bg-emerald-50/50 border border-emerald-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-emerald-950">
                      <div className="flex items-center gap-2.5">
                        <FileCheck2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div>
                          <p className="font-bold">
                            Factura {order.factura?.numeroFactura || "Remitida"}
                            {order.factura?.numeroControl && ` (Control: ${order.factura.numeroControl})`}
                          </p>
                          <p className="text-[11px] text-emerald-700">
                            {order.factura?.fileName || "Archivo adjunto registrado"}
                            {order.factura?.fechaEmision && ` • Emisión: ${order.factura.fechaEmision}`}
                          </p>
                        </div>
                      </div>

                      {order.factura?.publicUrl && (
                        <a
                          href={order.factura.publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-bold text-xs shadow-2xs transition-colors shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Ver Factura</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl py-14 flex flex-col items-center justify-center text-center p-6 space-y-2">
          <Receipt className="w-10 h-10 text-slate-300 stroke-1" />
          <p className="text-sm font-semibold text-slate-700">
            {filterTab === "pendientes"
              ? "No tienes órdenes de compra pendientes por facturar"
              : "Aún no tienes facturas enviadas en el historial"}
          </p>
          <p className="text-xs text-slate-400 max-w-sm">
            {filterTab === "pendientes"
              ? "Cuando Administración procese y emita una Orden de Compra para tus servicios completados, aparecerá aquí."
              : "Las facturas que remitas para tus órdenes de compra completadas se guardarán en esta pestaña."}
          </p>
        </div>
      )}

      {/* Modal: Cargar Factura */}
      {selectedOrderForUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden space-y-0">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Cargar Factura de Servicio
                  </h3>
                  <p className="text-xs text-slate-500">
                    Orden {selectedOrderForUpload.poNumber} • OSI #{selectedOrderForUpload.nroOsi}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitInvoice} className="p-5 space-y-4">
              {uploadError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <p>{uploadError}</p>
                </div>
              )}

              {/* Order summary pill */}
              <div className="p-3 bg-sky-50/50 border border-sky-100 rounded-xl text-xs space-y-1">
                <p className="font-bold text-sky-950">{selectedOrderForUpload.empresa}</p>
                <p className="text-sky-800 text-[11px]">{selectedOrderForUpload.servicio}</p>
              </div>

              {/* File Upload Area */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Archivo de la Factura (PDF o Imagen) *
                </label>
                <div className="border-2 border-dashed border-slate-300 hover:border-sky-400 rounded-xl p-4 text-center bg-slate-50/50 transition-colors">
                  <input
                    type="file"
                    id="invoice-file-input"
                    accept="application/pdf,image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setInvoiceFile(file);
                      setUploadError(null);
                    }}
                    className="hidden"
                  />
                  <label
                    htmlFor="invoice-file-input"
                    className="cursor-pointer flex flex-col items-center justify-center space-y-1"
                  >
                    {invoiceFile ? (
                      <>
                        <FileCheck2 className="w-8 h-8 text-emerald-600" />
                        <span className="text-xs font-bold text-slate-800 truncate max-w-xs">
                          {invoiceFile.name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {(invoiceFile.size / (1024 * 1024)).toFixed(2)} MB • Clic para cambiar
                        </span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-slate-400" />
                        <span className="text-xs font-bold text-sky-700">
                          Seleccionar archivo de factura
                        </span>
                        <span className="text-[11px] text-slate-400">
                          PDF, JPG o PNG hasta 15MB
                        </span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Invoice Metadata Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Nro. de Factura *
                  </label>
                  <Input
                    type="text"
                    required
                    value={numeroFactura}
                    onChange={(e) => setNumeroFactura(e.target.value)}
                    placeholder="Ej. 000124"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Nro. de Control (Opcional)
                  </label>
                  <Input
                    type="text"
                    value={numeroControl}
                    onChange={(e) => setNumeroControl(e.target.value)}
                    placeholder="Ej. 00-4921"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Fecha de Emisión de la Factura *
                </label>
                <Input
                  type="date"
                  required
                  value={fechaEmision}
                  onChange={(e) => setFechaEmision(e.target.value)}
                  className="text-xs"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="text-xs font-semibold"
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || !invoiceFile || !numeroFactura.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 shadow-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      <span>Enviar Factura</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
