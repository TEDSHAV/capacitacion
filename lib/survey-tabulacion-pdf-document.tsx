/**
 * Survey Tabulation PDF document — "Resultados de la Actividad".
 *
 * Modern, branded, client-facing one-page report built with @react-pdf/renderer.
 * Replaces the legacy hand-drawn jsPDF generator
 * (lib/survey-tabulacion-generator.ts).
 *
 * Layout (Legal portrait, single page):
 *  - Header band: logo left, title center, meta right (Anexo / Rev.01 / Fecha)
 *  - OSI info card (Facilitador, OSI, Curso, Cliente, Ejecutivo, Fecha)
 *  - ISO 9001:2015 intro paragraph
 *  - KPI strip: Total Participantes | Total Encuestas | % Excelencia
 *  - Section blocks (Facilitador 60%, Capacitación 40%, Entorno 5%):
 *      title bar + side-by-side [data table | vertical bar chart]
 *  - Resultados del Servicio block (table + chart)
 *  - Motivación de los Participantes (vertical bar chart, same style as others)
 *  - Observaciones
 *  - Footer image (fixed)
 */

import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { SurveyTabulacionData, SurveyTabulacionSection } from "@/types";

// ─── Brand palette ───────────────────────────────────────────────────────────
const BRAND_BLUE = "#006FC0";
const LIGHT_BLUE = "#5B9BD4";
const TEAL = "#0F766E";        // motivación chart
const ACCENT_ORANGE = "#FFC000";
const SOFT_YELLOW = "#FFF7CC";
const PEACH = "#F8CAAC";
const INK = "#1F2937";
const MUTED = "#6B7280";
const BORDER = "#E5E7EB";
const LABEL_BG = "#F3F4F6";
const CARD_BG = "#F9FAFB";
const WHITE = "#FFFFFF";

// ─── Temperature color scale (per level) ─────────────────────────────────────
// Green (excellent) → Red (bad). Intuitive for clients reading the report.
const LEVEL_COLORS: { [level: number]: string } = {
  5: "#16A34A", // Excelente — green
  4: "#84CC16", // Muy Bueno — lime
  3: "#EAB308", // Bueno — amber
  2: "#F97316", // Poco Aceptable — orange
  1: "#DC2626", // Malo — red
};

// ─── Levels ──────────────────────────────────────────────────────────────────
const LEVELS = [
  { value: 5, label: "Excelente" },
  { value: 4, label: "Muy Bueno" },
  { value: 3, label: "Bueno" },
  { value: 2, label: "Poco Aceptable" },
  { value: 1, label: "Malo" },
];

const ATTENDANCE_REASONS = [
  "Requerimiento de la empresa",
  "Crecimiento laboral",
  "Desarrollo Personal",
];

// ─── Chart height (shared by all vertical bar charts for consistency) ─────────
const CHART_HEIGHT = 55;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

function formatPct(value: number): string {
  return `${(value * 100).toFixed(2).replace(".", ",")}%`;
}

function sectionPct(section: SurveyTabulacionSection, level: number): number {
  const count = section.distributions[level] || 0;
  return section.total > 0 ? (count * section.weight) / section.total : 0;
}

function rawSectionPct(section: SurveyTabulacionSection, level: number): number {
  const count = section.distributions[level] || 0;
  return section.total > 0 ? count / section.total : 0;
}

function rawResultadosPct(data: SurveyTabulacionData, level: number): number {
  const fCount = data.sections.facilitador.distributions[level] || 0;
  const cCount = data.sections.capacitacion.distributions[level] || 0;
  const eCount = data.sections.entorno.distributions[level] || 0;
  const totalCount = fCount + cCount + eCount;
  const totalResp =
    data.sections.facilitador.total +
    data.sections.capacitacion.total +
    data.sections.entorno.total;
  return totalResp > 0 ? totalCount / totalResp : 0;
}

