import { toTitleCase } from "@/utils/string-utils";
import { CertificateFacilitator } from "@/app/actions/facilitators";

/**
 * Normalize a raw facilitadores database row (with nested firmas object)
 * into the CertificateFacilitator shape expected by the PDF renderer.
 * Used when facilitator data comes from getFacilitatorByOSI (portal)
 * instead of getFacilitatorData (which already transforms).
 */
export function normalizeFacilitatorData(raw: any): CertificateFacilitator {
  if (!raw) return raw;

  // Already normalized (has signature_data, no raw firmas)
  if (raw.signature_data && !raw.firmas) return raw as CertificateFacilitator;

  // Extract firmas (can be array or object)
  let facilitatorFirma: any = null;
  if (raw.firmas) {
    if (Array.isArray(raw.firmas)) {
      if (raw.firmas.length > 0) facilitatorFirma = raw.firmas[0];
    } else {
      facilitatorFirma = raw.firmas;
    }
  }

  return {
    id: raw.id,
    name: toTitleCase(raw.nombre_apellido || ""),
    nombre_apellido: toTitleCase(raw.nombre_apellido || ""),
    facilitator: toTitleCase(raw.nombre_apellido || ""),
    cargo: "Facilitador",
    firma: facilitatorFirma?.url_imagen || raw.firma,
    firma_id: raw.firma_id,
    sha_signature_id: raw.sha_signature_id,
    signature_data: facilitatorFirma
      ? {
          id: facilitatorFirma.id,
          representante_sha: facilitatorFirma.nombre,
          firma: facilitatorFirma.url_imagen,
          url_imagen: facilitatorFirma.url_imagen,
          imagen_base64: facilitatorFirma.imagen_base64,
        }
      : raw.signature_data,
  };
}
