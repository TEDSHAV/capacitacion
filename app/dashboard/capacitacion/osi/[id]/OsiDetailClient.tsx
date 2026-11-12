"use client";

import { useEffect, useState } from "react";
import { OsiDocumentView } from "@/lib/osi-formato/osi-document-view";
import type { OsiPreviewData } from "@/lib/osi-formato/osi-preview-data";
import { getOsiPreviewData } from "@/app/actions/osi";
import { Loader2, Printer, ExternalLink, AlertCircle, Building2, FileText, X } from "lucide-react";

interface Props {
  osiId: number;
}

export function OsiDetailClient({ osiId }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OsiPreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    getOsiPreviewData(osiId)
      .then((res) => {
        if (!isMounted) return;
        if (res.error || !res.data) {
          setError(res.error || "No se pudo cargar el formato oficial de la orden de servicio");
        } else {
          setData(res.data);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Error inesperado");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [osiId]);

  const shellUrl = process.env.NEXT_PUBLIC_SHELL_URL || "https://prisma.shadevenezuela.com.ve";
  const externalPreviewUrl = `${shellUrl}/consulta-osi/preview/${osiId}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center max-w-sm w-full shadow-sm text-center">
          <Loader2 className="w-10 h-10 text-sky-600 animate-spin mb-4" />
          <h2 className="text-sm font-bold text-slate-800">Cargando Formato Oficial</h2>
          <p className="text-xs text-slate-500 mt-1">Obteniendo datos de la OSI #{osiId}...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-red-200 p-8 flex flex-col items-center max-w-md w-full shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Error al cargar la orden de servicio</h2>
          <p className="text-xs text-red-600 mt-1">{error || "No se encontró la orden solicitada"}</p>
          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Reintentar
            </button>
            <button
              onClick={() => window.close()}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Cerrar pestaña
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* ── Top Header Toolbar (Hidden in Print) ── */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-4 print:hidden shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-sky-50 text-sky-700 rounded-xl border border-sky-200 shrink-0">
            <FileText className="w-5 h-5 text-sky-600" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">
                Formato Oficial de la OSI
              </h1>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                N° {data.nroOsi || osiId}
              </span>
            </div>
            {data.nombreEmpresa && (
              <p className="text-xs text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-medium text-slate-700 truncate">{data.nombreEmpresa}</span>
                {data.servicio && <span className="text-slate-400">· {data.servicio}</span>}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={externalPreviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shadow-2xs"
            title="Abrir en PRISMA Consulta OSI"
          >
            <span>PRISMA Shell</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Imprimir formato o guardar en PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir / PDF</span>
          </button>

          <button
            type="button"
            onClick={() => window.close()}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Cerrar pestaña"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ── Document View ── */}
      <main className="flex-1 p-4 sm:p-8 flex justify-center print:p-0 print:m-0 print:bg-white overflow-auto">
        <div className="bg-white shadow-xl border border-slate-300 rounded-sm print:shadow-none print:border-none">
          <OsiDocumentView
            data={data}
            assets={{
              logoSrc: "/osi/a3.png",
              footerSrc: "/osi/pie-horizontal.png",
            }}
          />
        </div>
      </main>
    </div>
  );
}

