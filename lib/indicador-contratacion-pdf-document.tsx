import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type {
  ContratacionFacilitadoresResponse,
  ContratacionMesBucket,
  FacilitadorContratadoItem,
} from "@/types";

interface Props {
  data: ContratacionFacilitadoresResponse;
  selectedMes: string;
  estadoFiltroLabel?: string;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 68,
    paddingHorizontal: 24,
    fontSize: 7.5,
    fontFamily: "Helvetica",
    color: "#1e293b",
    backgroundColor: "#ffffff",
  },
  headerTable: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#0f172a",
    marginBottom: 8,
  },
  headerLogoCell: {
    width: "30%",
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderColor: "#0f172a",
  },
  logoImage: {
    width: 110,
  },
  headerTitleCell: {
    width: "70%",
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  docTitle: {
    fontSize: 12.5,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    textAlign: "center",
    textTransform: "uppercase",
  },
  docScopeTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#0369a1",
    textAlign: "center",
    marginTop: 3,
    textTransform: "uppercase",
  },
  scopeBox: {
    borderWidth: 1,
    borderColor: "#0f172a",
    padding: 5,
    marginBottom: 8,
    backgroundColor: "#f8fafc",
  },
  scopeText: {
    fontSize: 6.5,
    textAlign: "center",
    color: "#334155",
    lineHeight: 1.35,
  },
  statusBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#0369a1",
    color: "#ffffff",
    paddingVertical: 4,
    paddingHorizontal: 10,
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    marginBottom: 8,
    borderRadius: 2,
  },
  summaryPillsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  summaryPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 3,
    paddingVertical: 5,
    paddingHorizontal: 4,
    backgroundColor: "#f8fafc",
    alignItems: "center",
  },
  summaryPillLabel: {
    fontSize: 5.8,
    color: "#64748b",
    marginBottom: 2,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  summaryPillValue: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  summaryPillSub: {
    fontSize: 5.5,
    color: "#0284c7",
    marginTop: 1.5,
    textAlign: "center",
  },
  sectionTitleBox: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#0f172a",
    paddingVertical: 3,
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
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#0f172a",
  },
  tableRowAlt: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#0f172a",
    backgroundColor: "#f8fafc",
  },
  tableRowHighlighted: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#0f172a",
    backgroundColor: "#e0f2fe",
  },
  thCell: {
    borderRightWidth: 1,
    borderColor: "#0f172a",
    paddingVertical: 3.5,
    paddingHorizontal: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 6.2,
    textAlign: "center",
    backgroundColor: "#e2e8f0",
    justifyContent: "center",
  },
  tdCell: {
    borderRightWidth: 1,
    borderColor: "#0f172a",
    paddingVertical: 3.5,
    paddingHorizontal: 4,
    fontSize: 6.8,
    justifyContent: "center",
  },
  compactThCell: {
    borderRightWidth: 1,
    borderColor: "#0f172a",
    paddingVertical: 2.2,
    paddingHorizontal: 3.5,
    fontFamily: "Helvetica-Bold",
    fontSize: 5.8,
    textAlign: "center",
    backgroundColor: "#e2e8f0",
    justifyContent: "center",
  },
  compactTdCell: {
    borderRightWidth: 1,
    borderColor: "#0f172a",
    paddingVertical: 2,
    paddingHorizontal: 3.5,
    fontSize: 6.2,
    justifyContent: "center",
  },
  gridTwoCols: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  halfCol: {
    flex: 1,
  },
  prismaNoteBox: {
    position: "absolute",
    bottom: 52,
    left: 24,
    right: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderColor: "#cbd5e1",
    paddingTop: 3,
  },
  prismaNoteText: {
    fontSize: 6.2,
    fontFamily: "Helvetica-Oblique",
    color: "#64748b",
  },
  prismaPageText: {
    fontSize: 6.2,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
  },
  footerImage: {
    position: "absolute",
    bottom: 10,
    left: 24,
    right: 24,
    height: 38,
  },
});

const MESES_NOMBRES = [
  "ENERO",
  "FEBRERO",
  "MARZO",
  "ABRIL",
  "MAYO",
  "JUNIO",
  "JULIO",
  "AGOSTO",
  "SEPTIEMBRE",
  "OCTUBRE",
  "NOVIEMBRE",
  "DICIEMBRE",
];

function formatShortDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "Sin fecha";
  const trimmed = dateStr.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  return dateStr;
}

function formatFuente(fuente: string | null): string {
  const key = (fuente || "").trim().toLowerCase();
  const map: Record<string, string> = {
    recomendacion: "Recomendación",
    entrevista: "Entrevista",
    linkedin: "LinkedIn",
    web: "Página Web",
    rrss: "Redes Sociales",
    interno: "Referencia Interna",
    otro: "Otro",
  };
  return map[key] || (fuente ? fuente : "Sin especificar");
}

function getFullMonthName(mesKey: string, fallback: string): string {
  const parts = mesKey.split("-");
  if (parts.length === 2) {
    const idx = parseInt(parts[1], 10) - 1;
    if (MESES_NOMBRES[idx]) {
      return `${MESES_NOMBRES[idx]} ${parts[0]}`;
    }
  }
  return fallback.toUpperCase();
}

export default function IndicadorContratacionPdfDocument({
  data,
  selectedMes,
  estadoFiltroLabel,
}: Props) {
  // Resolve the selected month bucket (strictly monthly indicator)
  const monthBucket: ContratacionMesBucket =
    data.meses.find((m) => m.mes === selectedMes) ??
    data.meses[data.meses.length - 1] ?? {
      mes: selectedMes,
      label: selectedMes,
      contratados: 0,
      acumulado: data.kpis.totalPlantilla,
      crecimientoPct: 0,
      entrevistasRealizadas: 0,
      entrevistasAprobadas: 0,
      items: [],
    };

  const fullMesLabel = getFullMonthName(monthBucket.mes, monthBucket.label);
  const monthItems: FacilitadorContratadoItem[] = monthBucket.items;
  const distinctStatesMes = new Set(
    monthItems.map((i) => i.estadoNombre).filter(Boolean)
  ).size;
  const distinctCitiesMes = new Set(
    monthItems.map((i) => i.ciudadNombre).filter(Boolean)
  ).size;

  // Build breakdown of the selected month's new facilitators by City/State and by Source
  const cityCounts = new Map<
    string,
    { nombre: string; estado: string; nuevosMes: number; totalPlantilla: number }
  >();
  for (const c of data.porCiudad) {
    const key = `${c.nombre}|${c.estadoNombre || ""}`;
    cityCounts.set(key, {
      nombre: c.nombre,
      estado: c.estadoNombre || "",
      nuevosMes: 0,
      totalPlantilla: c.total,
    });
  }
  for (const item of monthItems) {
    const cName = item.ciudadNombre || "Sin ciudad";
    const sName = item.estadoNombre || "";
    const key = `${cName}|${sName}`;
    const existing = cityCounts.get(key);
    if (existing) {
      existing.nuevosMes += 1;
    } else {
      cityCounts.set(key, {
        nombre: cName,
        estado: sName,
        nuevosMes: 1,
        totalPlantilla: 1,
      });
    }
  }
  const sortedCities = Array.from(cityCounts.values()).sort(
    (a, b) =>
      b.nuevosMes - a.nuevosMes ||
      b.totalPlantilla - a.totalPlantilla ||
      a.nombre.localeCompare(b.nombre)
  );

  const fuenteCounts = new Map<
    string,
    { label: string; nuevosMes: number; totalPlantilla: number }
  >();
  for (const f of data.porFuente) {
    fuenteCounts.set(f.label, {
      label: f.label,
      nuevosMes: 0,
      totalPlantilla: f.total,
    });
  }
  for (const item of monthItems) {
    const lbl = formatFuente(item.fuente);
    const existing = fuenteCounts.get(lbl);
    if (existing) {
      existing.nuevosMes += 1;
    } else {
      fuenteCounts.set(lbl, {
        label: lbl,
        nuevosMes: 1,
        totalPlantilla: 1,
      });
    }
  }
  const sortedFuentes = Array.from(fuenteCounts.values()).sort(
    (a, b) =>
      b.nuevosMes - a.nuevosMes ||
      b.totalPlantilla - a.totalPlantilla ||
      a.label.localeCompare(b.label)
  );

  // Breakdown by State (guarantees national total is fully reconciled)
  const estadoCounts = new Map<
    string,
    { nombre: string; nuevosMes: number; totalPlantilla: number }
  >();
  for (const e of data.porEstado) {
    estadoCounts.set(e.nombre, {
      nombre: e.nombre,
      nuevosMes: 0,
      totalPlantilla: e.total,
    });
  }
  for (const item of monthItems) {
    const sName = item.estadoNombre || "Sin estado";
    const existing = estadoCounts.get(sName);
    if (existing) {
      existing.nuevosMes += 1;
    } else {
      estadoCounts.set(sName, {
        nombre: sName,
        nuevosMes: 1,
        totalPlantilla: 1,
      });
    }
  }
  const sortedEstados = Array.from(estadoCounts.values()).sort(
    (a, b) =>
      b.nuevosMes - a.nuevosMes ||
      b.totalPlantilla - a.totalPlantilla ||
      a.nombre.localeCompare(b.nombre)
  );

  return (
    <Document title={`Indicador_Crecimiento_Facilitadores_${monthBucket.mes}`}>
      <Page size="LETTER" style={styles.page}>
        {/* Header Table: SHA Logo + Title (no rev, no cod, no date) */}
        <View style={styles.headerTable}>
          <View style={styles.headerLogoCell}>
            <Image style={styles.logoImage} src="/pdf/sha-logo.png" />
          </View>
          <View style={styles.headerTitleCell}>
            <Text style={styles.docTitle}>
              INDICADOR DE CRECIMIENTO DE FACILITADORES
            </Text>
            <Text style={styles.docScopeTitle}>
              CAPTACIÓN, INCORPORACIÓN Y PLANTILLA DE FACILITADORES
            </Text>
          </View>
        </View>

        {/* Objective / Scope Box */}
        <View style={styles.scopeBox}>
          <Text style={styles.scopeText}>
            Medir la incorporación mensual de facilitadores del Departamento de Capacitación de SHA DE VENEZUELA, C.A., registrando los facilitadores aprobados en el mes, su ubicación geográfica y fuente de captación.
          </Text>
        </View>

        {/* Status Bar */}
        <View style={styles.statusBar}>
          <Text>MES EVALUADO: {fullMesLabel}</Text>
          <Text>
            UBICACIÓN: {(estadoFiltroLabel || "NACIONAL (TODOS LOS ESTADOS)").toUpperCase()}
          </Text>
        </View>

        {/* Monthly KPI Summary Pills (100% focused on the selected month, no acumulado) */}
        <View style={styles.summaryPillsRow}>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryPillLabel}>
              Nuevos Facilitadores del Mes
            </Text>
            <Text style={[styles.summaryPillValue, { color: "#0369a1" }]}>
              +{monthBucket.contratados}
            </Text>
            <Text style={styles.summaryPillSub}>
              Incorporados en {monthBucket.label}
            </Text>
          </View>

          <View style={styles.summaryPill}>
            <Text style={styles.summaryPillLabel}>
              Entrevistas del Mes
            </Text>
            <Text style={[styles.summaryPillValue, { color: "#6d28d9" }]}>
              {monthBucket.entrevistasRealizadas}
            </Text>
            <Text style={styles.summaryPillSub}>
              {monthBucket.contratados} aprobados en {monthBucket.label}
            </Text>
          </View>

          <View style={styles.summaryPill}>
            <Text style={styles.summaryPillLabel}>
              Cobertura del Mes
            </Text>
            <Text style={[styles.summaryPillValue, { color: "#15803d" }]}>
              {distinctCitiesMes} {distinctCitiesMes === 1 ? "Ciudad" : "Ciudades"}
            </Text>
            <Text style={styles.summaryPillSub}>
              En {distinctStatesMes} {distinctStatesMes === 1 ? "estado" : "estados"}
            </Text>
          </View>

          <View style={styles.summaryPill}>
            <Text style={styles.summaryPillLabel}>
              Plantilla de Facilitadores
            </Text>
            <Text style={styles.summaryPillValue}>
              {data.kpis.totalPlantilla}
            </Text>
            <Text style={styles.summaryPillSub}>
              {data.kpis.totalActivos} facilitadores activos
            </Text>
          </View>
        </View>

        {/* Table 1: Resumen Mensual del Indicador */}
        <View style={styles.sectionTitleBox}>
          <Text style={styles.sectionTitle}>
            1. Resumen Mensual del Indicador — {fullMesLabel}
          </Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableRow}>
            <View style={[styles.thCell, { width: "25%" }]}>
              <Text>MES EVALUADO</Text>
            </View>
            <View style={[styles.thCell, { width: "25%" }]}>
              <Text>ENTREVISTAS REALIZADAS</Text>
            </View>
            <View style={[styles.thCell, { width: "25%" }]}>
              <Text>FACILITADORES INCORPORADOS</Text>
            </View>
            <View style={[styles.thCell, { width: "25%" }]}>
              <Text>CIUDADES CON INGRESOS</Text>
            </View>
          </View>

          <View style={styles.tableRowHighlighted}>
            <View
              style={[
                styles.tdCell,
                { width: "25%", textAlign: "center", fontFamily: "Helvetica-Bold" },
              ]}
            >
              <Text>{fullMesLabel}</Text>
            </View>
            <View style={[styles.tdCell, { width: "25%", textAlign: "center" }]}>
              <Text>{monthBucket.entrevistasRealizadas}</Text>
            </View>
            <View
              style={[
                styles.tdCell,
                {
                  width: "25%",
                  textAlign: "center",
                  fontFamily: "Helvetica-Bold",
                  color: "#0369a1",
                },
              ]}
            >
              <Text>+{monthBucket.contratados}</Text>
            </View>
            <View
              style={[
                styles.tdCell,
                {
                  width: "25%",
                  textAlign: "center",
                  fontFamily: "Helvetica-Bold",
                  color: "#15803d",
                },
              ]}
            >
              <Text>{distinctCitiesMes}</Text>
            </View>
          </View>
        </View>

        {/* Table 2: Facilitadores Incorporados en el Mes */}
        <View style={styles.sectionTitleBox}>
          <Text style={styles.sectionTitle}>
            2. Facilitadores Incorporados en {fullMesLabel} ({monthItems.length})
          </Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableRow}>
            <View style={[styles.thCell, { width: "6%" }]}>
              <Text>N°</Text>
            </View>
            <View style={[styles.thCell, { width: "30%", textAlign: "left", paddingLeft: 5 }]}>
              <Text>FACILITADOR</Text>
            </View>
            <View style={[styles.thCell, { width: "14%" }]}>
              <Text>CÉDULA</Text>
            </View>
            <View style={[styles.thCell, { width: "14%" }]}>
              <Text>FECHA INGRESO</Text>
            </View>
            <View style={[styles.thCell, { width: "20%", textAlign: "left", paddingLeft: 5 }]}>
              <Text>CIUDAD / ESTADO</Text>
            </View>
            <View style={[styles.thCell, { width: "16%" }]}>
              <Text>FUENTE</Text>
            </View>
          </View>

          {monthItems.length === 0 ? (
            <View style={styles.tableRow}>
              <View
                style={[
                  styles.tdCell,
                  { width: "100%", textAlign: "center", paddingVertical: 8 },
                ]}
              >
                <Text>
                  No se registraron nuevos ingresos de facilitadores en {fullMesLabel}.
                </Text>
              </View>
            </View>
          ) : (
            monthItems.map((item, idx) => (
              <View
                key={item.id}
                style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
                wrap={false}
              >
                <View style={[styles.tdCell, { width: "6%", textAlign: "center" }]}>
                  <Text>{idx + 1}</Text>
                </View>
                <View
                  style={[
                    styles.tdCell,
                    { width: "30%", fontFamily: "Helvetica-Bold" },
                  ]}
                >
                  <Text>{item.nombreApellido}</Text>
                </View>
                <View style={[styles.tdCell, { width: "14%", textAlign: "center" }]}>
                  <Text>{item.cedula || "—"}</Text>
                </View>
                <View
                  style={[
                    styles.tdCell,
                    {
                      width: "14%",
                      textAlign: "center",
                      fontFamily: "Helvetica-Bold",
                      color: "#15803d",
                    },
                  ]}
                >
                  <Text>{formatShortDate(item.fechaIngreso)}</Text>
                </View>
                <View style={[styles.tdCell, { width: "20%" }]}>
                  <Text>
                    {item.ciudadNombre || "—"}
                    {item.estadoNombre ? `, ${item.estadoNombre}` : ""}
                  </Text>
                </View>
                <View style={[styles.tdCell, { width: "16%", textAlign: "center" }]}>
                  <Text>{formatFuente(item.fuente)}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Two-column breakdown: Cobertura por Ciudad Base + Estado / Fuentes */}
        <View style={styles.gridTwoCols}>
          {/* Left Column: Todas las ciudades */}
          <View style={styles.halfCol}>
            <View style={styles.sectionTitleBox}>
              <Text style={styles.sectionTitle}>
                3. Distribución por Ciudad Base ({sortedCities.length})
              </Text>
            </View>
            <View style={[styles.table, { marginBottom: 0 }]}>
              <View style={styles.tableRow}>
                <View style={[styles.compactThCell, { width: "58%", textAlign: "left", paddingLeft: 4 }]}>
                  <Text>CIUDAD / ESTADO</Text>
                </View>
                <View style={[styles.compactThCell, { width: "21%" }]}>
                  <Text>MES</Text>
                </View>
                <View style={[styles.compactThCell, { width: "21%" }]}>
                  <Text>PLANTILLA</Text>
                </View>
              </View>
              {sortedCities.map((c, idx) => (
                <View
                  key={`${c.nombre}_${idx}`}
                  style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
                >
                  <View style={[styles.compactTdCell, { width: "58%" }]}>
                    <Text>
                      {c.nombre}
                      {c.estado ? ` (${c.estado})` : ""}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.compactTdCell,
                      {
                        width: "21%",
                        textAlign: "center",
                        fontFamily: c.nuevosMes > 0 ? "Helvetica-Bold" : "Helvetica",
                        color: c.nuevosMes > 0 ? "#15803d" : "#64748b",
                      },
                    ]}
                  >
                    <Text>{c.nuevosMes > 0 ? `+${c.nuevosMes}` : "0"}</Text>
                  </View>
                  <View style={[styles.compactTdCell, { width: "21%", textAlign: "center" }]}>
                    <Text>{c.totalPlantilla}</Text>
                  </View>
                </View>
              ))}
              {/* Total Row */}
              <View style={styles.tableRowHighlighted}>
                <View style={[styles.compactTdCell, { width: "58%", fontFamily: "Helvetica-Bold" }]}>
                  <Text>TOTAL PLANTILLA</Text>
                </View>
                <View
                  style={[
                    styles.compactTdCell,
                    {
                      width: "21%",
                      textAlign: "center",
                      fontFamily: "Helvetica-Bold",
                      color: monthBucket.contratados > 0 ? "#15803d" : "#64748b",
                    },
                  ]}
                >
                  <Text>{monthBucket.contratados > 0 ? `+${monthBucket.contratados}` : "0"}</Text>
                </View>
                <View
                  style={[
                    styles.compactTdCell,
                    { width: "21%", textAlign: "center", fontFamily: "Helvetica-Bold" },
                  ]}
                >
                  <Text>{data.kpis.totalPlantilla}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Right Column: Estados + Fuentes de Captación */}
          <View style={styles.halfCol}>
            {/* 4. Distribución por Estado */}
            <View style={styles.sectionTitleBox}>
              <Text style={styles.sectionTitle}>
                4. Distribución por Estado ({sortedEstados.length})
              </Text>
            </View>
            <View style={[styles.table, { marginBottom: 6 }]}>
              <View style={styles.tableRow}>
                <View style={[styles.compactThCell, { width: "58%", textAlign: "left", paddingLeft: 4 }]}>
                  <Text>ESTADO</Text>
                </View>
                <View style={[styles.compactThCell, { width: "21%" }]}>
                  <Text>MES</Text>
                </View>
                <View style={[styles.compactThCell, { width: "21%" }]}>
                  <Text>PLANTILLA</Text>
                </View>
              </View>
              {sortedEstados.map((e, idx) => (
                <View
                  key={e.nombre}
                  style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
                >
                  <View style={[styles.compactTdCell, { width: "58%" }]}>
                    <Text>{e.nombre}</Text>
                  </View>
                  <View
                    style={[
                      styles.compactTdCell,
                      {
                        width: "21%",
                        textAlign: "center",
                        fontFamily: e.nuevosMes > 0 ? "Helvetica-Bold" : "Helvetica",
                        color: e.nuevosMes > 0 ? "#15803d" : "#64748b",
                      },
                    ]}
                  >
                    <Text>{e.nuevosMes > 0 ? `+${e.nuevosMes}` : "0"}</Text>
                  </View>
                  <View style={[styles.compactTdCell, { width: "21%", textAlign: "center" }]}>
                    <Text>{e.totalPlantilla}</Text>
                  </View>
                </View>
              ))}
              <View style={styles.tableRowHighlighted}>
                <View style={[styles.compactTdCell, { width: "58%", fontFamily: "Helvetica-Bold" }]}>
                  <Text>TOTAL PLANTILLA</Text>
                </View>
                <View
                  style={[
                    styles.compactTdCell,
                    {
                      width: "21%",
                      textAlign: "center",
                      fontFamily: "Helvetica-Bold",
                      color: monthBucket.contratados > 0 ? "#15803d" : "#64748b",
                    },
                  ]}
                >
                  <Text>{monthBucket.contratados > 0 ? `+${monthBucket.contratados}` : "0"}</Text>
                </View>
                <View
                  style={[
                    styles.compactTdCell,
                    { width: "21%", textAlign: "center", fontFamily: "Helvetica-Bold" },
                  ]}
                >
                  <Text>{data.kpis.totalPlantilla}</Text>
                </View>
              </View>
            </View>

            {/* 5. Fuente de Captación */}
            <View style={styles.sectionTitleBox}>
              <Text style={styles.sectionTitle}>
                5. Fuente de Captación
              </Text>
            </View>
            <View style={[styles.table, { marginBottom: 0 }]}>
              <View style={styles.tableRow}>
                <View style={[styles.compactThCell, { width: "58%", textAlign: "left", paddingLeft: 4 }]}>
                  <Text>FUENTE</Text>
                </View>
                <View style={[styles.compactThCell, { width: "21%" }]}>
                  <Text>MES</Text>
                </View>
                <View style={[styles.compactThCell, { width: "21%" }]}>
                  <Text>PLANTILLA</Text>
                </View>
              </View>
              {sortedFuentes.map((f, idx) => (
                <View
                  key={f.label}
                  style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
                >
                  <View style={[styles.compactTdCell, { width: "58%" }]}>
                    <Text>{f.label}</Text>
                  </View>
                  <View
                    style={[
                      styles.compactTdCell,
                      {
                        width: "21%",
                        textAlign: "center",
                        fontFamily: f.nuevosMes > 0 ? "Helvetica-Bold" : "Helvetica",
                        color: f.nuevosMes > 0 ? "#0369a1" : "#64748b",
                      },
                    ]}
                  >
                    <Text>{f.nuevosMes > 0 ? `+${f.nuevosMes}` : "0"}</Text>
                  </View>
                  <View style={[styles.compactTdCell, { width: "21%", textAlign: "center" }]}>
                    <Text>{f.totalPlantilla}</Text>
                  </View>
                </View>
              ))}
              <View style={styles.tableRowHighlighted}>
                <View style={[styles.compactTdCell, { width: "58%", fontFamily: "Helvetica-Bold" }]}>
                  <Text>TOTAL PLANTILLA</Text>
                </View>
                <View
                  style={[
                    styles.compactTdCell,
                    {
                      width: "21%",
                      textAlign: "center",
                      fontFamily: "Helvetica-Bold",
                      color: monthBucket.contratados > 0 ? "#0369a1" : "#64748b",
                    },
                  ]}
                >
                  <Text>{monthBucket.contratados > 0 ? `+${monthBucket.contratados}` : "0"}</Text>
                </View>
                <View
                  style={[
                    styles.compactTdCell,
                    { width: "21%", textAlign: "center", fontFamily: "Helvetica-Bold" },
                  ]}
                >
                  <Text>{data.kpis.totalPlantilla}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* PRISMA System Attribution Note + Page Number */}
        <View style={styles.prismaNoteBox} fixed>
          <Text style={styles.prismaNoteText}>
            Documento generado automáticamente por el Sistema PRISMA · Módulo de Capacitación
          </Text>
          <Text
            style={styles.prismaPageText}
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>

        {/* Official Green SHA Footer */}
        <Image style={styles.footerImage} src="/pdf/sha-footer.png" fixed />
      </Page>
    </Document>
  );
}
