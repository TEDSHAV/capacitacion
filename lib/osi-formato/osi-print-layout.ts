/** Área imprimible por hoja (carta, márgenes @page 10mm arriba/abajo). */
export const OSI_PRINT_PAGE_FULL_MM = 279.4 - 20;

/** Altura útil para relleno en página 1 (reserva aprox. del pie fijo multipágina). */
export const OSI_PRINT_PAGE_CONTENT_MM = OSI_PRINT_PAGE_FULL_MM - 22;

export function mm_to_px(mm: number): number {
  return mm * (96 / 25.4);
}

export function compute_osi_page_count(sheet: HTMLElement): number {
  const page_px = mm_to_px(OSI_PRINT_PAGE_FULL_MM);
  const header = sheet.querySelector<HTMLElement>(".osi-print-header");
  const units = sheet.querySelectorAll<HTMLElement>(".osi-print-unit");
  const flow_footer = sheet.querySelector<HTMLElement>(".osi-print-footer-flow");

  let total = header?.offsetHeight ?? 0;
  for (const unit of units) {
    total += unit.offsetHeight;
  }
  if (flow_footer) {
    total += flow_footer.offsetHeight;
  }

  return Math.max(1, Math.ceil(total / page_px));
}

/**
 * Calcula espacio vacío al final de la página 1 cuando el primer bloque
 * cola (desglose / quejas / estatus) empieza en la página 2.
 */
export function compute_osi_page1_fill_gap(sheet: HTMLElement): number {
  const page_content_px = mm_to_px(OSI_PRINT_PAGE_CONTENT_MM);
  const header = sheet.querySelector<HTMLElement>(".osi-print-header");
  const units = sheet.querySelectorAll<HTMLElement>(".osi-print-unit");

  let y = header?.offsetHeight ?? 0;
  let prev_bottom = y;
  const gap_between_units_px = 0;

  for (const unit of units) {
    const top = y;
    const height = unit.offsetHeight;
    const bottom = top + height;
    const is_tail = unit.classList.contains("osi-print-tail");

    if (is_tail && top >= page_content_px - 4) {
      const gap = page_content_px - prev_bottom;
      if (gap > 36) {
        return Math.min(Math.round(gap - 12), 220);
      }
      return 0;
    }

    prev_bottom = bottom;
    y = bottom + gap_between_units_px;
  }

  return 0;
}

export function distribute_osi_page1_fill(
  sheet: HTMLElement,
  fill_px: number,
): void {
  const grow_nodes = sheet.querySelectorAll<HTMLElement>("[data-osi-grow-weight]");
  if (grow_nodes.length === 0 || fill_px <= 0) {
    sheet.style.removeProperty("--osi-page1-fill-px");
    for (const node of grow_nodes) {
      node.style.removeProperty("min-height");
    }
    return;
  }

  sheet.style.setProperty("--osi-page1-fill-px", `${fill_px}px`);

  let weight_sum = 0;
  for (const node of grow_nodes) {
    weight_sum += Number(node.dataset.osiGrowWeight ?? "0");
  }
  if (weight_sum <= 0) return;

  for (const node of grow_nodes) {
    const weight = Number(node.dataset.osiGrowWeight ?? "0");
    const extra = Math.round((fill_px * weight) / weight_sum);
    const base = Number(node.dataset.osiGrowBase ?? "48");
    node.style.minHeight = `${base + extra}px`;
  }
}
