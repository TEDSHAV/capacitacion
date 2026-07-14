"use server";

import { createClient } from "@/utils/supabase/server";
import { maskName } from "@/utils/string-utils";

export interface PublicVerificationResult {
  id: number;
  courseName: string;
  participantName: string;
  issueDate: string;
  expiryDate: string | null;
  status: "valid" | "expired";
  type: "certificate" | "carnet";
  controlNumber?: number;
}

/**
 * Search for active certificates and carnets by participant national ID
 */
export async function searchByParticipantId(idNumber: string): Promise<{
  success: boolean;
  data?: PublicVerificationResult[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const cleanId = idNumber.trim();
    const today = new Date().toISOString().split("T")[0];

    // 1. Get participant to find their certificates
    const { data: participant, error: pError } = await supabase
      .from("participantes_certificados")
      .select("id, nombre")
      .eq("cedula", cleanId)
      .eq("is_active", true)
      .maybeSingle();

    if (pError) throw pError;
    if (!participant) {
      return { success: true, data: [] };
    }

    // 2. Fetch certificates
    const { data: certificates, error: cError } = await supabase
      .from("certificados")
      .select(`
        id,
        fecha_emision,
        fecha_vencimiento,
        nro_control,
        catalogo_servicios (
          nombre
        )
      `)
      .eq("id_participante", participant.id)
      .eq("is_active", true)
      .order("fecha_emision", { ascending: false });

    if (cError) throw cError;

    // 3. Fetch carnets
    const { data: carnets, error: carnetError } = await supabase
      .from("carnets")
      .select(`
        id,
        id_certificado,
        titulo_curso,
        fecha_emision,
        fecha_vencimiento,
        is_active
      `)
      .eq("id_participante", participant.id)
      .eq("is_active", true)
      .order("fecha_emision", { ascending: false });

    if (carnetError) throw carnetError;

    const results: PublicVerificationResult[] = [];
    const maskedName = maskName(participant.nombre);

    // Process certificates
    certificates?.forEach((cert: any) => {
      const isExpired = cert.fecha_vencimiento && cert.fecha_vencimiento < today;
      if (!isExpired) {
        results.push({
          id: cert.id,
          courseName: cert.catalogo_servicios?.nombre || "Curso Desconocido",
          participantName: maskedName,
          issueDate: cert.fecha_emision,
          expiryDate: cert.fecha_vencimiento,
          status: "valid",
          type: "certificate",
          controlNumber: cert.nro_control
        });
      }
    });

    // Process carnets (only those not already linked to an active certificate result, or if they are separate)
    carnets?.forEach((carnet: any) => {
      const isExpired = carnet.fecha_vencimiento && carnet.fecha_vencimiento < today;
      if (!isExpired) {
        results.push({
          id: carnet.id,
          courseName: carnet.titulo_curso,
          participantName: maskedName,
          issueDate: carnet.fecha_emision,
          expiryDate: carnet.fecha_vencimiento,
          status: "valid",
          type: "carnet"
        });
      }
    });

    return {
      success: true,
      data: results
    };
  } catch (error) {
    console.error("Error in searchByParticipantId:", error);
    return {
      success: false,
      error: "Error al buscar certificados. Por favor intente de nuevo."
    };
  }
}

/**
 * Search for active certificates by company RIF
 */
export async function searchByCompanyRif(rif: string): Promise<{
  success: boolean;
  data?: PublicVerificationResult[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const cleanRif = rif.trim().toUpperCase();
    const today = new Date().toISOString().split("T")[0];

    // 1. Get company
    const { data: company, error: compError } = await supabase
      .from("empresas")
      .select("id")
      .eq("rif", cleanRif)
      .maybeSingle();

    if (compError) throw compError;
    if (!company) {
      return { success: true, data: [] };
    }

    // 2. Fetch certificates for this company
    const { data: certificates, error: cError } = await supabase
      .from("certificados")
      .select(`
        id,
        fecha_emision,
        fecha_vencimiento,
        nro_control,
        catalogo_servicios (
          nombre
        ),
        participantes_certificados (
          nombre
        )
      `)
      .eq("id_empresa", company.id)
      .eq("is_active", true)
      .order("fecha_emision", { ascending: false });

    if (cError) throw cError;

    const results: PublicVerificationResult[] = [];

    certificates?.forEach((cert: any) => {
      const isExpired = cert.fecha_vencimiento && cert.fecha_vencimiento < today;
      if (!isExpired) {
        results.push({
          id: cert.id,
          courseName: cert.catalogo_servicios?.nombre || "Curso Desconocido",
          participantName: maskName(cert.participantes_certificados?.nombre || "Participante"),
          issueDate: cert.fecha_emision,
          expiryDate: cert.fecha_vencimiento,
          status: "valid",
          type: "certificate",
          controlNumber: cert.nro_control
        });
      }
    });

    return {
      success: true,
      data: results
    };
  } catch (error) {
    console.error("Error in searchByCompanyRif:", error);
    return {
      success: false,
      error: "Error al buscar certificados de la empresa. Por favor intente de nuevo."
    };
  }
}