function gatherReasons(data: SurveyTabulacionData): { reason: string; count: number }[] {
  const seen = new Set<string>();
  const all = [...ATTENDANCE_REASONS];
  for (const [r] of Object.entries(data.attendance_reasons)) {
    if (!all.some((a) => a.toLowerCase() === r.toLowerCase())) all.push(r);
  }
  return all
    .filter((r) => {
      const k = r.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map((r) => {
      const count =
        data.attendance_reasons[r] ||
        data.attendance_reasons[r.replace(/personal/i, "Personal")] ||
        0;
      return { reason: r, count };
    });
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 48,
    paddingHorizontal: 28,
    fontSize: 8,
    fontFamily: "Helvetica",
    color: INK,
    backgroundColor: WHITE,
  },
  // Header
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingBottom: 6,
    borderBottomWidth: 1.5,
    borderBottomColor: BRAND_BLUE,
    marginBottom: 8,
  },
  logo: {
    width: 85,
    height: "auto",
  },
  headerTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: INK,
    textAlign: "center",
    marginTop: 2,
  },
  headerSubtitle: {
    fontSize: 7,
    color: MUTED,
    textAlign: "center",
    marginTop: 1,
  },
  headerMeta: {
    fontSize: 7,
    color: MUTED,
    textAlign: "right",
    lineHeight: 1.4,
  },
  headerMetaStrong: {
    fontFamily: "Helvetica-Bold",
    color: INK,
  },
  // OSI info card
  infoCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  infoCellLabel: {
    width: "22%",
    backgroundColor: LABEL_BG,
    paddingVertical: 3,
    paddingHorizontal: 6,
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: MUTED,
    textTransform: "uppercase",
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  infoCellValue: {
    paddingVertical: 3,
    paddingHorizontal: 6,
    fontSize: 8,
    color: INK,
  },
  // ISO paragraph
  isoParagraph: {
    fontSize: 7,
    color: MUTED,
    lineHeight: 1.4,
    marginBottom: 6,
    textAlign: "justify",
  },
  // KPI strip
  kpiStrip: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  kpiCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 3,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: CARD_BG,
  },
  kpiLabel: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: INK,
  },
  kpiSub: {
    fontSize: 6,
    color: MUTED,
    marginTop: 1,
  },
  // Section block
  sectionBlock: {
    marginBottom: 5,
  },
  sectionBar: {
    backgroundColor: BRAND_BLUE,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 2,
    marginBottom: 3,
  },
  sectionBarText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: WHITE,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  sectionBarWeight: {
    fontFamily: "Helvetica",
    fontSize: 7,
    color: "rgba(255,255,255,0.85)",
    marginLeft: 4,
  },
  // Additional aspects sub-header (peach strip, lighter than sectionBar)
  additionalHeader: {
    backgroundColor: PEACH,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 2,
    marginBottom: 5,
    marginTop: 2,
  },
  additionalHeaderText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: INK,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  // Two-column body
  blockBody: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 6,
  },
  tableCol: {
    width: "44%",
  },
  chartCol: {
    width: "56%",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 3,
    padding: 5,
    backgroundColor: WHITE,
  },
  chartTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: INK,
    textAlign: "center",
    marginBottom: 3,
    textTransform: "uppercase",
  },
  // Table subtitle (matches chartTitle for symmetry)
  tableSubtitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: INK,
    textAlign: "center",
    marginBottom: 3,
    textTransform: "uppercase",
  },
  // Data table
  table: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 3,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: LABEL_BG,
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableHeaderCell: {
    fontFamily: "Helvetica-Bold",
    fontSize: 6.5,
    color: MUTED,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableRowCell: {
    fontSize: 7,
    color: INK,
  },
  tableRowTotal: {
    flexDirection: "row",
    backgroundColor: BRAND_BLUE,
    paddingVertical: 2.5,
    paddingHorizontal: 5,
  },
  tableRowTotalCell: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
  },
  // Resultados-specific
  resultadosHeader: {
    backgroundColor: ACCENT_ORANGE,
    paddingVertical: 3,
    paddingHorizontal: 5,
  },
  resultadosHeaderText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: INK,
    textTransform: "uppercase",
  },
  excelenteRow: {
    backgroundColor: BRAND_BLUE,
  },
  excelenteRowCell: {
    color: WHITE,
    fontFamily: "Helvetica-Bold",
  },
  totalPartRow: {
    backgroundColor: SOFT_YELLOW,
    paddingVertical: 7,
    paddingHorizontal: 5,
    minHeight: 18,
  },
  totalPartCell: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    color: INK,
  },
  // Observaciones
  observacionesHeader: {
    backgroundColor: SOFT_YELLOW,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 2,
    marginBottom: 2,
  },
  observacionesHeaderText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: INK,
    textTransform: "uppercase",
  },
  observacionesBody: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 2,
    padding: 6,
    minHeight: 16,
    fontSize: 7,
    color: MUTED,
    fontStyle: "italic",
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 12,
    left: 28,
    right: 28,
    alignItems: "center",
  },
  footerImage: {
    width: "100%",
    height: "auto",
  },
  footerMeta: {
    fontSize: 6,
    color: MUTED,
    textAlign: "center",
    marginTop: 2,
  },
});

