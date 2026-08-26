import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import {
  CAP_CHECKLIST_ITEMS,
  ST_CHECKLIST_ITEMS,
  type DisenoServicioFullData,
} from "@/types/diseno-servicio";

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 24,
    fontSize: 8,
    fontFamily: "Helvetica",
    color: "#111827",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  logo: {
    width: 120,
  },
  title: {
    fontSize: 11,
    fontWeight: 700,
    textAlign: "center",
    flex: 1,
    marginTop: 4,
  },
  metaBox: {
    fontSize: 7,
    textAlign: "right",
    width: 120,
  },
  metaLabel: {
    fontWeight: 700,
  },
  table: {
    borderWidth: 1,
    borderColor: "#000",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#000",
  },
  cellLabel: {
    backgroundColor: "#f2f2f2",
    fontWeight: 700,
    padding: 4,
    borderRightWidth: 1,
    borderColor: "#000",
    justifyContent: "center",
  },
  cellValue: {
    padding: 4,
    borderRightWidth: 1,
    borderColor: "#000",
    justifyContent: "center",
  },
  cellValueLast: {
    padding: 4,
    justifyContent: "center",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  checkbox: {
    width: 7,
    height: 7,
    borderWidth: 1,
    borderColor: "#000",
    marginRight: 2,
  },
  checkboxChecked: {
    width: 7,
    height: 7,
    borderWidth: 1,
    borderColor: "#000",
    marginRight: 2,
    backgroundColor: "#000",
  },
  sectionTitle: {
    backgroundColor: "#d9d9d9",
    fontWeight: 700,
    textAlign: "center",
    padding: 3,
    fontSize: 9,
    textTransform: "uppercase",
    borderWidth: 1,
    borderColor: "#000",
    marginBottom: 4,
  },
  subTitle: {
    backgroundColor: "#f2f2f2",
    fontWeight: 700,
    textAlign: "center",
    padding: 3,
    fontSize: 8,
    textTransform: "uppercase",
    borderWidth: 1,
    borderColor: "#000",
    marginBottom: 2,
  },
  itemsHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f2f2f2",
    borderBottomWidth: 1,
    borderColor: "#000",
  },
  itemsHeaderCell: {
    padding: 3,
    fontWeight: 700,
    fontSize: 7,
    textAlign: "center",
    borderRightWidth: 1,
    borderColor: "#000",
    justifyContent: "center",
  },
  itemsHeaderCellLast: {
    padding: 3,
    fontWeight: 700,
    fontSize: 7,
    textAlign: "center",
    justifyContent: "center",
  },
  itemsRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#000",
  },
  itemsCell: {
    padding: 3,
    fontSize: 7,
    borderRightWidth: 1,
    borderColor: "#000",
    justifyContent: "center",
  },
  itemsCellLast: {
    padding: 3,
    fontSize: 7,
    justifyContent: "center",
  },
  observaciones: {
    borderWidth: 1,
    borderColor: "#000",
    borderTopWidth: 0,
    minHeight: 40,
    padding: 4,
    fontSize: 7,
  },
  footerImage: {
    width: 564,
    position: "absolute",
    bottom: 10,
    left: 24,
  },
  signatureBlock: {
    borderWidth: 1,
    borderColor: "#000",
    padding: 4,
    flex: 1,
    minHeight: 60,
  },
  signatureLabel: {
    fontSize: 6,
    fontWeight: 700,
    marginBottom: 2,
  },
  signatureLine: {
    fontSize: 7,
    marginTop: 4,
    borderBottomWidth: 1,
    borderColor: "#000",
    minHeight: 12,
  },
  declaration: {
    borderWidth: 1,
    borderColor: "#000",
    padding: 4,
    fontSize: 7,
    marginBottom: 4,
  },
  spacer: {
    height: 4,
  },
});

function money(n: number | null | undefined) {
  return `$${(n || 0).toFixed(2)}`;
}

function formatDate(s: string | null | undefined) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("es-VE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return s;
  }
}

// Render a checkbox square (filled or empty)
function CheckSquare({ checked }: { checked: boolean }) {
  return <View style={checked ? styles.checkboxChecked : styles.checkbox} />;
}

