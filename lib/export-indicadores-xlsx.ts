import * as XLSX from "xlsx";
import type { GestionMensualResponse, IndicadorOsiItem, IndicadoresAggregates } from "@/types";
import { trackedMonthIndicesForYear } from "@/lib/indicadores-cutoff";

export interface ExportXlsxOptions {
  data: GestionMensualResponse;
  selectedMes: string;
  selectedMesLabel: string;
  metaPorcentaje?: number;
  observaciones?: string;
  detailItems?: IndicadorOsiItem[];
  aggregates72h?: IndicadoresAggregates | null;
}

const MESES_NOMBRES = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
];

export function exportIndicadoresToExcel({
  data,
  selectedMes,
  selectedMesLabel,
  metaPorcentaje = 85,
  observaciones,
  detailItems = [],
  aggregates72h,
}: ExportXlsxOptions) {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Matriz de Indicadores (IC-GS-DC-01) ──────────────────────
  const sheet1Data: (string | number)[][] = [
    ["SHA DE VENEZUELA, C.A."],
    ["INDICADOR DE CALIDAD - PLANIFICACIÓN Y EJECUCIÓN DE CAPACITACIÓN"],
    [`MES EVALUADO: ${selectedMesLabel.toUpperCase()}`, `AÑO: ${data.year}`, `META ESTABLECIDA: ${metaPorcentaje}%`],
    [],
    ["FACTORES A CONSIDERAR (PLANIFICACIÓN Y EJECUCIÓN)"],
    [
      "MES",
      "OSIs PROGRAMADAS",
      "OSIs RECIBIDAS",
      "OSIs EJECUTADAS EN SU MES",
      "OSIs PENDIENTES EN CURSO",
      "OSIs REZAGADAS EJECUTADAS",
      "PARTICIPANTES SEGÚN OSI",
      "PARTICIPANTES ASISTIDOS (CERTIFICADOS)",
      "CERTIFICADOS EMITIDOS",
      "CARNETS PVC EMITIDOS",
    ],
  ];

  const trackedIndices = trackedMonthIndicesForYear(data.year);

  trackedIndices.forEach((idx) => {
    const nombre = MESES_NOMBRES[idx];
    const mesKey = `${data.year}-${String(idx + 1).padStart(2, "0")}`;
    const m = data.meses.find((item) => item.mes === mesKey);
    sheet1Data.push([
      nombre,
      m ? m.osisPlanificadas : 0,
      m ? m.osisRecibidas : 0,
      m ? m.osisEjecutadasEnSuMes : 0,
      m ? m.osisPendientes : 0,
      m ? m.osisRezagadasEjecutadas : 0,
      m ? m.participantesPlanificados : 0,
      m ? m.participantesLista : 0,
      m ? m.certificados : 0,
      m ? m.pvc : 0,
    ]);
  });

  // Total Row
  sheet1Data.push([
    "TOTAL ANUAL",
    data.total.osisPlanificadas,
    data.total.osisRecibidas,
    data.total.osisEjecutadasEnSuMes,
    data.total.osisPendientes,
    data.total.osisRezagadasEjecutadas,
    data.total.participantesPlanificados,
    data.total.participantesLista,
    data.total.certificados,
    data.total.pvc,
  ]);

  sheet1Data.push([]);
  sheet1Data.push(["PLANIFICACIÓN Y EJECUCIÓN DE CURSOS (PORCENTAJES VS META)"]);
  sheet1Data.push(["MES", "% CURSOS REALIZADOS", "% CURSOS PENDIENTES", "% PARTICIPANTES ASISTIDOS", "META"]);

  trackedIndices.forEach((idx) => {
    const nombre = MESES_NOMBRES[idx];
    const mesKey = `${data.year}-${String(idx + 1).padStart(2, "0")}`;
    const m = data.meses.find((item) => item.mes === mesKey);
    if (!m) {
      sheet1Data.push([nombre, "0%", "0%", "0%", `${metaPorcentaje}%`]);
      return;
    }

    const baseCursos =
      m.osisPlanificadas > 0
        ? m.osisPlanificadas
        : m.osisRecibidas > 0
        ? m.osisRecibidas
        : 0;

    const pctR =
      baseCursos > 0
        ? Math.round((m.osisEjecutadasEnSuMes / baseCursos) * 100)
        : 0;

    const pctP =
      baseCursos > 0
        ? Math.round((m.osisPendientes / baseCursos) * 100)
        : 0;

    const pctA =
      m.participantesPlanificados > 0
        ? Math.round((m.participantesLista / m.participantesPlanificados) * 100)
        : 0;

    sheet1Data.push([nombre, `${pctR}%`, `${pctP}%`, `${pctA}%`, `${metaPorcentaje}%`]);
  });

  sheet1Data.push([]);
  sheet1Data.push(["OBSERVACIONES"]);
  sheet1Data.push([
    observaciones && observaciones.trim().length > 0
      ? observaciones.trim()
      : "",
  ]);

  if (aggregates72h) {
    sheet1Data.push([]);
    sheet1Data.push(["CUMPLIMIENTO EN 72 HORAS - EMISIÓN DE CERTIFICADOS (" + selectedMesLabel.toUpperCase() + ")"]);
    sheet1Data.push([
      "PLAZO",
      "OSIs EVALUADAS",
      "A TIEMPO (<=72H)",
      "DEMORADAS (>72H)",
      "PENDIENTES",
      "% CUMPLIMIENTO",
      "PROMEDIO DÍAS HÁBILES",
      "META",
    ]);
    sheet1Data.push([
      "3 días hábiles",
      aggregates72h.totalEvaluadas,
      aggregates72h.dentro72,
      aggregates72h.fuera72,
      aggregates72h.pendientes,
      aggregates72h.pctCumplimiento != null ? `${aggregates72h.pctCumplimiento}%` : "—",
      aggregates72h.avgDias != null ? `${aggregates72h.avgDias} d. hábiles` : "—",
      `${metaPorcentaje}%`,
    ]);
  }

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);

  // Column widths for sheet 1 (10 columns in Table 1)
  ws1["!cols"] = [
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 26 },
    { wch: 24 },
    { wch: 26 },
    { wch: 34 },
    { wch: 36 },
    { wch: 22 },
    { wch: 22 },
  ];

  XLSX.utils.book_append_sheet(wb, ws1, "Indicador Calidad");

  // ── Sheet 2: Detalle de OSIs ──────────────────────────────────────────
  // Extract all distinct OSIs from metricOsis for the selected month if not explicitly passed
  let allOsis = detailItems;
  if (allOsis.length === 0 && data.metricOsis) {
    const map = new Map<number, IndicadorOsiItem>();
    const mesSuffix = `_${selectedMes}`;
    for (const key of Object.keys(data.metricOsis)) {
      if (key.endsWith(mesSuffix)) {
        for (const item of data.metricOsis[key]) {
          if (!map.has(item.id)) map.set(item.id, item);
        }
      }
    }
    // Fallback to all if selected month had no direct keys
    if (map.size === 0) {
      for (const key of Object.keys(data.metricOsis)) {
        for (const item of data.metricOsis[key]) {
          if (!map.has(item.id)) map.set(item.id, item);
        }
      }
    }
    allOsis = Array.from(map.values()).sort((a, b) => a.nroOsi.localeCompare(b.nroOsi));
  }

  if (allOsis.length > 0) {
    const sheet2Data: (string | number)[][] = [
      [
        "Nro OSI",
        "Empresa",
        "Curso",
        "Fecha Emisión",
        "Fecha Planificada",
        "Fecha Ejecutada",
        "Part. según OSI",
        "Part. Certificados",
        "Certificados Emitidos",
        "Carnets PVC",
        "Estatus",
      ],
    ];

    allOsis.forEach((item) => {
      sheet2Data.push([
        item.nroOsi,
        item.empresa || "",
        item.servicio || "",
        item.fechaEmision || "",
        item.fechaPlanificada || "",
        item.fechaEjecutada || "",
        item.participantesPlanificados || 0,
        item.participantesCertificados || 0,
        item.certificadosCount || 0,
        item.carnetsCount || 0,
        item.estatus || "",
      ]);
    });

    const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
    ws2["!cols"] = [
      { wch: 14 },
      { wch: 32 },
      { wch: 38 },
      { wch: 15 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 14 },
      { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, ws2, "Detalle OSIs");
  }

  // Trigger download
  const filename = `Indicador_de_calidad_${data.year}_${selectedMesLabel.replace(/\s+/g, "_")}.xlsx`;
  XLSX.writeFile(wb, filename);
}
