"use server";

import { createClient } from "@/utils/supabase/server";
import {
  ControlServiciosEjecutados,
  ControlServiciosFormData,
  OSIFullData,
} from "@/types";

// Get current logged in user details
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("usuarios")
    .select("*, departamentos(nombre)")
    .eq("id_auth", user.id)
    .single();

  if (error) {
    console.error("Error fetching user details:", error);
    return null;
  }

  return data;
}

// Get OSI data for auto-population
export async function getOSIForControlServicios(osiId: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_osi_formato_completo")
    .select("*")
    .eq("id_osi", osiId)
    .single();

  if (error) throw error;
  return data;
}

// Create control record
export async function createControlServiciosRecord(
  formData: ControlServiciosFormData,
) {
  const supabase = await createClient();
  const userResponse = await supabase.auth.getUser();

  // Combine extra fields into observations if not in DB
  const combinedObservations = `
[REQUISICION DATA]
Corresponde a: ${formData.corresponde_a}
Fecha Solicitud: ${formData.fecha_solicitud}
Tipo Solicitud: ${formData.tipo_solicitud}
Nro Correlativo: ${formData.nro_correlativo}
Tipo Servicio: ${formData.tipo_servicio}
Gerencia: ${formData.gerencia_solicitante}
Prioridad: ${formData.prioridad}
Honorarios Total: ${formData.honorarios_total}
Informe Final: ${formData.informe_final_total}
Banco: ${formData.banco}
Nro Cuenta: ${formData.nro_cuenta}
-------------------
${formData.observaciones}
`.trim();

  const record = {
    id_osi: formData.selectedOSI?.id_osi || null,
    responsable: formData.solicitante,

    // OSI Data
    numero_osi: formData.selectedOSI?.nro_osi,
    nombre_curso: formData.selectedOSI?.servicio,
    fecha_osi: formData.selectedOSI?.fecha_inicio_real,
    monto_x_traslado_mt: formData.costo_traslado,
    horas_honorarios_h: formData.honorarios_horas,
    costo_por_hora: formData.honorarios_costo_hora,
    gasto_impresion_i: formData.impresion_total,

    // Details table data
    dias_traslado_t: formData.dias_traslado,

    // Facilitator
    cod_facilitador: formData.cod_facilitador
      ? parseInt(formData.cod_facilitador)
      : null,
    facilitador: formData.facilitador,

    observaciones: combinedObservations,
    created_by: userResponse.data.user?.id,
  };

  const { data, error } = await supabase
    .from("control_servicios_ejecutados")
    .insert(record)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Get all control records (list view)
export async function getAllControlServiciosRecords() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("control_servicios_ejecutados")
    .select(
      `
      *,
      ejecucion_osi (
        nro_osi_secuencial
      ),
      facilitadores (
        nombre_apellido,
        cedula
      )
    `,
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

// Get single record for editing
export async function getControlServiciosRecord(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("control_servicios_ejecutados")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

// Update control record
export async function updateControlServiciosRecord(
  id: number,
  formData: ControlServiciosFormData,
) {
  const supabase = await createClient();
  const userResponse = await supabase.auth.getUser();

    // Combine extra fields into observations if not in DB
    const combinedObservations = `
[REQUISICION DATA]
Corresponde a: ${formData.corresponde_a}
Fecha Solicitud: ${formData.fecha_solicitud}
Tipo Solicitud: ${formData.tipo_solicitud}
Nro Correlativo: ${formData.nro_correlativo}
Tipo Servicio: ${formData.tipo_servicio}
Gerencia: ${formData.gerencia_solicitante}
Prioridad: ${formData.prioridad}
Honorarios Total: ${formData.honorarios_total}
Informe Final: ${formData.informe_final_total}
Banco: ${formData.banco}
Nro Cuenta: ${formData.nro_cuenta}
-------------------
${formData.observaciones}
`.trim();

    const record = {
      responsable: formData.solicitante,

      // Details table data
      dias_traslado_t: formData.dias_traslado,
      monto_x_traslado_mt: formData.costo_traslado,
      gasto_impresion_i: formData.impresion_total,
      horas_honorarios_h: formData.honorarios_horas,
      costo_por_hora: formData.honorarios_costo_hora,

      // Facilitator
      cod_facilitador: formData.cod_facilitador
        ? parseInt(formData.cod_facilitador)
        : null,
      facilitador: formData.facilitador,

      observaciones: combinedObservations,
      updated_by: userResponse.data.user?.id,
      updated_at: new Date().toISOString(),
    };

  const { data, error } = await supabase
    .from("control_servicios_ejecutados")
    .update(record)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Delete control record
export async function deleteControlServiciosRecord(id: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("control_servicios_ejecutados")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// Get facilitators for dropdown with banking details
export async function getFacilitatorsForDropdown() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("facilitadores")
    .select(`
      id, 
      nombre_apellido, 
      cedula, 
      rif,
      datos_bancarios (
        banco,
        nro_cuenta,
        tipo_cuenta,
        es_principal
      )
    `)
    .eq("is_active", true)
    .order("nombre_apellido");

  if (error) throw error;
  return data;
}
