import { CertificateParticipant } from "@/types";

export interface CustomParticipant extends CertificateParticipant {
  nro_libro: number;
  nro_hoja: number;
  nro_linea: number;
  nro_control: number;
}
