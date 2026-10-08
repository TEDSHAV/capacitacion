import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { GestionMensualResponse, GestionMesIndicadores, IndicadoresAggregates } from "@/types";
import { trackedMonthIndicesForYear } from "@/lib/indicadores-cutoff";
import { sumMeses } from "@/lib/indicadores-range";

interface Props {
  data: GestionMensualResponse;
  selectedMes: string;
  mesHasta?: string;
  selectedMesLabel: string;
  metaPorcentaje?: number;
  observaciones?: string;
  aggregates72h?: IndicadoresAggregates | null;
  generatedBy?: string;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 60,
    paddingHorizontal: 24,
    fontSize: 7,
    fontFamily: "Helvetica",
    color: "#1e293b",
    backgroundColor: "#ffffff",
  },
  headerTable: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#0f172a",
    marginBottom: 6,
  },
  headerLogoCell: {
    width: "30%",
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderColor: "#0f172a",
  },
  logoImage: {
    width: 105,
  },
  headerTitleCell: {
    width: "70%",
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  docTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    textAlign: "center",
  },
  docScopeTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#0369a1",
    textAlign: "center",
    marginTop: 3,
  },
  scopeBox: {
    borderWidth: 1,
    borderColor: "#0f172a",
    padding: 4,
    marginBottom: 6,
    backgroundColor: "#f8fafc",
  },
  scopeText: {
    fontSize: 6,
    textAlign: "center",
    color: "#334155",
    lineHeight: 1.3,
  },
  statusBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#0369a1",
    color: "#ffffff",
    paddingVertical: 3,
    paddingHorizontal: 8,
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    marginBottom: 6,
    borderRadius: 2,
  },
  sectionTitleBox: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#0f172a",
    paddingVertical: 2.5,
    alignItems: "center",
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    textTransform: "uppercase",
  },
  table: {
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: "#0f172a",
    marginBottom: 6,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#0f172a",
  },
  tableRowHighlighted: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#0f172a",
    backgroundColor: "#e0f2fe",
  },
  tableRowTotal: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#0f172a",
    backgroundColor: "#f8fafc",
  },
  thSuper: {
    borderRightWidth: 1,
    borderColor: "#0f172a",
    paddingVertical: 2,
    fontFamily: "Helvetica-Bold",
    fontSize: 6.5,
    textAlign: "center",
  },
  thSub: {
    borderRightWidth: 1,
    borderColor: "#0f172a",
    padding: 2,
    fontFamily: "Helvetica-Bold",
    fontSize: 5.5,
    textAlign: "center",
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
  },
  tdMes: {
    width: "12%",
    borderRightWidth: 1,
    borderColor: "#0f172a",
    padding: 2,
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    textAlign: "left",
  },
  tdNum: {
    width: "11%",
    borderRightWidth: 1,
    borderColor: "#0f172a",
    padding: 2,
    fontSize: 6,
    textAlign: "center",
  },
  tdTotalMes: {
    width: "12%",
    borderRightWidth: 1,
    borderColor: "#0f172a",
    padding: 2,
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    textAlign: "left",
  },
  tdTotalNum: {
    width: "11%",
    borderRightWidth: 1,
    borderColor: "#0f172a",
    padding: 2,
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  table2Row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#0f172a",
  },
  td2Mes: {
    width: "16%",
    borderRightWidth: 1,
    borderColor: "#0f172a",
    padding: 2,
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
  },
  td2Pct: {
    width: "21%",
    borderRightWidth: 1,
    borderColor: "#0f172a",
    padding: 2,
    fontSize: 6,
    textAlign: "center",
  },
  td2Meta: {
    width: "28%",
    borderRightWidth: 1,
    borderColor: "#0f172a",
    padding: 2,
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    color: "#0369a1",
  },
  obsBox: {
    borderWidth: 1,
    borderColor: "#0f172a",
    marginBottom: 8,
  },
  obsHeader: {
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderColor: "#0f172a",
    paddingVertical: 2.5,
    paddingHorizontal: 4,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    color: "#0f172a",
  },
  obsContent: {
    padding: 5,
    fontSize: 6.5,
    color: "#1e293b",
    lineHeight: 1.35,
    minHeight: 38,
  },
  summaryPillsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 6,
  },
  summaryPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 3,
    padding: 4,
    backgroundColor: "#f8fafc",
    alignItems: "center",
  },
  summaryPillLabel: {
    fontSize: 5.5,
    color: "#64748b",
    marginBottom: 1,
    textTransform: "uppercase",
  },
  summaryPillValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  summaryPillSub: {
    fontSize: 5,
    color: "#0284c7",
    marginTop: 1,
  },
  cumplimiento72Box: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#0f172a",
    backgroundColor: "#f8fafc",
    marginBottom: 6,
  },
  cumplimiento72Col: {
    flex: 1,
    borderRightWidth: 1,
    borderColor: "#cbd5e1",
    paddingVertical: 3,
    paddingHorizontal: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  cumplimiento72Label: {
    fontSize: 5,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
    marginBottom: 1,
    textAlign: "center",
  },
  cumplimiento72Val: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    textAlign: "center",
  },
  footerImage: {
    position: "absolute",
    bottom: 12,
    left: 24,
    right: 24,
    height: 40,
  },
});

