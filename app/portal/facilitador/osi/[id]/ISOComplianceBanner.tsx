"use client";

import { useState } from "react";
import { Leaf, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";

export default function ISOComplianceBanner() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-6 rounded-2xl bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-sky-50/50 border border-emerald-200/80 p-4 transition-all shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
            <Leaf className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs sm:text-sm font-bold text-emerald-950">
                Digitalización Post-Capacitación Obligatoria (ISO 14001 / SIG)
              </p>
              <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                Eco-Friendly
              </span>
            </div>
            <p className="text-xs text-emerald-800/80">
              Carga digital requerida para trazabilidad y reducción de papel.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100/70 hover:bg-emerald-200/80 text-emerald-900 text-xs font-semibold transition-colors shrink-0"
        >
          {isOpen ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              Ocultar
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              Ver controles
            </>
          )}
        </button>
      </div>

      {isOpen && (
        <div className="mt-3.5 pt-3.5 border-t border-emerald-200/60 text-xs text-emerald-900 space-y-2 animate-in fade-in duration-150">
          <p className="leading-relaxed">
            Estimado(a) facilitador(a), le recordamos que la digitalización y automatización de toda la documentación al finalizar cada curso responde al cumplimiento de nuestro Sistema Integrado de Gestión (SIG) bajo la Norma ISO 14001:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-emerald-950">
            <li>
              <strong>Impacto Ambiental (Cláusula 6.1.2):</strong> Reducción prioritaria de residuos de papel y consumibles de impresión.
            </li>
            <li>
              <strong>Control de la Información (Cláusula 7.5.3):</strong> Garantía de integridad, legibilidad y protección contra pérdida física.
            </li>
            <li>
              <strong>Control Operacional (Cláusula 8.1):</strong> Trazabilidad digital inmediata del flujo de entrega.
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