// ─── Shared vertical bar chart ───────────────────────────────────────────────
interface BarChartProps {
  title: string;
  bars: { label: string; shortLabel: string; pct: number; value: number; color?: string }[];
  maxRef: number;
  barColor: string;
  barWidthPct?: string;
  showValue?: boolean;
}

/**
 * Reusable vertical bar chart — used by all section charts, the Resultados
 * chart, and the Motivación chart so they all look the same.
 */
function BarChart({
  title,
  bars,
  maxRef,
  barColor,
  barWidthPct = "70%",
  showValue = false,
}: BarChartProps) {
  return (
    <View style={styles.chartCol}>
      <Text style={styles.chartTitle}>{title}</Text>
      {/* Spacer pushes bars to the bottom of the stretched chart column */}
      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: "row", alignItems: "flex-end", height: CHART_HEIGHT, gap: 3 }}>
        {bars.map((bar, i) => {
          const h = maxRef > 0 ? Math.max(1.5, (bar.pct / maxRef) * CHART_HEIGHT) : 1.5;
          return (
            <View
              key={i}
              style={{ flex: 1, alignItems: "center" }}
            >
              <Text style={{ fontSize: 5.5, color: MUTED, marginBottom: 1 }}>
                {showValue ? bar.value : formatPct(bar.pct)}
              </Text>
              <View
                style={{
                  width: barWidthPct,
                  height: h,
                  backgroundColor: bar.color || barColor,
                  borderRadius: 1.5,
                }}
              />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", gap: 3, marginTop: 2 }}>
        {bars.map((bar, i) => (
          <View key={i} style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontSize: 5, color: MUTED, textAlign: "center" }}>
              {bar.shortLabel}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface SectionTableProps {
  section: SurveyTabulacionSection;
}

function SectionTable({ section }: SectionTableProps) {
  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Nivel</Text>
        <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "center" }]}>Resp.</Text>
        <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "center" }]}>%</Text>
        <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "center" }]}>Total (%)</Text>
      </View>
      {LEVELS.map((lvl) => {
        const count = section.distributions[lvl.value] || 0;
        const rawPct = rawSectionPct(section, lvl.value);
        const pct = sectionPct(section, lvl.value);
        return (
          <View key={lvl.value} style={styles.tableRow}>
            <Text style={[styles.tableRowCell, { flex: 2 }]}>{lvl.label}</Text>
            <Text style={[styles.tableRowCell, { flex: 1, textAlign: "center" }]}>{count}</Text>
            <Text style={[styles.tableRowCell, { flex: 1, textAlign: "center" }]}>
              {formatPct(rawPct)}
            </Text>
            <Text style={[styles.tableRowCell, { flex: 1, textAlign: "center" }]}>
              {formatPct(pct)}
            </Text>
          </View>
        );
      })}
      <View style={styles.tableRowTotal}>
        <Text style={[styles.tableRowTotalCell, { flex: 2 }]}>TOTAL</Text>
        <Text style={[styles.tableRowTotalCell, { flex: 1, textAlign: "center" }]}>
          {section.total}
        </Text>
        <Text style={[styles.tableRowTotalCell, { flex: 1, textAlign: "center" }]}>100,00%</Text>
        <Text style={[styles.tableRowTotalCell, { flex: 1, textAlign: "center" }]}>
          {formatPct(section.total > 0 ? section.weight : 0)}
        </Text>
      </View>
    </View>
  );
}