const MESES_NOMBRES = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
];

export default function IndicadorCalidadPdfDocument({
  data,
  selectedMes,
  mesHasta = selectedMes,
  selectedMesLabel,
  metaPorcentaje = 85,
  observaciones,
  aggregates72h,
  generatedBy,
}: Props) {
  // Only include tracked months (e.g. Agosto to Diciembre for 2026; Ene-Jul are omitted)
  const rangeFrom = selectedMes <= mesHasta ? selectedMes : mesHasta;
  const rangeTo = selectedMes <= mesHasta ? mesHasta : selectedMes;
  const trackedIndices = trackedMonthIndicesForYear(data.year).filter((idx) => {
    const key = `${data.year}-${String(idx + 1).padStart(2, "0")}`;
    return key >= rangeFrom && key <= rangeTo;
  });
  const fullMonths: GestionMesIndicadores[] = trackedIndices.map((idx) => {
    const mesKey = `${data.year}-${String(idx + 1).padStart(2, "0")}`;
    const found = data.meses.find((m) => m.mes === mesKey);
    if (found) return found;
    return {
      mes: mesKey,
      label: MESES_NOMBRES[idx],
      osisRecibidas: 0,
      osisRecibidasMesesPosteriores: 0,
      osisPlanificadas: 0,
      osisEjecutadasEnSuMes: 0,
      osisPendientes: 0,
      osisPendientesVencidas: 0,
      osisPendientesProximoMes: 0,
      osisRezagadasEjecutadas: 0,
      osisEjecutadasOtroMes: 0,
      participantesPlanificados: 0,
      participantesLista: 0,
      certificados: 0,
      pvc: 0,
      certificadosEmitidos: 0,
      pvcEmitidos: 0,
    };
  });

  const total = sumMeses(fullMonths, "Total");
  const mesData = total;

  // Base for course percentages: OSIs Planificadas (courses planned to be executed that month)
  // fallback to OSIs Recibidas if planificadas is 0
  const baseCursosMes =
    mesData.osisPlanificadas > 0
      ? mesData.osisPlanificadas
      : mesData.osisRecibidas > 0
      ? mesData.osisRecibidas
      : 0;

  const pctRealizadas =
    baseCursosMes > 0
      ? Math.round((mesData.osisEjecutadasEnSuMes / baseCursosMes) * 100)
      : 0;

  const pctPendientes =
    baseCursosMes > 0
      ? Math.round((mesData.osisPendientes / baseCursosMes) * 100)
      : 0;

  const pctAsistidos =
    mesData.participantesPlanificados > 0
      ? Math.round(
          (mesData.participantesLista / mesData.participantesPlanificados) * 100
        )
      : 0;

  return (
    <Document title={`Indicador_de_calidad_${data.year}`}>
      <Page size="LETTER" style={styles.page}>
        {/* Header Table: Logo and Middle Title Section Only */}
        <View style={styles.headerTable}>
          <View style={styles.headerLogoCell}>
            <Image style={styles.logoImage} src="/pdf/sha-logo.png" />
          </View>
          <View style={styles.headerTitleCell}>
            <Text style={styles.docTitle}>INDICADOR DE CALIDAD</Text>
            <Text style={styles.docScopeTitle}>
              PLANIFICACIÓN Y EJECUCIÓN DE CAPACITACIÓN
            </Text>
          </View>
        </View>

        {/* Scope Text */}
        <View style={styles.scopeBox}>
          <Text style={styles.scopeText}>
            Cumplir con la planificación y ejecución de los Cursos de Capacitación que serán impartidos por SHA DE VENEZUELA, C.A., apegándose a las leyes, reglamentos, normas nacionales y estándares internacionales vigentes.
          </Text>
        </View>

        {/* Status Bar */}
        <View style={styles.statusBar}>
          <Text>{fullMonths.length > 1 ? "PERIODO" : "MES"}: {selectedMesLabel.toUpperCase()}</Text>
          <Text>AÑO: {data.year}</Text>
          <Text>META: {metaPorcentaje}%</Text>
        </View>

        {/* KPI Mini Summary Cards for the active period */}
        <View style={styles.summaryPillsRow}>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryPillLabel}>% Cursos Realizados</Text>
            <Text
              style={[
                styles.summaryPillValue,
                { color: pctRealizadas >= metaPorcentaje ? "#15803d" : "#b91c1c" },
              ]}
            >
              {pctRealizadas}%
            </Text>
            <Text style={styles.summaryPillSub}>
              {mesData.osisEjecutadasEnSuMes} de {baseCursosMes} cursos planif.
            </Text>
          </View>

          <View style={styles.summaryPill}>
            <Text style={styles.summaryPillLabel}>% Cursos Pendientes</Text>
            <Text style={[styles.summaryPillValue, { color: pctPendientes > 0 ? "#b45309" : "#15803d" }]}>
              {pctPendientes}%
            </Text>
            <Text style={styles.summaryPillSub}>
              {mesData.osisPendientes} pendientes · {mesData.osisEjecutadasOtroMes} ejec. otro mes
            </Text>
          </View>

          <View style={styles.summaryPill}>
            <Text style={styles.summaryPillLabel}>% Part. Certificados / Estimados</Text>
            <Text
              style={[
                styles.summaryPillValue,
                { color: pctAsistidos >= metaPorcentaje ? "#15803d" : "#b91c1c" },
              ]}
            >
              {pctAsistidos}%
            </Text>
            <Text style={styles.summaryPillSub}>
              {mesData.participantesLista} de {mesData.participantesPlanificados} part.
            </Text>
          </View>

          <View style={styles.summaryPill}>
            <Text style={styles.summaryPillLabel}>Documentos de los cursos ejecutados</Text>
            <Text style={styles.summaryPillValue}>{mesData.participantesLista + mesData.pvc}</Text>
            <Text style={styles.summaryPillSub}>
              {mesData.participantesLista} Cert. / {mesData.pvc} Carnets
            </Text>
          </View>
        </View>

        {/* Table 1: FACTORES A CONSIDERAR */}
        <View style={styles.sectionTitleBox}>
          <Text style={styles.sectionTitle}>Factores a Considerar</Text>
        </View>

        <View style={styles.table}>
          {/* Super-Header */}
          <View style={styles.tableRow}>
            <View style={[styles.thSuper, { width: "10%", backgroundColor: "#e2e8f0" }]}>
              <Text>MES</Text>
            </View>
            <View style={[styles.thSuper, { width: "58%", backgroundColor: "#fef3c7", color: "#92400e" }]}>
              <Text>PLANIFICACIÓN Y EJECUCIÓN (POR MES PROGRAMADO)</Text>
            </View>
            <View style={[styles.thSuper, { width: "32%", backgroundColor: "#e0f2fe", color: "#0369a1" }]}>
              <Text>PARTICIPANTES (CURSOS EJECUTADOS EN EL MES)</Text>
            </View>
          </View>

          {/* Sub-Header */}
          <View style={styles.tableRow}>
            <View style={[styles.thSub, { width: "10%" }]}>
              <Text>MES</Text>
            </View>
            <View style={[styles.thSub, { width: "10%" }]}>
              <Text>OSIS PROG.</Text>
            </View>
            <View style={[styles.thSub, { width: "10%" }]}>
              <Text>EJEC. EN MES</Text>
            </View>
            <View style={[styles.thSub, { width: "10%" }]}>
              <Text>EJEC. OTRO MES</Text>
            </View>
            <View style={[styles.thSub, { width: "9%" }]}>
              <Text>PENDIENTES</Text>
            </View>
            <View style={[styles.thSub, { width: "9%" }]}>
              <Text>REZAGADAS</Text>
            </View>
            <View style={[styles.thSub, { width: "10%" }]}>
              <Text>OSIS RECIB.</Text>
            </View>
            <View style={[styles.thSub, { width: "11%" }]}>
              <Text>PART. ESTIM.</Text>
            </View>
            <View style={[styles.thSub, { width: "11%" }]}>
              <Text>PART. CERTIF.</Text>
            </View>
            <View style={[styles.thSub, { width: "10%" }]}>
              <Text>CARNETS PVC</Text>
            </View>
          </View>

          {/* Month Rows */}
          {fullMonths.map((m) => {
            const isSelected = fullMonths.length === 1;
            const monthIdx = parseInt(m.mes.split("-")[1], 10) - 1;
            const nombreMes = MESES_NOMBRES[monthIdx] || m.label.toUpperCase();
            return (
              <View
                key={m.mes}
                style={isSelected ? styles.tableRowHighlighted : styles.tableRow}
              >
                <Text style={[styles.tdMes, { width: "10%" }]}>{nombreMes}</Text>
                <Text style={[styles.tdNum, { width: "10%" }]}>{m.osisPlanificadas || 0}</Text>
                <Text style={[styles.tdNum, { width: "10%" }]}>{m.osisEjecutadasEnSuMes || 0}</Text>
                <Text style={[styles.tdNum, { width: "10%" }]}>{m.osisEjecutadasOtroMes || 0}</Text>
                <Text style={[styles.tdNum, { width: "9%" }]}>{m.osisPendientes || 0}</Text>
                <Text style={[styles.tdNum, { width: "9%" }]}>{m.osisRezagadasEjecutadas || 0}</Text>
                <Text style={[styles.tdNum, { width: "10%" }]}>{m.osisRecibidas || 0}</Text>
                <Text style={[styles.tdNum, { width: "11%" }]}>{m.participantesPlanificados || 0}</Text>
                <Text style={[styles.tdNum, { width: "11%" }]}>{m.participantesLista || 0}</Text>
                <Text style={[styles.tdNum, { width: "10%" }]}>{m.pvc || 0}</Text>
              </View>
            );
          })}

          {/* TOTAL Row */}
          <View style={styles.tableRowTotal}>
            <Text style={[styles.tdTotalMes, { width: "10%" }]}>TOTAL</Text>
            <Text style={[styles.tdTotalNum, { width: "10%" }]}>{total.osisPlanificadas}</Text>
            <Text style={[styles.tdTotalNum, { width: "10%" }]}>{total.osisEjecutadasEnSuMes}</Text>
            <Text style={[styles.tdTotalNum, { width: "10%" }]}>{total.osisEjecutadasOtroMes}</Text>
            <Text style={[styles.tdTotalNum, { width: "9%" }]}>{total.osisPendientes}</Text>
            <Text style={[styles.tdTotalNum, { width: "9%" }]}>{total.osisRezagadasEjecutadas}</Text>
            <Text style={[styles.tdTotalNum, { width: "10%" }]}>{total.osisRecibidas}</Text>
            <Text style={[styles.tdTotalNum, { width: "11%" }]}>{total.participantesPlanificados}</Text>
            <Text style={[styles.tdTotalNum, { width: "11%" }]}>{total.participantesLista}</Text>
            <Text style={[styles.tdTotalNum, { width: "10%" }]}>{total.pvc}</Text>
          </View>
        </View>
        <Text style={{ fontSize: 5.5, color: "#475569", marginTop: 2, marginBottom: 6, lineHeight: 1.3 }}>
          Programadas = Ejec. en mes + Ejec. otro mes + Pendientes. Rezagadas: programadas en meses
          anteriores cuya ejecución inició tarde y culminó en este mes (los cursos multi-mes que iniciaron a
          tiempo no se consideran rezagados). OSIs recibidas se cuentan por fecha de emisión de Negocios.
          Participantes estimados (SOLPED/OSI), certificados y carnets corresponden a los cursos
          ejecutados en el mes, sin importar la fecha de emisión del documento. Documentos emitidos en el
          periodo por fecha de emisión: {total.certificadosEmitidos} certificados · {total.pvcEmitidos} carnets PVC.
        </Text>

        {/* Table 2: PLANIFICACIÓN Y EJECUCIÓN (Porcentajes) */}
        <View style={styles.sectionTitleBox}>
          <Text style={styles.sectionTitle}>Planificación y Ejecución de Cursos (% vs Meta {metaPorcentaje}%)</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableRow}>
            <View style={[styles.thSub, { width: "16%" }]}>
              <Text>MES</Text>
            </View>
            <View style={[styles.thSub, { width: "21%" }]}>
              <Text>% EJECUTADOS EN SU MES</Text>
            </View>
            <View style={[styles.thSub, { width: "21%" }]}>
              <Text>% EJECUTADOS EN OTRO MES</Text>
            </View>
            <View style={[styles.thSub, { width: "21%" }]}>
              <Text>% PENDIENTES</Text>
            </View>
            <View style={[styles.thSub, { width: "21%" }]}>
              <Text>% PART. CERTIFICADOS</Text>
            </View>
          </View>

          {fullMonths.map((m) => {
            const isSelected = fullMonths.length === 1;
            const monthIdx = parseInt(m.mes.split("-")[1], 10) - 1;
            const nombreMes = MESES_NOMBRES[monthIdx] || m.label.toUpperCase();
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

            const pctO =
              baseCursos > 0
                ? Math.round((m.osisEjecutadasOtroMes / baseCursos) * 100)
                : 0;

            const pctA =
              m.participantesPlanificados > 0
                ? Math.round(
                    (m.participantesLista / m.participantesPlanificados) * 100
                  )
                : 0;

            return (
              <View
                key={`p-${m.mes}`}
                style={isSelected ? styles.tableRowHighlighted : styles.table2Row}
              >
                <Text style={styles.td2Mes}>{nombreMes}</Text>
                <Text style={styles.td2Pct}>{pctR}%</Text>
                <Text style={styles.td2Pct}>{pctO}%</Text>
                <Text style={styles.td2Pct}>{pctP}%</Text>
                <Text style={styles.td2Pct}>{pctA}%</Text>
              </View>
            );
          })}
        </View>

        {/* Section 3: CUMPLIMIENTO EN 72 HORAS */}
        <View style={styles.sectionTitleBox}>
          <Text style={styles.sectionTitle}>
            Cumplimiento en 72 Horas — Emisión de Certificados ({selectedMesLabel.toUpperCase()})
          </Text>
        </View>

        <View style={styles.cumplimiento72Box}>
          <View style={styles.cumplimiento72Col}>
            <Text style={styles.cumplimiento72Label}>PLAZO</Text>
            <Text style={styles.cumplimiento72Val}>3 días hábiles</Text>
          </View>
          <View style={styles.cumplimiento72Col}>
            <Text style={styles.cumplimiento72Label}>OSIS EVALUADAS</Text>
            <Text style={styles.cumplimiento72Val}>{aggregates72h?.totalEvaluadas ?? 0}</Text>
          </View>
          <View style={styles.cumplimiento72Col}>
            <Text style={styles.cumplimiento72Label}>{"A TIEMPO (<=72H)"}</Text>
            <Text style={[styles.cumplimiento72Val, { color: "#15803d" }]}>
              {aggregates72h?.dentro72 ?? 0}
            </Text>
          </View>
          <View style={styles.cumplimiento72Col}>
            <Text style={styles.cumplimiento72Label}>{"DEMORADAS (>72H)"}</Text>
            <Text style={[styles.cumplimiento72Val, { color: (aggregates72h?.fuera72 ?? 0) > 0 ? "#b91c1c" : "#15803d" }]}>
              {aggregates72h?.fuera72 ?? 0}
            </Text>
          </View>
          <View style={styles.cumplimiento72Col}>
            <Text style={styles.cumplimiento72Label}>PENDIENTES</Text>
            <Text style={[styles.cumplimiento72Val, { color: (aggregates72h?.pendientes ?? 0) > 0 ? "#b45309" : "#15803d" }]}>
              {aggregates72h?.pendientes ?? 0}
            </Text>
          </View>
          <View style={styles.cumplimiento72Col}>
            <Text style={styles.cumplimiento72Label}>% CUMPLIMIENTO</Text>
            <Text
              style={[
                styles.cumplimiento72Val,
                {
                  color:
                    (aggregates72h?.pctCumplimiento ?? 0) >= metaPorcentaje
                      ? "#15803d"
                      : "#b91c1c",
                },
              ]}
            >
              {aggregates72h?.pctCumplimiento != null ? `${aggregates72h.pctCumplimiento}%` : "—"}
            </Text>
          </View>
          <View style={[styles.cumplimiento72Col, { borderRightWidth: 0 }]}>
            <Text style={styles.cumplimiento72Label}>PROMEDIO DÍAS</Text>
            <Text style={styles.cumplimiento72Val}>
              {aggregates72h?.avgDias != null ? `${aggregates72h.avgDias} d. hábiles` : "—"}
            </Text>
          </View>
        </View>

        {/* Section: OBSERVACIONES */}
        <View style={styles.obsBox}>
          <Text style={styles.obsHeader}>OBSERVACIONES</Text>
          <Text style={styles.obsContent}>
            {observaciones && observaciones.trim().length > 0
              ? observaciones.trim()
              : ""}
          </Text>
        </View>

        {/* Document Footer (fixed at bottom) */}
        <Image style={styles.footerImage} src="/pdf/sha-footer.png" fixed />
      </Page>
    </Document>
  );
}
