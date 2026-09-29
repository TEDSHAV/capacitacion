"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileCheck2,
  AlertCircle,
  Clock,
  ArrowRight,
  X,
} from "lucide-react";
import { type AlertasCertificadosResumen } from "@/app/actions/alertas-certificados";
import { subscribe, requestData } from "@/lib/alertas-certificados-cache";

export function CertificadosNotificationsBanner() {
  const [data, setData] = useState<AlertasCertificadosResumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Subscribe first so we get data whether we triggered the fetch or
    // CertificadosAlertCenter (which lives in the dashboard layout) did.
    const unsub = subscribe((res) => {
      if (isMounted) {
        setData(res);
        setLoading(false);
      }
    });

    // Trigger the shared fetch (deduplicates with concurrent callers)
    requestData()
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("[CertificadosNotificationsBanner] Error loading notifications:", err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  if (dismissed) return null;

  // ─── Skeleton while loading ───
  if (loading) {
    return (
      <div className="relative mb-8" aria-hidden="true">
        <div className="rounded-2xl p-[1.5px] bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 shadow-sm">
          <div className="rounded-[14.5px] bg-white p-6 overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 animate-pulse">
              {/* Left column skeleton */}
              <div className="max-w-xl flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-20 rounded-full bg-slate-200" />
                  <div className="h-4 w-40 rounded bg-slate-100" />
                </div>
                <div className="h-7 w-80 max-w-full rounded-lg bg-slate-200" />
                <div className="h-4 w-96 max-w-full rounded bg-slate-100" />
                <div className="flex items-center gap-2.5 pt-1">
                  <div className="h-8 w-36 rounded-xl bg-emerald-50 border border-emerald-200" />
                  <div className="h-8 w-40 rounded-xl bg-rose-50 border border-rose-200" />
                  <div className="h-8 w-28 rounded-xl bg-amber-50 border border-amber-200" />
                </div>
              </div>
              {/* Right column skeleton */}
              <div className="flex-1 max-w-lg lg:border-l lg:border-slate-100 lg:pl-6 space-y-2.5">
                <div className="flex items-center justify-between mb-1">
                  <div className="h-3 w-56 rounded bg-slate-200" />
                  <div className="h-3 w-16 rounded bg-slate-100" />
                </div>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-24 rounded-md bg-slate-200" />
                        <div className="h-4 w-28 rounded-full bg-slate-100" />
                      </div>
                      <div className="h-3 w-44 rounded bg-slate-100" />
                      <div className="h-3 w-32 rounded bg-slate-50" />
                    </div>
                    <div className="h-8 w-20 rounded-lg bg-slate-200" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.totalPendientes === 0) return null;

  const { totalPendientes, totalListasParaEmitir, totalVencidas72h, totalEnRiesgo, items } = data;

  const openNotifications = (tab?: string) => {
    window.dispatchEvent(
      new CustomEvent("open-cert-notifications", { detail: { tab } }),
    );
  };

  // Top 3 oldest pending items (sorted by elapsed business days since execution)
  const oldestItems = items.slice(0, 3);

  return (
    <div className="relative mb-8 group">
      {/* Ambient neon gradient glow behind the card */}
      <div
        className="absolute -inset-[1.5px] rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 via-purple-600 via-sky-500 to-emerald-400 opacity-25 group-hover:opacity-50 blur-[3px] transition duration-500"
        aria-hidden="true"
      />

      {/* Trendy colorful neon gradient border surrounding the entire card */}
      <div className="relative rounded-2xl p-[1.5px] bg-gradient-to-r from-amber-500 via-rose-500 via-purple-600 via-sky-500 to-emerald-400 shadow-sm group-hover:shadow-md transition-shadow">
        <div className="rounded-[14.5px] bg-white text-slate-800 p-6 relative overflow-hidden">
          {/* Dismiss button */}
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-full bg-slate-100/80 hover:bg-slate-200 border border-slate-200/80 transition-all z-20 shadow-2xs"
            title="Ocultar notificación por esta sesión"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Main Content Layout */}
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left column: Overview & Summary Metrics */}
            <div className="max-w-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  Atención
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Indicador de Emisión (72 horas)
                </span>
              </div>

              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Tienes {totalPendientes} servicios ejecutados pendientes por certificados
              </h2>

              <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                {totalListasParaEmitir > 0
                  ? `Hay ${totalListasParaEmitir} servicio(s) con lista de asistencia y calificaciones ya cargadas por el facilitador, listas para emitir.`
                  : "Revisa los plazos de emisión para mantener el cumplimiento del estándar de 72 horas hábiles."}
              </p>

              {/* Metric Badges */}
              <div className="flex items-center gap-2.5 mt-4 flex-wrap">
                <button
                  type="button"
                  onClick={() => openNotifications("lista_para_emitir")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold transition-all shadow-2xs"
                >
                  <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{totalListasParaEmitir} listas para emitir</span>
                </button>

                <button
                  type="button"
                  onClick={() => openNotifications("vencida_72h")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 text-xs font-semibold transition-all shadow-2xs"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>{totalVencidas72h} fuera de plazo (&gt;72h)</span>
                </button>

                {totalEnRiesgo > 0 && (
                  <button
                    type="button"
                    onClick={() => openNotifications("en_riesgo")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold transition-all shadow-2xs"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>{totalEnRiesgo} en riesgo</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => openNotifications()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 text-xs font-semibold transition-all shadow-2xs ml-1"
                >
                  <span>Ver todas ({totalPendientes})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Right column: 3 Oldest OSIs awaiting certificate issuance */}
            <div className="flex-1 max-w-lg lg:border-l lg:border-slate-200 lg:pl-6 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-bold uppercase tracking-wider text-slate-700">
                  3 OSIs más antiguas pendientes por emitir
                </span>
                <button
                  type="button"
                  onClick={() => openNotifications()}
                  className="text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                >
                  Ver todas →
                </button>
              </div>

              {oldestItems.map((item) => {
                const isReady = item.dataRecibidaFacilitador;
                const isOverdue = item.plazoVencido;

                return (
                  <div
                    key={item.osiId}
                    className="bg-slate-50 hover:bg-slate-100/80 rounded-xl p-3 border border-slate-200 transition-all flex items-center justify-between gap-3 group/item"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-800 px-2 py-0.5 rounded-md bg-white border border-slate-200">
                          OSI {item.nroOsi}
                        </span>
                        {isReady ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                            <FileCheck2 className="w-3 h-3 text-emerald-600" />
                            Lista para emitir
                          </span>
                        ) : isOverdue ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            +{item.brechaDias}d hábiles
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                            Día {item.diasHabiles}/3
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-bold text-slate-900 truncate mt-1">
                        {item.nombreEmpresa}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {item.servicio}
                      </p>
                    </div>

                    <Link
                      href={`/dashboard/capacitacion/generacion-certificado?osi=${encodeURIComponent(item.nroOsi)}`}
                      className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all shadow-2xs ${isReady
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                        }`}
                    >
                      <span>Generar</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover/item:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
