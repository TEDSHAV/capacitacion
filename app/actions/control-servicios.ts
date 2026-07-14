"use server";

import { createClient } from "@/utils/supabase/server";
import {
  ControlServiciosEjecutados,
  ControlServiciosFormData,
  OSIFullData,
} from "@/types";

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

  const record = {
    id_osi: formData.selectedOSI?.id_osi || null,
    mes_recepcion: formData.selectedOSI?.fecha_emision,
    numero_osi: formData.selectedOSI?.nro_osi,
    participante_x_osis: formData.selectedOSI?.participantes_ejecucion,
    fecha_osi: formData.selectedOSI?.fecha_inicio_real,
    cod_cliente: formData.selectedOSI?.codigo_cliente,
    nombre_curso: formData.selectedOSI?.servicio,
    fecha_ejecucion: formData.selectedOSI?.fecha_inicio_real,
    monto_x_traslado_mt: formData.selectedOSI?.costo_traslado,
    horas_honorarios_h: formData.selectedOSI?.horas_honorarios_instructor,
    costo_por_hora: formData.selectedOSI?.tarifa_hora_honorarios,
    gasto_impresion_i: formData.selectedOSI?.costo_impresion_material,
    ejecutada_mes_curso: formData.ejecutada_mes_curso || "",
    pendiente_mes_anterior: formData.pendiente_mes_anterior || null,
    participantes_asistidos: formData.participantes_asistidos || null,
    certificados_reales: formData.certificados_reales || null,
    pvc_reales: formData.pvc_reales || null,
    responsable: formData.responsable || null,
    dias_traslado_t: formData.dias_traslado_t || null,
    cod_facilitador: formData.cod_facilitador
      ? parseInt(formData.cod_facilitador)
      : null,
    facilitador: formData.facilitador || null,
    observaciones: formData.observaciones || null,
    indicador_facilitador: formData.indicador_facilitador || null,
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

  const record = {
    ejecutada_mes_curso: formData.ejecutada_mes_curso || "",
    pendiente_mes_anterior: formData.pendiente_mes_anterior || null,
    participantes_asistidos: formData.participantes_asistidos || null,
    certificados_reales: formData.certificados_reales || null,
    pvc_reales: formData.pvc_reales || null,
    responsable: formData.responsable || null,
    dias_traslado_t: formData.dias_traslado_t || null,
    cod_facilitador: formData.cod_facilitador
      ? parseInt(formData.cod_facilitador)
      : null,
    facilitador: formData.facilitador || null,
    observaciones: formData.observaciones || null,
    indicador_facilitador: formData.indicador_facilitador || null,
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

// Get facilitators for dropdown
export async function getFacilitatorsForDropdown() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("facilitadores")
    .select("id, nombre_apellido, cedula")
    .eq("is_active", true)
    .order("nombre_apellido");

  if (error) throw error;
  return data;
}