// Render a Sí/No value using checkbox squares
function YesNoSquares({ value }: { value: boolean | null | undefined }) {
  return (
    <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
      <View style={styles.checkboxRow}>
        <CheckSquare checked={value === true} />
        <Text>Sí</Text>
      </View>
      <View style={styles.checkboxRow}>
        <CheckSquare checked={value === false} />
        <Text>No</Text>
      </View>
    </View>
  );
}

// Render a favorable/unfavorable value
function FavorableSquares({ value }: { value: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
      <View style={styles.checkboxRow}>
        <CheckSquare checked={value === "favorable"} />
        <Text>Favorable</Text>
      </View>
      <View style={styles.checkboxRow}>
        <CheckSquare checked={value === "no_favorable"} />
        <Text>No Favorable</Text>
      </View>
    </View>
  );
}

// Render an aplica/no_aplica value
function AplicaSquares({ value }: { value: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
      <View style={styles.checkboxRow}>
        <CheckSquare checked={value === "aplica"} />
        <Text>Aplica</Text>
      </View>
      <View style={styles.checkboxRow}>
        <CheckSquare checked={value === "no_aplica"} />
        <Text>No Aplica</Text>
      </View>
    </View>
  );
}

// Render a conforme/no_conforme value
function ResultadoSquares({ value }: { value: string }) {
  return (
    <View style={{ flexDirection: "column", gap: 2, alignItems: "flex-start" }}>
      <View style={styles.checkboxRow}>
        <CheckSquare checked={value === "conforme"} />
        <Text>Conforme</Text>
      </View>
      <View style={styles.checkboxRow}>
        <CheckSquare checked={value === "no_conforme"} />
        <Text>No Conforme</Text>
      </View>
    </View>
  );
}

// Label/value row helper (label on left, value on right, both in a bordered row)
function LabelValueRow({
  label,
  value,
  labelWidth = 120,
}: {
  label: string;
  value: string;
  labelWidth?: number;
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.cellLabel, { width: labelWidth }]}>
        <Text>{label}</Text>
      </View>
      <View style={[styles.cellValueLast, { flex: 1 }]}>
        <Text>{value || "—"}</Text>
      </View>
    </View>
  );
}

export interface DisenoServicioPdfDocumentProps {
  solicitud: DisenoServicioFullData;
}

