/** Clases tipográficas compartidas del documento OSI (pantalla + impresión). */
export const OSI_DOC_ROOT_TEXT_CLASS = "text-[12px]";

export const OSI_DOC_VALUE_CLASS =
  "osi-doc-value text-center font-semibold tabular-nums";

export const OSI_DOC_VALUE_BOLD_CLASS =
  "osi-doc-value text-center font-bold tabular-nums";

export const OSI_BOOLEAN_VALUE_CLASS =
  "osi-boolean-value text-center font-bold uppercase tabular-nums";

export function format_osi_si_no(value: boolean): "SÍ" | "NO" {
  return value ? "SÍ" : "NO";
}

export function format_certificado_entrega_display(
  certificado: boolean,
  entrega: "retira_cliente" | "se_envia" | null | undefined,
): string {
  if (!certificado) return "NO";
  switch (entrega) {
    case "retira_cliente":
      return "SÍ — RETIRA EL CLIENTE";
    case "se_envia":
      return "SÍ — SE ENVÍA";
    default:
      return "SÍ";
  }
}
