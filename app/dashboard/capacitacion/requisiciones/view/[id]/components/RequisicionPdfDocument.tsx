import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { RequisicionItem, OSIFixedItem } from "@/types/requisiciones";

const styles = StyleSheet.create({
  page: {
    padding: 24,
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
    fontSize: 16,
    fontWeight: 700,
    textAlign: "center",
    flex: 1,
  },
  metaBox: {
    fontSize: 7,
    textAlign: "right",
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
    backgroundColor: "#d9d9d9",
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
    backgroundColor: "#a6a6a6",
    fontWeight: 700,
    textAlign: "center",
    padding: 3,
    fontSize: 9,
    textTransform: "uppercase",
  },
  itemsHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#d9d9d9",
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
  itemsRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#000",
    minHeight: 16,
  },
  itemsCell: {
    padding: 3,
    fontSize: 7,
    borderRightWidth: 1,
    borderColor: "#000",
    justifyContent: "center",
  },
  osiSubHeader: {
    backgroundColor: "#bfdbfe",
    padding: 3,
    fontSize: 7,
    fontWeight: 700,
    borderBottomWidth: 1,
    borderColor: "#000",
  },
  observaciones: {
    borderWidth: 1,
    borderColor: "#000",
    borderTopWidth: 0,
    minHeight: 50,
    padding: 4,
    fontSize: 7,
  },
  footerImage: {
    width: "100%",
  },
});

const DEPARTAMENTOS = [
  "Negocios",
  "Marketing",
  "Administración",
  "TED",
  "SIG",
  "SSST",
  "Servicio Técnico",
  "Capacitación",
];

