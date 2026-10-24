"use client";

import { useEffect } from "react";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";

export default function ShellRedirectBridge({
  targetPath,
  title = "Módulo Unificado en PRISMA",
  subtitle = "El diseño y desarrollo de servicios ahora se gestiona de manera centralizada en la plataforma principal de PRISMA.",
}: {
  targetPath: string;
  title?: string;
  subtitle?: string;
}) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const destination = targetPath;
      try {
        if (window.top && window.top !== window) {
          window.top.location.href = destination;
          return;
        }
      } catch (e) {
        // Cross-origin fallback
      }
      window.location.href = destination;
    }
  }, [targetPath]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 max-w-md w-full text-center space-y-5">
        <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <Sparkles className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500 leading-relaxed">{subtitle}</p>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs text-purple-600 font-medium py-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Redirigiendo a PRISMA...</span>
        </div>
        <div>
          <a
            href={targetPath}
            target="_top"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs rounded-xl transition-all shadow-sm shadow-purple-600/20"
          >
            <span>Haga clic aquí si no redirige automáticamente</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
