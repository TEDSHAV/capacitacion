"use client";

import {
  Inbox,
  CalendarCheck,
  Hourglass,
  History,
  Users,
  ClipboardList,
  Award,
  IdCard,
} from "lucide-react";
import type { GestionMesIndicadores } from "@/types";

interface Props {
  /** Bucket for the month currently selected in the matrix. */
  mes: GestionMesIndicadores;
}

function pct(part: number, total: number): string | null {
  if (total <= 0) return null;
  return `${Math.round((part / total) * 1000) / 10}%`;
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  valueColor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 text-left w-full">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <span className="text-xs font-medium text-gray-500 leading-tight">
          {label}
        </span>
      </div>
      <div>
        <p
          className={`text-2xl font-bold leading-none ${valueColor ?? "text-gray-900"}`}
        >
          {value}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export default function GestionKpiCards({ mes }: Props) {
  const cumplimiento = pct(mes.osisEjecutadasEnSuMes, mes.osisPlanificadas);
  const asistencia = pct(mes.participantesLista, mes.participantesPlanificados);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KpiCard
        icon={Inbox}
        label="OSIs recibidas"
        value={mes.osisRecibidas}
        sub="Por fecha de emisión de la OSI"
        color="bg-sky-100 text-sky-700"
      />
      <KpiCard
        icon={CalendarCheck}
        label="Ejecutadas en su mes"
        value={mes.osisEjecutadasEnSuMes}
        sub={
          cumplimiento
            ? `${cumplimiento} de ${mes.osisPlanificadas} planificadas`
            : "Sin OSIs planificadas este mes"
        }
        color="bg-emerald-100 text-emerald-700"
        valueColor="text-emerald-600"
      />
      <KpiCard
        icon={Hourglass}
        label="Pendientes del mes"
        value={mes.osisPendientes}
        sub={
          mes.osisPendientesVencidas > 0
            ? `${mes.osisPendientesVencidas} con fecha ya pasada`
            : "Ninguna con fecha pasada"
        }
        color="bg-amber-100 text-amber-700"
        valueColor={mes.osisPendientes > 0 ? "text-amber-600" : undefined}
      />
      <KpiCard
        icon={History}
        label="Ejecutadas de meses anteriores"
        value={mes.osisRezagadasEjecutadas}
        sub="Planificadas antes, ejecutadas en este mes"
        color="bg-indigo-100 text-indigo-700"
        valueColor="text-indigo-600"
      />
      <KpiCard
        icon={Users}
        label="Participantes planificados"
        value={mes.participantesPlanificados}
        sub="Según las OSIs planificadas del mes"
        color="bg-gray-100 text-gray-600"
      />
      <KpiCard
        icon={ClipboardList}
        label="Participantes asistidos"
        value={mes.participantesLista}
        sub={
          asistencia
            ? `${asistencia} de los planificados`
            : "Certificados emitidos para OSIs del mes"
        }
        color="bg-violet-100 text-violet-700"
      />
      <KpiCard
        icon={Award}
        label="Certificados emitidos"
        value={mes.certificados}
        sub="Por fecha de emisión del certificado"
        color="bg-teal-100 text-teal-700"
      />
      <KpiCard
        icon={IdCard}
        label="PVC (carnets) emitidos"
        value={mes.pvc}
        sub="Por fecha de emisión del carnet"
        color="bg-orange-100 text-orange-700"
      />
    </div>
  );
}