interface SectionChartProps {
  title: string;
  section: SurveyTabulacionSection;
  barColor?: string;
}

function SectionChart({ title, section, barColor = BRAND_BLUE }: SectionChartProps) {
  const bars = LEVELS.map((lvl) => ({
    label: lvl.label,
    shortLabel: lvl.label === "Poco Aceptable" ? "Poco Acep." : lvl.label,
    pct: sectionPct(section, lvl.value),
    value: section.distributions[lvl.value] || 0,
    color: LEVEL_COLORS[lvl.value],
  }));
  return (
    <BarChart
      title={title}
      bars={bars}
      maxRef={section.weight}
      barColor={barColor}
    />
  );
}

interface ResultadosTableProps {
  data: SurveyTabulacionData;
}

function ResultadosTable({ data }: ResultadosTableProps) {
  return (
    <View style={styles.table}>
      <View style={styles.resultadosHeader}>
        <Text style={styles.resultadosHeaderText}>Resultados del servicio</Text>
      </View>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, { flex: 2 }]}>PONDERACIÓN</Text>
        <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "center" }]}>%</Text>
        <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "center" }]}>Total (%)</Text>
      </View>
      {LEVELS.map((lvl) => {
        const rawPct = rawResultadosPct(data, lvl.value);
        const pct = data.resultados_servicio[lvl.value] || 0;
        const isExcelente = lvl.value === 5;
        return (
          <View
            key={lvl.value}
            style={[styles.tableRow, isExcelente ? styles.excelenteRow : {}]}
          >
            <Text
              style={[
                styles.tableRowCell,
                { flex: 2 },
                isExcelente ? styles.excelenteRowCell : {},
              ]}
            >
              {lvl.label}
            </Text>
            <Text
              style={[
                styles.tableRowCell,
                { flex: 1, textAlign: "center" },
                isExcelente ? styles.excelenteRowCell : {},
              ]}
            >
              {formatPct(rawPct)}
            </Text>
            <Text
              style={[
                styles.tableRowCell,
                { flex: 1, textAlign: "center" },
                isExcelente ? styles.excelenteRowCell : {},
              ]}
            >
              {formatPct(pct)}
            </Text>
          </View>
        );
      })}
      <View style={styles.totalPartRow}>
        <Text style={[styles.totalPartCell, { flex: 3 }]}>TOTAL PARTICIPANTES</Text>
        <Text style={[styles.totalPartCell, { flex: 1, textAlign: "center" }]}>
          {data.total_participantes}
        </Text>
      </View>
    </View>
  );
}

interface ResultadosChartProps {
  data: SurveyTabulacionData;
}

function ResultadosChart({ data }: ResultadosChartProps) {
  const bars = LEVELS.map((lvl) => ({
    label: lvl.label,
    shortLabel: lvl.label === "Poco Aceptable" ? "Poco Acep." : lvl.label,
    pct: data.resultados_servicio[lvl.value] || 0,
    value: 0,
    color: LEVEL_COLORS[lvl.value],
  }));
  return (
    <BarChart
      title="Resultados del Servicio"
      bars={bars}
      maxRef={1.0}
      barColor={LIGHT_BLUE}
      barWidthPct="60%"
    />
  );
}

interface MotivacionTableProps {
  data: SurveyTabulacionData;
}

function MotivacionTable({ data }: MotivacionTableProps) {
  const counts = gatherReasons(data);
  const total = counts.reduce((sum, c) => sum + c.count, 0);
  return (
    <View style={[styles.table, { flex: 1 }]}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, { flex: 3 }]}>Motivo</Text>
        <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "center" }]}>Total</Text>
      </View>
      {counts.map(({ reason, count }, i) => (
        <View key={i} style={[styles.tableRow, { flex: 1 }]}>
          <Text style={[styles.tableRowCell, { flex: 3 }]}>{reason}</Text>
          <Text style={[styles.tableRowCell, { flex: 1, textAlign: "center" }]}>{count}</Text>
        </View>
      ))}
      <View style={styles.tableRowTotal}>
        <Text style={[styles.tableRowTotalCell, { flex: 3 }]}>TOTAL</Text>
        <Text style={[styles.tableRowTotalCell, { flex: 1, textAlign: "center" }]}>
          {total}
        </Text>
      </View>
    </View>
  );
}