export default function DisenoServicioPdfDocument({
  solicitud,
}: DisenoServicioPdfDocumentProps) {
  const isCAP =
    solicitud.tipo_servicio?.toLowerCase().includes("cap") ||
    solicitud.tipo_servicio?.toLowerCase().includes("capacitaci");
  const checklistItems = isCAP ? CAP_CHECKLIST_ITEMS : ST_CHECKLIST_ITEMS;

  const recursos = solicitud.bloque_recursos_requisitos;
  const higiene = solicitud.bloque_higiene_seguridad_ambiente;
  const planif = solicitud.bloque_planificacion_factibilidad;
  const controles = solicitud.bloque_controles_diseno;
  const salidas = solicitud.bloque_salidas_diseno;

  // Build checklist map for quick lookup of aplica/especifique by item label
  const checklistMap = new Map<string, { aplica: string; especifique: string }>();
  (salidas?.checklist || []).forEach((c) => {
    checklistMap.set(c.item, { aplica: c.aplica, especifique: c.especifique });
  });

  const costItems = planif?.estructura_costos || [];
  const grandTotal = costItems.reduce((sum, item) => sum + (item.total || 0), 0);

  return (
    <Document>
      <Page size="LEGAL" style={styles.page} wrap>
        {/* ===== HEADER (fixed — repeats on every page) ===== */}
        <View style={styles.headerRow} fixed>
          <Image style={styles.logo} src="/pdf/sha-logo.png" />
          <Text style={styles.title}>
            SOLICITUD PARA EL DISEÑO Y DESARROLLO DE NUEVOS SERVICIOS
          </Text>
          <View style={styles.metaBox}>
            <Text>
              <Text style={styles.metaLabel}>CÓDIGO</Text> RG-NEG-003
            </Text>
            <Text>
              <Text style={styles.metaLabel}>FECHA</Text> 04/08/2026
            </Text>
            <Text>
              <Text style={styles.metaLabel}>REVISIÓN</Text> 01
            </Text>
            <Text
              render={({ pageNumber, totalPages }) =>
                `PÁGINA ${pageNumber} de ${totalPages}`
              }
            />
          </View>
        </View>

        {/* ===== IDENTIFICACIÓN DEL REGISTRO ===== */}
        <View style={styles.subTitle}>
          <Text>Identificación del Registro</Text>
        </View>
        <View style={styles.table}>
          <View style={styles.row}>
            <View style={[styles.cellLabel, { flex: 1 }]}>
              <Text>Fecha de Solicitud</Text>
            </View>
            <View style={[styles.cellValue, { flex: 1 }]}>
              <Text>{formatDate(solicitud.fecha_solicitud)}</Text>
            </View>
            <View style={[styles.cellLabel, { flex: 1 }]}>
              <Text>Tipo de Solicitud</Text>
            </View>
            <View style={[styles.cellValueLast, { flex: 1 }]}>
              <Text>
                {solicitud.tipo_solicitud === "creacion"
                  ? "Nueva Creación"
                  : solicitud.tipo_solicitud === "modificacion"
                    ? "Modificación"
                    : solicitud.tipo_solicitud || "—"}
              </Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={[styles.cellLabel, { flex: 1 }]}>
              <Text>Tipo / Naturaleza del Servicio</Text>
            </View>
            <View style={[styles.cellValue, { flex: 1 }]}>
              <Text>{solicitud.tipo_servicio || "—"}</Text>
            </View>
            <View style={[styles.cellLabel, { flex: 1 }]}>
              <Text>Nombre y Apellido del Solicitante</Text>
            </View>
            <View style={[styles.cellValueLast, { flex: 1 }]}>
              <Text>{solicitud.solicitante_nombre || "—"}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={[styles.cellLabel, { flex: 1 }]}>
              <Text>Cargo del Solicitante</Text>
            </View>
            <View style={[styles.cellValueLast, { flex: 3 }]}>
              <Text>{solicitud.cargo_solicitante || "—"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.spacer} />

        {/* ===== BLOQUE I: ELEMENTOS DE ENTRADA ===== */}
        <View style={styles.sectionTitle} minPresenceAhead={30}>
          <Text>Bloque I: Elementos de Entrada (Llenado por Negocios / Solicitante)</Text>
        </View>
        <View style={styles.table}>
          <LabelValueRow
            label="Nombre Sugerido del Servicio"
            value={solicitud.nombre_sugerido || ""}
            labelWidth={140}
          />
          <View style={styles.row}>
            <View style={[styles.cellLabel, { width: 140 }]}>
              <Text>Objetivo / Propósito</Text>
            </View>
            <View style={[styles.cellValueLast, { flex: 1 }]}>
              <Text>{solicitud.objetivo_proposito || "—"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.spacer} />

        {/* Recursos Necesarios */}
        <View style={styles.subTitle}>
          <Text>Recursos Necesarios para la Ejecución del Servicio</Text>
        </View>
        <View style={styles.table}>
          <View style={styles.row}>
            <View style={[styles.cellLabel, { flex: 1 }]}>
              <Text>Personal Requerido (Competencias y Cantidad)</Text>
            </View>
            <View style={[styles.cellValue, { flex: 1 }]}>
              <Text>{recursos?.personal_requerido || "—"}</Text>
            </View>
            <View style={[styles.cellLabel, { flex: 1 }]}>
              <Text>Equipos y Herramientas</Text>
            </View>
            <View style={[styles.cellValueLast, { flex: 1 }]}>
              <Text>{recursos?.equipos_herramientas || "—"}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={[styles.cellLabel, { flex: 1 }]}>
              <Text>Software</Text>
            </View>
            <View style={[styles.cellValue, { flex: 1 }]}>
              <Text>{recursos?.software || "—"}</Text>
            </View>
            <View style={[styles.cellLabel, { flex: 1 }]}>
              <Text>Infraestructura</Text>
            </View>
            <View style={[styles.cellValueLast, { flex: 1 }]}>
              <Text>{recursos?.infraestructura || "—"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.spacer} />

        {/* Requisitos */}
        <View style={styles.table}>
          <View style={styles.row}>
            <View style={[styles.cellLabel, { flex: 1 }]}>
              <Text>Requisitos Legales y Reglamentarios</Text>
            </View>
            <View style={[styles.cellValue, { flex: 1 }]}>
              <Text>{recursos?.requisitos_legales || "—"}</Text>
            </View>
            <View style={[styles.cellLabel, { flex: 1 }]}>
              <Text>Requisitos del Cliente / Mercado</Text>
            </View>
            <View style={[styles.cellValueLast, { flex: 1 }]}>
              <Text>{recursos?.requisitos_cliente || "—"}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={[styles.cellLabel, { width: 140 }]}>
              <Text>Criterios de Aceptación del Servicio</Text>
            </View>
            <View style={[styles.cellValueLast, { flex: 1 }]}>
              <Text>{recursos?.criterios_aceptacion || "—"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.spacer} />

        {/* Aspectos Ambientales */}
        <View style={styles.subTitle}>
          <Text>¿El Servicio Genera Aspectos Ambientales?</Text>
        </View>
        <View style={styles.table}>
          <View style={styles.row}>
            <View style={[styles.cellLabel, { flex: 1 }]}>
              <Text>Generación de Residuos</Text>
            </View>
            <View style={[styles.cellValue, { flex: 1 }]}>
              <YesNoSquares value={higiene?.ambiental?.generacion_residuos ?? null} />
            </View>
            <View style={[styles.cellLabel, { flex: 1 }]}>
              <Text>Consumo de Energía</Text>
            </View>
            <View style={[styles.cellValue, { flex: 1 }]}>
              <YesNoSquares value={higiene?.ambiental?.consumo_energia ?? null} />
            </View>
          </View>
          <View style={styles.row}>
            <View style={[styles.cellLabel, { flex: 1 }]}>
              <Text>Emisiones o Vertidos</Text>
            </View>
            <View style={[styles.cellValue, { flex: 1 }]}>
              <YesNoSquares value={higiene?.ambiental?.emisiones_vertidos ?? null} />
            </View>
            <View style={[styles.cellLabel, { flex: 1 }]}>
              <Text>Significancia / Impacto / Controles</Text>
            </View>
            <View style={[styles.cellValueLast, { flex: 1 }]}>
              <Text>{higiene?.ambiental?.significancia || "—"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.spacer} />

        {/* Peligros SHA */}
        <View style={styles.subTitle}>
          <Text>¿El Servicio Introduce o Modifica Peligros para el Personal de SHA o del Cliente?</Text>
        </View>
        <View style={styles.table}>
          <View style={styles.row}>
            {[
              { label: "Biológicos", val: higiene?.peligros?.biologicos },
              { label: "Mecánicos", val: higiene?.peligros?.mecanicos },
              { label: "Ergonómicos", val: higiene?.peligros?.ergonomicos },
            ].map((p, i) => (
              <View
                key={i}
                style={[
                  i < 2 ? styles.cellValue : styles.cellValueLast,
                  { flex: 1, flexDirection: "row", alignItems: "center", gap: 4 },
                ]}
              >
                <CheckSquare checked={p.val ?? false} />
                <Text>{p.label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.row}>
            {[
              { label: "Eléctricos", val: higiene?.peligros?.electricos },
              { label: "Químicos", val: higiene?.peligros?.quimicos },
            ].map((p, i) => (
              <View
                key={i}
                style={[
                  styles.cellValue,
                  { flex: 1, flexDirection: "row", alignItems: "center", gap: 4 },
                ]}
              >
                <CheckSquare checked={p.val ?? false} />
                <Text>{p.label}</Text>
              </View>
            ))}
            <View style={[styles.cellLabel, { flex: 1 }]}>
              <Text>Otros (Especifique)</Text>
            </View>
            <View style={[styles.cellValueLast, { flex: 1 }]}>
              <Text>{higiene?.peligros?.otros || "—"}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={[styles.cellLabel, { width: 140 }]}>
              <Text>Descripción del Peligro / Nivel de Riesgo / Controles</Text>
            </View>
            <View style={[styles.cellValueLast, { flex: 1 }]}>
              <Text>{higiene?.peligros?.descripcion || "—"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.spacer} />

        {/* Antecedentes */}
        <View style={styles.table}>
          <View style={styles.row}>
            <View style={[styles.cellLabel, { flex: 1 }]}>
              <Text>¿Existen Antecedentes o Servicios Similares?</Text>
            </View>
            <View style={[styles.cellValue, { flex: 1 }]}>
              <YesNoSquares value={recursos?.antecedentes?.existe ?? null} />
            </View>
            <View style={[styles.cellLabel, { flex: 1 }]}>
              <Text>Especifique</Text>
            </View>
            <View style={[styles.cellValueLast, { flex: 1 }]}>
              <Text>{recursos?.antecedentes?.especificacion || "—"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.spacer} />

        {/* ===== BLOQUE II: FACTIBILIDAD Y PLANIFICACIÓN ===== */}
        <View style={styles.sectionTitle} minPresenceAhead={30}>
          <Text>Bloque II: Factibilidad y Planificación (Llenado por Departamento Ejecutante)</Text>
        </View>
        <View style={styles.table}>
          <View style={styles.row}>
            <View style={[styles.cellLabel, { flex: 1 }]}>
              <Text>Recurso Asignado / Personal Técnico</Text>
            </View>
            <View style={[styles.cellValue, { flex: 1 }]}>
              <Text>{planif?.recurso_asignado || "—"}</Text>
            </View>
            <View style={[styles.cellLabel, { flex: 1 }]}>
              <Text>Equipos / Instrumentos Asignados</Text>
            </View>
            <View style={[styles.cellValueLast, { flex: 1 }]}>
              <Text>{planif?.equipos_asignados || "—"}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={[styles.cellLabel, { flex: 1 }]}>
              <Text>Software / Material Didáctico Asignado</Text>
            </View>
            <View style={[styles.cellValueLast, { flex: 3 }]}>
              <Text>{planif?.software_material_asignado || "—"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.spacer} />

        {/* Estructura de Costos */}
        <View style={styles.subTitle}>
          <Text>Estructura de Costo Estimada</Text>
        </View>
        <View style={styles.table}>
          <View style={styles.itemsHeaderRow}>
            <View style={[styles.itemsHeaderCell, { flex: 3 }]}>
              <Text>Descripción (Recursos / Materiales / Equipos)</Text>
            </View>
            <View style={[styles.itemsHeaderCell, { flex: 1 }]}>
              <Text>Cantidad</Text>
            </View>
            <View style={[styles.itemsHeaderCell, { flex: 1 }]}>
              <Text>Unidad</Text>
            </View>
            <View style={[styles.itemsHeaderCell, { flex: 1 }]}>
              <Text>Precio Unit.</Text>
            </View>
            <View style={[styles.itemsHeaderCellLast, { flex: 1 }]}>
              <Text>Total</Text>
            </View>
          </View>
          {costItems.length === 0 ? (
            <View style={styles.itemsRow}>
              <View style={[styles.itemsCellLast, { flex: 7 }]}>
                <Text>—</Text>
              </View>
            </View>
          ) : (
            costItems.map((item, idx) => (
              <View key={idx} style={styles.itemsRow}>
                <View style={[styles.itemsCell, { flex: 3 }]}>
                  <Text>{item.descripcion || "—"}</Text>
                </View>
                <View style={[styles.itemsCell, { flex: 1 }]}>
                  <Text>{String(item.cantidad ?? "")}</Text>
                </View>
                <View style={[styles.itemsCell, { flex: 1 }]}>
                  <Text>{item.unidad || "—"}</Text>
                </View>
                <View style={[styles.itemsCell, { flex: 1 }]}>
                  <Text>{money(item.precio_unitario)}</Text>
                </View>
                <View style={[styles.itemsCellLast, { flex: 1 }]}>
                  <Text>{money(item.total)}</Text>
                </View>
              </View>
            ))
          )}
          <View style={styles.itemsRow}>
            <View style={[styles.itemsCell, { flex: 6, fontWeight: 700 }]}>
              <Text>Total General</Text>
            </View>
            <View style={[styles.itemsCellLast, { flex: 1, fontWeight: 700 }]}>
              <Text>{money(grandTotal)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.spacer} />

        {/* Viabilidad */}
        <View style={styles.subTitle}>
          <Text>Evaluación de Viabilidad del Servicio</Text>
        </View>
        <View style={styles.table}>
          <View style={styles.row}>
            <View style={[styles.cellLabel, { flex: 1 }]}>
              <Text>Viabilidad Técnica</Text>
            </View>
            <View style={[styles.cellValue, { flex: 1 }]}>
              <FavorableSquares value={planif?.viabilidad_tecnica || ""} />
            </View>
            <View style={[styles.cellLabel, { flex: 1 }]}>
              <Text>Viabilidad Económica</Text>
            </View>
            <View style={[styles.cellValueLast, { flex: 1 }]}>
              <FavorableSquares value={planif?.viabilidad_economica || ""} />
            </View>
          </View>
          <View style={styles.row}>
            <View style={[styles.cellLabel, { flex: 1 }]}>
              <Text>Tiempo Estimado</Text>
            </View>
            <View style={[styles.cellValue, { flex: 1 }]}>
              <Text>{planif?.tiempo_estimado || "—"}</Text>
            </View>
            <View style={[styles.cellLabel, { flex: 1 }]}>
              <Text>Fecha Estimada de Finalización</Text>
            </View>
            <View style={[styles.cellValueLast, { flex: 1 }]}>
              <Text>{formatDate(planif?.fecha_estimada_finalizacion)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.spacer} />

        {/* Aprobación de Inicio */}
        <View style={styles.subTitle}>
          <Text>Aprobación de Inicio</Text>
        </View>
        <View style={styles.table}>
          <View style={styles.row}>
            <View style={[styles.cellLabel, { flex: 1 }]}>
              <Text>Nombre y Apellido</Text>
            </View>
            <View style={[styles.cellValue, { flex: 1 }]}>
              <Text>{planif?.aprobacion?.nombre || "—"}</Text>
            </View>
            <View style={[styles.cellLabel, { flex: 1 }]}>
              <Text>Cargo</Text>
            </View>
            <View style={[styles.cellValue, { flex: 1 }]}>
              <Text>{planif?.aprobacion?.cargo || "—"}</Text>
            </View>
            <View style={[styles.cellLabel, { flex: 1 }]}>
              <Text>Fecha</Text>
            </View>
            <View style={[styles.cellValueLast, { flex: 1 }]}>
              <Text>{formatDate(planif?.aprobacion?.fecha)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.spacer} />

        {/* ===== BLOQUE III: CONTROLES DEL DISEÑO ===== */}
        <View style={styles.sectionTitle} minPresenceAhead={30}>
          <Text>Bloque III: Controles del Diseño (Llenado por Departamento Ejecutante)</Text>
        </View>
        <View style={styles.table}>
          <View style={styles.itemsHeaderRow}>
            <View style={[styles.itemsHeaderCell, { flex: 1.2 }]}>
              <Text>Actividad de Control</Text>
            </View>
            <View style={[styles.itemsHeaderCell, { flex: 2.5 }]}>
              <Text>Descripción de la Actividad Realizada</Text>
            </View>
            <View style={[styles.itemsHeaderCell, { flex: 1 }]}>
              <Text>Responsable (Cargo)</Text>
            </View>
            <View style={[styles.itemsHeaderCell, { flex: 0.8 }]}>
              <Text>Fecha</Text>
            </View>
            <View style={[styles.itemsHeaderCellLast, { flex: 1.2 }]}>
              <Text>Resultado</Text>
            </View>
          </View>
          {[
            {
              key: "revision",
              title: "Revisión",
              desc: "Evaluación de la capacidad de los resultados para cumplir requisitos.",
              entry: controles?.revision,
            },
            {
              key: "verificacion",
              title: "Verificación",
              desc: "Comprobación de que las salidas cumplen con las entradas del Bloque I.",
              entry: controles?.verificacion,
            },
            {
              key: "validacion",
              title: "Validación",
              desc: "Confirmación (prueba piloto / simulacro) de que el servicio es apto.",
              entry: controles?.validacion,
            },
          ].map((section, idx) => (
            <View key={idx} style={styles.itemsRow}>
              <View style={[styles.itemsCell, { flex: 1.2, fontWeight: 700 }]}>
                <Text>{section.title}</Text>
                <Text style={{ fontSize: 6, fontWeight: 400 }}>{section.desc}</Text>
              </View>
              <View style={[styles.itemsCell, { flex: 2.5 }]}>
                <Text>{section.entry?.descripcion || "—"}</Text>
              </View>
              <View style={[styles.itemsCell, { flex: 1 }]}>
                <Text>{section.entry?.responsable || "—"}</Text>
              </View>
              <View style={[styles.itemsCell, { flex: 0.8 }]}>
                <Text>{formatDate(section.entry?.fecha)}</Text>
              </View>
              <View style={[styles.itemsCellLast, { flex: 1.2 }]}>
                <ResultadoSquares value={section.entry?.resultado || ""} />
              </View>
            </View>
          ))}
        </View>

        <View style={styles.spacer} />

        {/* ===== BLOQUE IV: SALIDAS DEL DISEÑO ===== */}
        <View style={styles.sectionTitle} minPresenceAhead={30}>
          <Text>Bloque IV: Salidas del Diseño y Desarrollo (Llenado por Departamento Ejecutante)</Text>
        </View>
        <View style={styles.subTitle}>
          <Text>
            Documentos generados — {isCAP ? "Capacitación (CAP)" : "Servicio Técnico (ST)"}
          </Text>
        </View>
        <View style={styles.table}>
          <View style={styles.itemsHeaderRow}>
            <View style={[styles.itemsHeaderCell, { flex: 3 }]}>
              <Text>Salidas</Text>
            </View>
            <View style={[styles.itemsHeaderCell, { flex: 1 }]}>
              <Text>¿Aplica?</Text>
            </View>
            <View style={[styles.itemsHeaderCellLast, { flex: 2 }]}>
              <Text>Especifique</Text>
            </View>
          </View>
          {checklistItems.map((item, idx) => {
            const entry = checklistMap.get(item);
            return (
              <View key={idx} style={styles.itemsRow}>
                <View style={[styles.itemsCell, { flex: 3 }]}>
                  <Text>{item}</Text>
                </View>
                <View style={[styles.itemsCell, { flex: 1 }]}>
                  <AplicaSquares value={entry?.aplica || ""} />
                </View>
                <View style={[styles.itemsCellLast, { flex: 2 }]}>
                  <Text>{entry?.aplica === "aplica" ? entry?.especifique || "—" : "—"}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.spacer} />

        {/* Declaración de Cumplimiento */}
        <View style={styles.table}>
          <View style={styles.row}>
            <View style={[styles.cellLabel, { flex: 2 }]}>
              <Text>
                ¿Las salidas del diseño cumplen con las entradas del Bloque I?
              </Text>
            </View>
            <View style={[styles.cellValueLast, { flex: 1 }]}>
              <YesNoSquares value={salidas?.declaracion_cumplimiento ?? null} />
            </View>
          </View>
        </View>
        <View style={styles.subTitle}>
          <Text>Observaciones (si aplican)</Text>
        </View>
        <View style={styles.observaciones}>
          <Text>{salidas?.observaciones || "—"}</Text>
        </View>

        <View style={styles.spacer} />

        {/* ===== BLOQUE V: CIERRE ===== */}
        <View style={styles.sectionTitle} minPresenceAhead={30}>
          <Text>Bloque V: Cierre</Text>
        </View>
        <View style={styles.declaration}>
          <Text style={{ fontWeight: 700 }}>
            Declaración de Conformidad:
          </Text>
          <Text>
            {" "}
            Se certifica que el diseño ha sido completado satisfactoriamente y los
            documentos han sido aprobados conforme a los requisitos establecidos.
          </Text>
        </View>

        {/* Signature blocks */}
        <View style={{ flexDirection: "row", gap: 4 }}>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>Recurso Asignado / Personal Técnico</Text>
            <Text style={styles.signatureLabel}>Nombre y Apellido:</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Cargo:</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Firma:</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Fecha:</Text>
            <View style={styles.signatureLine} />
          </View>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>Líder del Departamento Ejecutante</Text>
            <Text style={styles.signatureLabel}>Nombre y Apellido:</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Cargo:</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Firma:</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Fecha:</Text>
            <View style={styles.signatureLine} />
          </View>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>Aprobado Por: Director Gerente</Text>
            <Text style={styles.signatureLabel}>Nombre y Apellido:</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Cargo:</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Firma:</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Fecha:</Text>
            <View style={styles.signatureLine} />
          </View>
        </View>

        {/* Footer (fixed — repeats on every page) */}
        <Image style={styles.footerImage} src="/pdf/sha-footer.png" fixed />
      </Page>
    </Document>
  );
}
