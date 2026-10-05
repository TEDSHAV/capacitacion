import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { GestionMensualResponse, GestionMesIndicadores } from "@/types";

interface Props {
  data: GestionMensualResponse;
  selectedMes: string;
  selectedMesLabel: string;
  metaPorcentaje?: number;
  observaciones?: string;
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
    width: "28%",
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
  selectedMesLabel,
  metaPorcentaje = 85,
  observaciones,
  generatedBy,
}: Props) {
  // Normalize 12 month data (filling with zeroes if month is not tracked or empty)
  const fullMonths: GestionMesIndicadores[] = MESES_NOMBRES.map((nombre, idx) => {
    const mesKey = `${data.year}-${String(idx + 1).padStart(2, "0")}`;
    const found = data.meses.find((m) => m.mes === mesKey);
    if (found) return found;
    return {
      mes: mesKey,
      label: nombre,
      osisRecibidas: 0,
      osisPlanificadas: 0,
      osisEjecutadasEnSuMes: 0,
      osisPendientes: 0,
      osisPendientesVencidas: 0,
      osisPendientesProximoMes: 0,
      osisRezagadasEjecutadas: 0,
      participantesPlanificados: 0,
      participantesLista: 0,
      certificados: 0,
      pvc: 0,
    };
  });

  const total = data.total;

  // Selected month calculations
  const mesData =
    data.meses.find((m) => m.mes === selectedMes) ||
    data.meses[data.meses.length - 1] ||
    total;

  // Base for course percentages: OSIs Recibidas (matching original ISO indicator format)
  // fallback to OSIs Planificadas if recibidas is 0
  const baseCursosMes =
    mesData.osisRecibidas > 0
      ? mesData.osisRecibidas
      : mesData.osisPlanificadas > 0
      ? mesData.osisPlanificadas
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
              PLANIFICACIÓN Y EJECUCIÓN DE LA CAPACITACIÓN
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
          <Text>MES: {selectedMesLabel.toUpperCase()}</Text>
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
            <Text style={styles.summaryPillSub}>Meta: {metaPorcentaje}%</Text>
          </View>

          <View style={styles.summaryPill}>
            <Text style={styles.summaryPillLabel}>% Cursos Pendientes</Text>
            <Text style={[styles.summaryPillValue, { color: pctPendientes > 0 ? "#b45309" : "#15803d" }]}>
              {pctPendientes}%
            </Text>
            <Text style={styles.summaryPillSub}>{mesData.osisPendientes} OSI pendientes</Text>
          </View>

          <View style={styles.summaryPill}>
            <Text style={styles.summaryPillLabel}>% Part. Asistidos / Según OSI</Text>
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
            <Text style={styles.summaryPillLabel}>Documentos Emitidos</Text>
            <Text style={styles.summaryPillValue}>{mesData.certificados + mesData.pvc}</Text>
            <Text style={styles.summaryPillSub}>
              {mesData.certificados} Cert. / {mesData.pvc} Carnets
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
            <View style={[styles.thSuper, { width: "12%", backgroundColor: "#e2e8f0" }]}>
              <Text>MES</Text>
            </View>
            <View style={[styles.thSuper, { width: "55%", backgroundColor: "#fef3c7", color: "#92400e" }]}>
              <Text>PLANIFICACIÓN</Text>
            </View>
            <View style={[styles.thSuper, { width: "33%", backgroundColor: "#e0f2fe", color: "#0369a1" }]}>
              <Text>EJECUCIÓN</Text>
            </View>
          </View>

          {/* Sub-Header */}
          <View style={styles.tableRow}>
            <View style={[styles.thSub, { width: "12%" }]}>
              <Text>MES</Text>
            </View>
            <View style={[styles.thSub, { width: "11%" }]}>
              <Text>OSIS RECIBIDAS</Text>
            </View>
            <View style={[styles.thSub, { width: "11%" }]}>
              <Text>OSIS EJEC. EN SU MES</Text>
            </View>
            <View style={[styles.thSub, { width: "11%" }]}>
              <Text>OSIS PEND. EN CURSO</Text>
            </View>
            <View style={[styles.thSub, { width: "11%" }]}>
              <Text>OSIS REZAG. EJECUTADAS</Text>
            </View>
            <View style={[styles.thSub, { width: "11%" }]}>
              <Text>PARTICIP. SEGÚN OSI</Text>
            </View>
            <View style={[styles.thSub, { width: "11%" }]}>
              <Text>PARTICIP. ASISTIDOS</Text>
            </View>
            <View style={[styles.thSub, { width: "11%" }]}>
              <Text>CERTIFIC. IMPRESOS</Text>
            </View>
            <View style={[styles.thSub, { width: "11%" }]}>
              <Text>PVC IMPRESOS</Text>
            </View>
          </View>

          {/* Month Rows */}
          {fullMonths.map((m, idx) => {
            const isSelected = m.mes === selectedMes;
            return (
              <View
                key={m.mes}
                style={isSelected ? styles.tableRowHighlighted : styles.tableRow}
              >
                <Text style={styles.tdMes}>{MESES_NOMBRES[idx]}</Text>
                <Text style={styles.tdNum}>{m.osisRecibidas || 0}</Text>
                <Text style={styles.tdNum}>{m.osisEjecutadasEnSuMes || 0}</Text>
                <Text style={styles.tdNum}>{m.osisPendientes || 0}</Text>
                <Text style={styles.tdNum}>{m.osisRezagadasEjecutadas || 0}</Text>
                <Text style={styles.tdNum}>{m.participantesPlanificados || 0}</Text>
                <Text style={styles.tdNum}>{m.participantesLista || 0}</Text>
                <Text style={styles.tdNum}>{m.certificados || 0}</Text>
                <Text style={styles.tdNum}>{m.pvc || 0}</Text>
              </View>
            );
          })}

          {/* TOTAL Row */}
          <View style={styles.tableRowTotal}>
            <Text style={styles.tdTotalMes}>TOTAL</Text>
            <Text style={styles.tdTotalNum}>{total.osisRecibidas}</Text>
            <Text style={styles.tdTotalNum}>{total.osisEjecutadasEnSuMes}</Text>
            <Text style={styles.tdTotalNum}>{total.osisPendientes}</Text>
            <Text style={styles.tdTotalNum}>{total.osisRezagadasEjecutadas}</Text>
            <Text style={styles.tdTotalNum}>{total.participantesPlanificados}</Text>
            <Text style={styles.tdTotalNum}>{total.participantesLista}</Text>
            <Text style={styles.tdTotalNum}>{total.certificados}</Text>
            <Text style={styles.tdTotalNum}>{total.pvc}</Text>
          </View>
        </View>

        {/* Table 2: PLANIFICACIÓN Y EJECUCIÓN (Porcentajes) */}
        <View style={styles.sectionTitleBox}>
          <Text style={styles.sectionTitle}>Planificación y Ejecución de Cursos (% vs Meta {metaPorcentaje}%)</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableRow}>
            <View style={[styles.thSub, { width: "16%" }]}>
              <Text>MES</Text>
            </View>
            <View style={[styles.thSub, { width: "28%" }]}>
              <Text>% CURSOS REALIZADOS</Text>
            </View>
            <View style={[styles.thSub, { width: "28%" }]}>
              <Text>% CURSOS PENDIENTES</Text>
            </View>
            <View style={[styles.thSub, { width: "28%" }]}>
              <Text>% PARTICIPANTES ASISTIDOS</Text>
            </View>
          </View>

          {fullMonths.map((m, idx) => {
            const isSelected = m.mes === selectedMes;
            const baseCursos =
              m.osisRecibidas > 0
                ? m.osisRecibidas
                : m.osisPlanificadas > 0
                ? m.osisPlanificadas
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
                ? Math.round(
                    (m.participantesLista / m.participantesPlanificados) * 100
                  )
                : 0;

            return (
              <View
                key={`p-${m.mes}`}
                style={isSelected ? styles.tableRowHighlighted : styles.table2Row}
              >
                <Text style={styles.td2Mes}>{MESES_NOMBRES[idx]}</Text>
                <Text style={styles.td2Pct}>{pctR}%</Text>
                <Text style={styles.td2Pct}>{pctP}%</Text>
                <Text style={styles.td2Pct}>{pctA}%</Text>
              </View>
            );
          })}
        </View>

        {/* Section: OBSERVACIONES */}
        <View style={styles.obsBox}>
          <Text style={styles.obsHeader}>OBSERVACIONES</Text>
          <Text style={styles.obsContent}>
            {observaciones && observaciones.trim().length > 0
              ? observaciones.trim()
              : `Total OSIs Recibidas en ${selectedMesLabel}: ${mesData.osisRecibidas} OSIs. OSI ejecutadas en el periodo: ${mesData.osisEjecutadasEnSuMes}. OSI pendientes por ejecutar: ${mesData.osisPendientes}.`}
          </Text>
        </View>

        {/* Document Footer (fixed at bottom) */}
        <Image style={styles.footerImage} src="/pdf/sha-footer.png" fixed />
      </Page>
    </Document>
  );
}