function normalize(s: string | null | undefined) {
  return (s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function matchDepartamento(gerencia: string | null | undefined): string | null {
  const norm = normalize(gerencia);
  if (!norm) return null;
  for (const dep of DEPARTAMENTOS) {
    const depNorm = normalize(dep);
    if (norm === depNorm || norm.includes(depNorm) || depNorm.includes(norm)) return dep;
  }
  if (norm.includes("servicio") && norm.includes("tecnic")) return "Servicio Técnico";
  if (norm.includes("capacitacion")) return "Capacitación";
  return null;
}

function money(n: number | null | undefined) {
  return `$${(n || 0).toFixed(2)}`;
}

interface PdfRow {
  item: number;
  cant: string;
  unidad: string;
  descripcion: string;
  verificacion: string;
  osiLabel?: string;
}

export interface RequisicionPdfDocumentProps {
  record: any;
  isCapacitacion: boolean;
  isGeneralMode: boolean;
  osiFixedItems: OSIFixedItem[];
  additionalItems: RequisicionItem[];
  linkedOSIs: { id_osi: number }[];
  osiLookup?: Map<number, string>;
  osiData?: any;
}

export default function RequisicionPdfDocument({
  record,
  isCapacitacion,
  isGeneralMode,
  osiFixedItems,
  additionalItems,
  linkedOSIs,
  osiLookup,
  osiData,
}: RequisicionPdfDocumentProps) {
  const showOsiColumn = linkedOSIs.length > 1;
  const departamentoMatch = matchDepartamento(record.gerencia_solicitante);

  const rows: PdfRow[] = [];
  let itemNum = 1;

  if (isCapacitacion) {
    for (const fi of osiFixedItems) {
      const osiLabel = fi.nro_osi || (osiLookup?.get(fi.id_osi) ?? `#${fi.id_osi}`);
      if (showOsiColumn) {
        rows.push({ item: 0, cant: "", unidad: "", descripcion: `OSI: ${osiLabel}`, verificacion: "", osiLabel: "__header__" });
      }
      if (fi.dias_traslado || fi.costo_traslado) {
        rows.push({
          item: itemNum++,
          cant: String(fi.dias_traslado || 0),
          unidad: "T",
          descripcion: `${fi.dias_traslado || 0} día(s) de traslado x ${money(fi.costo_traslado)} = ${money((fi.dias_traslado || 0) * (fi.costo_traslado || 0))} total`,
          verificacion: fi.verificacion_traslado === "listo" ? "Listo" : "Pendiente",
          osiLabel,
        });
      }
      if (fi.impresion_total) {
        rows.push({
          item: itemNum++,
          cant: "1",
          unidad: "I",
          descripcion: `Impresión total ${money(fi.impresion_total)}`,
          verificacion: fi.verificacion_impresion === "listo" ? "Listo" : "Pendiente",
          osiLabel,
        });
      }
      if (fi.honorarios_total) {
        rows.push({
          item: itemNum++,
          cant: String(fi.honorarios_horas || 0),
          unidad: "H",
          descripcion: `Honorarios: ${fi.honorarios_horas || 0} hora(s) x ${money(fi.honorarios_costo_hora)} = ${money(fi.honorarios_total)} total`,
          verificacion: fi.verificacion_honorarios === "listo" ? "Listo" : "Pendiente",
          osiLabel,
        });
      }
      if (fi.informe_final_total) {
        rows.push({
          item: itemNum++,
          cant: "1",
          unidad: "IF",
          descripcion: `Informe final ${money(fi.informe_final_total)}`,
          verificacion: fi.verificacion_informe_final === "listo" ? "Listo" : "Pendiente",
          osiLabel,
        });
      }
    }
  }

  for (const item of additionalItems) {
    const osiLabel = item.id_osi != null ? (osiLookup?.get(item.id_osi) ?? `#${item.id_osi}`) : "Sin asignar";
    const costText = item.costo_unitario
      ? ` (costo unit. ${money(item.costo_unitario)}, total ${money(item.total)})`
      : "";
    rows.push({
      item: itemNum++,
      cant: String(item.cant || 1),
      unidad: item.unidad || "und",
      descripcion: `${item.descripcion || "-"}${costText}`,
      verificacion: item.verificacion === "listo" ? "Listo" : "Pendiente",
      osiLabel: showOsiColumn ? osiLabel : undefined,
    });
  }

  const facilitadorText = isCapacitacion
    ? [
        record.facilitador ? `Facilitador: ${record.facilitador}` : null,
        (record.cedula_facilitador || record.rif_facilitador)
          ? `Cédula/RIF: ${record.cedula_facilitador || "-"} / ${record.rif_facilitador || "-"}`
          : null,
        record.banco ? `Banco: ${record.banco}` : null,
        record.nro_cuenta ? `Cuenta: ${record.nro_cuenta}` : null,
        record.telefono_facilitador ? `Teléfono: ${record.telefono_facilitador}` : null,
        record.tasa_cambio != null
          ? `Tasa USD→VES: ${Number(record.tasa_cambio)}${record.tasa_cambio_at ? ` (guardada el ${new Date(record.tasa_cambio_at).toLocaleDateString("es-VE")})` : ""}`
          : null,
      ]
        .filter(Boolean)
        .join(" | ")
    : "";

  const observacionesText = [record.observaciones_compras, facilitadorText].filter(Boolean).join("\n\n");

  const osiNumbers = linkedOSIs
    .map((ro) => osiLookup?.get(ro.id_osi) || `#${ro.id_osi}`)
    .join(", ");

  // Document-control header: revision/fecha are now persisted per-row
  // (backfilled once via SQL migration based on created_at). Fall back to
  // the old procesada_at-based derivation only if the columns are missing
  // (e.g. migration not yet applied in this environment).
  const REV01_CUTOVER = "2026-08-20T00:00:00.000Z";
  const persistedRevision = record.revision as string | undefined;
  const persistedFecha = record.fecha_revision as string | undefined;

  let revisionLabel: string;
  let fechaRevision: string;
  if (persistedRevision && persistedFecha) {
    revisionLabel = persistedRevision;
    fechaRevision = persistedFecha;
  } else {
    const isOldRevision =
      !!record.procesada_at &&
      new Date(record.procesada_at).getTime() < new Date(REV01_CUTOVER).getTime();
    revisionLabel = isOldRevision ? "00" : "01";
    fechaRevision = isOldRevision ? "12/06/2026" : "20/08/2026";
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <Image style={styles.logo} src="/pdf/sha-logo.png" />
          <Text style={styles.title}>REQUISICIÓN</Text>
          <View style={styles.metaBox}>
            <Text>CÓDIGO RG-ADM-003</Text>
            <Text>FECHA {fechaRevision}</Text>
            <Text>REVISIÓN {revisionLabel}</Text>
            <Text>PÁGINA 1 de 1</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.row}>
            <View style={[styles.cellLabel, { width: "25%" }]}>
              <Text>Corresponde a:</Text>
            </View>
            <View style={[styles.cellValue, { width: "35%" }]}>
              <Text>Servicios</Text>
            </View>
            <View style={[styles.cellLabel, { width: "15%" }]}>
              <Text>Fecha de solicitud:</Text>
            </View>
            <View style={[styles.cellValue, { width: "25%", borderRightWidth: 0 }]}>
              <Text>{record.fecha_solicitud ? new Date(record.fecha_solicitud + "T00:00:00").toLocaleDateString() : "-"}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.cellLabel, { width: "15%" }]}>
              <Text>Tipo de solicitud:</Text>
            </View>
            <View style={[styles.cellValue, { width: "10%" }]}>
              <View style={styles.checkboxRow}>
                <View style={record.tipo_solicitud === "Interno" ? styles.checkboxChecked : styles.checkbox} />
                <Text>Interno</Text>
              </View>
              <View style={styles.checkboxRow}>
                <View style={record.tipo_solicitud === "Externo" ? styles.checkboxChecked : styles.checkbox} />
                <Text>Externo</Text>
              </View>
            </View>
            <View style={[styles.cellLabel, { width: "15%" }]}>
              <Text>Departamento solicitante:</Text>
            </View>
            <View style={[styles.cellValue, { width: "60%", borderRightWidth: 0 }]}>
              <View style={{ flexDirection: "row", gap: 6, marginBottom: 2 }}>
                {["Negocios", "Marketing", "Administración", "TED"].map((dep) => (
                  <View key={dep} style={[styles.checkboxRow, { gap: 2 }]}>
                    <View style={departamentoMatch === dep ? styles.checkboxChecked : styles.checkbox} />
                    <Text style={{ fontSize: 7 }}>{dep}</Text>
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                {["SIG", "SSST", "Servicio Técnico", "Capacitación"].map((dep) => (
                  <View key={dep} style={[styles.checkboxRow, { gap: 2 }]}>
                    <View style={departamentoMatch === dep ? styles.checkboxChecked : styles.checkbox} />
                    <Text style={{ fontSize: 7 }}>{dep}</Text>
                  </View>
                ))}
                <View style={[styles.checkboxRow, { gap: 2, marginLeft: 8 }]}>
                  <Text style={{ fontSize: 7, fontWeight: 700 }}>N° OSI:</Text>
                  <Text style={{ fontSize: 7 }}>{!isGeneralMode ? (osiNumbers || "-") : ""}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.cellLabel, { width: "25%" }]}>
              <Text>Gerencia solicitante:</Text>
            </View>
            <View style={[styles.cellValue, { width: "25%" }]}>
              <Text>{record.gerencia_display || record.gerencia_solicitante || "-"}</Text>
            </View>
            <View style={[styles.cellLabel, { width: "25%" }]}>
              <Text>Departamento:</Text>
            </View>
            <View style={[styles.cellValue, { width: "25%", borderRightWidth: 0 }]}>
              <Text>{record.departamento || "-"}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.cellLabel, { width: "25%" }]}>
              <Text>Nombre del solicitante:</Text>
            </View>
            <View style={[styles.cellValue, { width: "75%", borderRightWidth: 0 }]}>
              <Text>{record.solicitante || "-"}</Text>
            </View>
          </View>

          {record.id_sesion && (() => {
            const sesiones = (osiData?.desglose_recursos_sesiones as any[] | null | undefined) || [];
            const sesion = sesiones.find((s) => s.id_sesion === record.id_sesion);
            if (!sesion) return null;
            return (
              <View style={styles.row}>
                <View style={[styles.cellLabel, { width: "20%" }]}>
                  <Text>Sesión:</Text>
                </View>
                <View style={[styles.cellValue, { width: "80%", borderRightWidth: 0 }]}>
                  <Text>{`Sesión #${sesion.nro_sesion ?? sesion.id_sesion}${sesion.fecha ? ` — ${sesion.fecha}` : ""}`}</Text>
                </View>
              </View>
            );
          })()}

          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <View style={[styles.cellLabel, { width: "25%" }]}>
              <Text>Prioridad:</Text>
            </View>
            <View style={[styles.cellValue, { width: "75%", borderRightWidth: 0, flexDirection: "row", gap: 14 }]}>
              {["Alta", "Media", "Baja"].map((p) => (
                <View key={p} style={styles.checkboxRow}>
                  <View style={record.prioridad === p ? styles.checkboxChecked : styles.checkbox} />
                  <Text>{p}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Detalles de la solicitud</Text>

        <View style={styles.itemsHeaderRow}>
          <View style={[styles.itemsHeaderCell, { width: "6%" }]}>
            <Text>ITEM</Text>
          </View>
          <View style={[styles.itemsHeaderCell, { width: "8%" }]}>
            <Text>CANT</Text>
          </View>
          <View style={[styles.itemsHeaderCell, { width: "12%" }]}>
            <Text>UNIDAD/CONCEPTO</Text>
          </View>
          <View style={[styles.itemsHeaderCell, { width: showOsiColumn ? "54%" : "62%" }]}>
            <Text>DESCRIPCIÓN</Text>
          </View>
          {showOsiColumn && (
            <View style={[styles.itemsHeaderCell, { width: "12%" }]}>
              <Text>OSI</Text>
            </View>
          )}
          <View style={[styles.itemsHeaderCell, { width: "12%", borderRightWidth: 0 }]}>
            <Text>VERIFICACIÓN</Text>
          </View>
        </View>

        {rows.map((row, idx) =>
          row.osiLabel === "__header__" ? (
            <View key={`osihdr-${idx}`} style={styles.osiSubHeader}>
              <Text>{row.descripcion}</Text>
            </View>
          ) : (
            <View key={`row-${idx}`} style={styles.itemsRow}>
              <View style={[styles.itemsCell, { width: "6%", textAlign: "center" }]}>
                <Text>{row.item}</Text>
              </View>
              <View style={[styles.itemsCell, { width: "8%", textAlign: "center" }]}>
                <Text>{row.cant}</Text>
              </View>
              <View style={[styles.itemsCell, { width: "12%", textAlign: "center", textTransform: "uppercase" }]}>
                <Text>{row.unidad}</Text>
              </View>
              <View style={[styles.itemsCell, { width: showOsiColumn ? "54%" : "62%" }]}>
                <Text>{row.descripcion}</Text>
              </View>
              {showOsiColumn && (
                <View style={[styles.itemsCell, { width: "12%", textAlign: "center" }]}>
                  <Text>{row.osiLabel || "-"}</Text>
                </View>
              )}
              <View style={[styles.itemsCell, { width: "12%", textAlign: "center", borderRightWidth: 0 }]}>
                <Text>{row.verificacion}</Text>
              </View>
            </View>
          ),
        )}

        <Text style={[styles.sectionTitle, { marginTop: 6 }]}>Observaciones</Text>
        <View style={styles.observaciones}>
          <Text>{observacionesText || "SIN OBSERVACIONES"}</Text>
        </View>

        <View style={{ flex: 1 }} />

        <Image style={styles.footerImage} src="/pdf/sha-footer.png" />
      </Page>
    </Document>
  );
}