interface MotivacionChartProps {
  data: SurveyTabulacionData;
}

function MotivacionChart({ data }: MotivacionChartProps) {
  const counts = gatherReasons(data);
  const maxCount = Math.max(1, ...counts.map((c) => c.count));
  const bars = counts.map(({ reason, count }) => ({
    label: reason,
    shortLabel:
      reason === "Requerimiento de la empresa"
        ? "Req. empresa"
        : reason === "Crecimiento laboral"
          ? "Crec. laboral"
          : reason === "Desarrollo Personal"
            ? "Des. personal"
            : reason.length > 14
              ? reason.substring(0, 12) + "…"
              : reason,
    pct: count / maxCount,
    value: count,
  }));
  return (
    <BarChart
      title="Motivación de los Participantes"
      bars={bars}
      maxRef={1.0}
      barColor={TEAL}
      barWidthPct="55%"
      showValue
    />
  );
}

// ─── Document ────────────────────────────────────────────────────────────────

export interface SurveyTabulacionPdfDocumentProps {
  data: SurveyTabulacionData;
  logoSrc: string; // base64 data URI
  footerSrc?: string; // base64 data URI
  generatedAt: string; // formatted date for the header
}

export default function SurveyTabulacionPdfDocument({
  data,
  logoSrc,
  footerSrc,
  generatedAt,
}: SurveyTabulacionPdfDocumentProps) {
  const excelenciaPct = data.resultados_servicio[5] || 0;

  return (
    <Document
      title={`Resultados de la Actividad — OSI ${data.nro_osi}`}
      author="SHA de Venezuela, C.A."
      subject="Tabulación de Encuestas de Satisfacción"
    >
      <Page size="LEGAL" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image style={styles.logo} src={logoSrc} />
          <View style={{ alignItems: "center", flex: 1, paddingHorizontal: 10 }}>
            <Text style={styles.headerTitle}>Resultados de la Actividad</Text>
            <Text style={styles.headerSubtitle}>
              Tabulación de Encuestas de Satisfacción
            </Text>
          </View>
          <View style={styles.headerMeta}>
            <Text>Anexo</Text>
            <Text style={styles.headerMetaStrong}>Rev.01</Text>
            <Text>Fecha: 17-08-2026</Text>
          </View>
        </View>

        {/* OSI info card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoCellLabel}>Facilitador</Text>
            <Text style={[styles.infoCellValue, { flex: 1, textTransform: "uppercase" }]}>
              {data.facilitador_nombre || "—"}
            </Text>
            <Text style={styles.infoCellLabel}>OSI</Text>
            <Text style={[styles.infoCellValue, { flex: 1 }]}>{data.nro_osi}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoCellLabel}>Curso</Text>
            <Text style={[styles.infoCellValue, { flex: 1 }]}>{data.servicio || "—"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoCellLabel}>Cliente</Text>
            <Text style={[styles.infoCellValue, { flex: 1 }]}>
              {data.nombre_empresa || "—"}
            </Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoCellLabel}>Ejecutivo de Negocios</Text>
            <Text style={[styles.infoCellValue, { flex: 1, textTransform: "uppercase" }]}>
              {data.ejecutivo_negocios || "—"}
            </Text>
            <Text style={styles.infoCellLabel}>Fecha</Text>
            <Text style={[styles.infoCellValue, { flex: 1 }]}>
              {formatDate(data.fecha_inicio_real)}
            </Text>
          </View>
        </View>

        {/* ISO paragraph */}
        <Text style={styles.isoParagraph}>
          De acuerdo a lo establecido en la NORMA ISO 9001:2015, en su apartado 9.
          Evaluación del Desempeño, cláusula 9.1.3 Análisis y Evaluación, SHA DE
          VENEZUELA, C.A. ha utilizado la metodología Kirkpatrick para el desarrollo
          de esta encuesta, con el propósito de hacer que la capacitación sea
          flexible, dinámica y satisfactoria para los participantes, de modo que
          logren aplicar nuevos conocimientos y habilidades de la manera más efectiva
          posible. A continuación se presentan los resultados arrojados para su
          conocimiento.
        </Text>

        {/* KPI strip */}
        <View style={styles.kpiStrip}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Total Participantes</Text>
            <Text style={styles.kpiValue}>{data.total_participantes}</Text>
            <Text style={styles.kpiSub}>Participantes atendidos</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Encuestas Recibidas</Text>
            <Text style={styles.kpiValue}>{data.total_encuestas}</Text>
            <Text style={styles.kpiSub}>Respuestas procesadas</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>% Excelencia</Text>
            <Text style={styles.kpiValue}>{formatPct(excelenciaPct)}</Text>
            <Text style={styles.kpiSub}>Resultados del servicio</Text>
          </View>
        </View>

        {/* Section 1: Facilitador (60%) */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionBar}>
            <Text style={styles.sectionBarText}>
              Aspectos del Servicio Prestado por SHA de Venezuela, C.A.
              <Text style={styles.sectionBarWeight}>— Peso 60%</Text>
            </Text>
          </View>
          <View style={styles.blockBody}>
            <View style={styles.tableCol}>
              <Text style={styles.tableSubtitle}>Desenvolvimiento del Facilitador</Text>
              <SectionTable section={data.sections.facilitador} />
            </View>
            <SectionChart
              title="Desenvolvimiento del Facilitador"
              section={data.sections.facilitador}
            />
          </View>
        </View>

        {/* Section 2: Capacitación (40%) */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionBar}>
            <Text style={styles.sectionBarText}>
              Aspectos de la Capacitación
              <Text style={styles.sectionBarWeight}>— Peso 40%</Text>
            </Text>
          </View>
          <View style={styles.blockBody}>
            <View style={styles.tableCol}>
              <Text style={styles.tableSubtitle}>Aspectos de la Capacitación</Text>
              <SectionTable section={data.sections.capacitacion} />
            </View>
            <SectionChart
              title="Aspectos de la Capacitación"
              section={data.sections.capacitacion}
            />
          </View>
        </View>

        {/* Resultados del Servicio */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionBar}>
            <Text style={styles.sectionBarText}>Resultados del Servicio</Text>
          </View>
          <View style={styles.blockBody}>
            <View style={styles.tableCol}>
              <Text style={styles.tableSubtitle}>Resultados del Servicio</Text>
              <ResultadosTable data={data} />
            </View>
            <ResultadosChart data={data} />
          </View>
        </View>

        {/* Aspectos Adicionales del Servicio — sub-header */}
        <View style={styles.additionalHeader}>
          <Text style={styles.additionalHeaderText}>
            Aspectos Adicionales del Servicio
          </Text>
        </View>

        {/* Section 3: Calidad del Entorno (5%) */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionBar}>
            <Text style={styles.sectionBarText}>
              Calidad del Entorno
              <Text style={styles.sectionBarWeight}>— Peso 5%</Text>
            </Text>
          </View>
          <View style={styles.blockBody}>
            <View style={styles.tableCol}>
              <Text style={styles.tableSubtitle}>Calidad del Entorno</Text>
              <SectionTable section={data.sections.entorno} />
            </View>
            <SectionChart
              title="Calidad del Entorno"
              section={data.sections.entorno}
            />
          </View>
        </View>

        {/* Motivación — table + chart, matching the other sections */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionBar}>
            <Text style={styles.sectionBarText}>Motivación de los Participantes</Text>
          </View>
          <View style={styles.blockBody}>
            <View style={[styles.tableCol, { flex: 1 }]}>
              <Text style={styles.tableSubtitle}>¿Por qué asististe al curso?</Text>
              <MotivacionTable data={data} />
            </View>
            <MotivacionChart data={data} />
          </View>
        </View>

        {/* Observaciones */}
        <View style={styles.sectionBlock}>
          <View style={styles.observacionesHeader}>
            <Text style={styles.observacionesHeaderText}>Observaciones</Text>
          </View>
          <View style={styles.observacionesBody}>
            <Text>Sin comentarios</Text>
          </View>
        </View>

        {/* Footer */}
        {footerSrc && (
          <View style={styles.footer} fixed>
            <Image style={styles.footerImage} src={footerSrc} />
          </View>
        )}
      </Page>
    </Document>
  );
}
