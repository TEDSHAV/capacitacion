import {
  extract_osi_solicitud_observacion_text,
  strip_legacy_osi_concat_markers,
} from "./rich-html";

export type OsiObservacionDocumentItem = {
  servicio?: string;
  etiqueta: "SOLPED" | "OSI";
  contenido: string;
  maskKey?: string;
};

function normalize_observacion_text(value: string | null | undefined): string {
  return strip_legacy_osi_concat_markers(String(value ?? "").trim());
}

/** Delimitadores de vista (`| OSI:`) + legados (`OBS. EJECUCIÓN` / `ADICIONAL OSI`). */
const OBS_PIPE_SPLIT_RE =
  /\s*\|\s*(?:OBS\.\s*EJECUCIÓN|ADICIONAL\s+OSI|OSI)\s*:\s*/i;

function split_observaciones_legacy_pipe(value: string): {
  solped: string;
  osi: string | null;
} {
  const match = value.match(OBS_PIPE_SPLIT_RE);
  if (!match || match.index === undefined) {
    return { solped: value.trim(), osi: null };
  }
  return {
    solped: value.slice(0, match.index).trim(),
    osi: value.slice(match.index + match[0].length).trim(),
  };
}

function push_unique_obs_item(
  items: OsiObservacionDocumentItem[],
  item: OsiObservacionDocumentItem,
): void {
  const exists = items.some(
    (current) =>
      current.etiqueta === item.etiqueta &&
      current.contenido === item.contenido,
  );
  if (!exists) items.push(item);
}

export function build_osi_observaciones_document_items(params: {
  stServicios?: Array<{
    nombre: string;
    observaciones?: string | null;
  }>;
  observacionesSolped?: string | null;
  observacionesOsiSolicitud?: string | null;
  observacionesOsi?: string | null;
  hideOsiSolicitud?: boolean;
}): OsiObservacionDocumentItem[] {
  const items: OsiObservacionDocumentItem[] = [];

  for (const svc of params.stServicios ?? []) {
    const contenido = normalize_observacion_text(svc.observaciones);
    if (!contenido) continue;
    items.push({
      servicio: svc.nombre,
      etiqueta: "SOLPED",
      contenido,
      maskKey: `osi_content_hidden:obs:${items.length}`,
    });
  }

  if (items.length === 0) {
    const solped_raw = String(params.observacionesSolped ?? "").trim();
    if (solped_raw) {
      const split = split_observaciones_legacy_pipe(solped_raw);
      if (split.solped) {
        items.push({
          etiqueta: "SOLPED",
          contenido: normalize_observacion_text(split.solped),
          maskKey: "osi_content_hidden:obs:base",
        });
      }
      if (split.osi) {
        push_unique_obs_item(items, {
          etiqueta: "OSI",
          contenido: extract_osi_solicitud_observacion_text(split.osi),
        });
      }
    }
  }

  if (!params.hideOsiSolicitud) {
    const obs_solicitud = extract_osi_solicitud_observacion_text(
      params.observacionesOsiSolicitud,
    );
    if (obs_solicitud) {
      push_unique_obs_item(items, {
        etiqueta: "OSI",
        contenido: obs_solicitud,
      });
    }
  }

  const obs_emision = normalize_observacion_text(params.observacionesOsi);
  if (obs_emision) {
    push_unique_obs_item(items, {
      etiqueta: "OSI",
      contenido: obs_emision,
    });
  }

  return items;
}

export { extract_osi_solicitud_observacion_text };
