import type { GestionMesIndicadores } from "@/types";

export function monthsInRange(
  meses: GestionMesIndicadores[],
  mesDesde: string,
  mesHasta: string
): GestionMesIndicadores[] {
  const [from, to] = mesDesde <= mesHasta ? [mesDesde, mesHasta] : [mesHasta, mesDesde];
  return meses.filter((m) => m.mes >= from && m.mes <= to);
}

export function sumMeses(meses: GestionMesIndicadores[], label: string): GestionMesIndicadores {
  const sum = (key: keyof GestionMesIndicadores) =>
    meses.reduce((acc, m) => acc + ((m[key] as number) || 0), 0);
  return {
    mes: "range",
    label,
    osisRecibidas: sum("osisRecibidas"),
    osisRecibidasMesesPosteriores: sum("osisRecibidasMesesPosteriores"),
    osisPlanificadas: sum("osisPlanificadas"),
    osisEjecutadasEnSuMes: sum("osisEjecutadasEnSuMes"),
    osisPendientes: sum("osisPendientes"),
    osisPendientesVencidas: sum("osisPendientesVencidas"),
    osisPendientesProximoMes: sum("osisPendientesProximoMes"),
    osisRezagadasEjecutadas: sum("osisRezagadasEjecutadas"),
    osisEjecutadasOtroMes: sum("osisEjecutadasOtroMes"),
    participantesPlanificados: sum("participantesPlanificados"),
    participantesLista: sum("participantesLista"),
    certificados: sum("certificados"),
    pvc: sum("pvc"),
    certificadosEmitidos: sum("certificadosEmitidos"),
    pvcEmitidos: sum("pvcEmitidos"),
  };
}

export function rangeLabel(labelDesde: string, labelHasta: string, same: boolean) {
  return same ? labelDesde : `${labelDesde} - ${labelHasta}`;
}
