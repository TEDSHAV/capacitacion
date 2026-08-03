"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import {
  ControlServiciosEjecutados,
  ControlServiciosFormData,
  OSIFullData,
} from "@/types";
import { assignOSIToFacilitador } from "./osi-facilitador-assignments";

// Get all OSIs for the dropdown
export async function getAllOSIsForControlServicios() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_osi_formato_completo")
    .select("*")
    .order("id_osi", { ascending: false });

  if (error) {
    console.error("Error fetching OSIs:", error);
    return [];
  }
  return data;
}

// Get current logged in user details
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("usuarios")
    .select("*, departamentos!usuarios_departamento_fkey(nombre)")
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

  // Format additional items for observations
  const formattedAdditionalItems = formData.additional_items && formData.additional_items.length > 0
    ? "\n[ITEMS ADICIONALES]\n" + formData.additional_items.map(item => 
        `- ${item.cant} ${item.unidad || 'UND'} - ${item.descripcion} (Unit: $${item.costo_unitario}) Total: $${item.total.toFixed(2)}`
      ).join("\n")
    : "";

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

[CANTIDADES ITEMS FIJOS]
Traslado: ${formData.cant_traslado}
Impresión: ${formData.cant_impresion}
Honorarios: ${formData.cant_honorarios}
Informe Final: ${formData.cant_informe_final}

[TOTALES]
Honorarios Total: ${formData.honorarios_total}
Informe Final: ${formData.informe_final_total}
Banco: ${formData.banco}
Nro Cuenta: ${formData.nro_cuenta}
${formattedAdditionalItems}
-------------------
${formData.observaciones}
`.trim();

    const record = {
    id_osi: formData.selectedOSI?.id_osi || null,
    solicitante: formData.solicitante,
    gerencia_solicitante: formData.gerencia_solicitante,
    fecha_solicitud: formData.fecha_solicitud,
    tipo_solicitud: formData.tipo_solicitud || null,
    nro_correlativo: formData.nro_correlativo,
    tipo_servicio: formData.tipo_servicio || null,
    prioridad: formData.prioridad || null,
    corresponde_a: formData.corresponde_a,

    // Values
    costo_traslado: formData.costo_traslado,
    impresion_total: formData.impresion_total,
    honorarios_total: formData.honorarios_total,
    informe_final_total: formData.informe_final_total,
    dias_traslado: formData.dias_traslado,

    // Quantities
    cant_traslado: formData.cant_traslado,
    cant_impresion: formData.cant_impresion,
    cant_honorarios: formData.cant_honorarios,
    cant_informe_final: formData.cant_informe_final,

    // Facilitator
    cod_facilitador: formData.cod_facilitador ? parseInt(formData.cod_facilitador) : null,
    facilitador: formData.facilitador,
    banco: formData.banco,
    nro_cuenta: formData.nro_cuenta,

    // Dynamic Items
    additional_items: formData.additional_items,

    observaciones_compras: formData.observaciones,
    created_by: userResponse.data.user?.id || null,
    updated_by: userResponse.data.user?.id || null,
    
    // Schema fields
    item_solicitado: formData.selectedOSI?.servicio || null,
    cantidad: 1,
    id_estatus: 1, // Default status if needed
  };

  const { data, error } = await supabase
    .from("requisiciones")
    .insert(record)
    .select()
    .single();

  if (error) throw error;

  // Also write the facilitador↔OSI assignment to the assignments table
  if (formData.selectedOSI?.id_osi && formData.cod_facilitador) {
    await assignOSIToFacilitador(
      formData.selectedOSI.id_osi,
      parseInt(formData.cod_facilitador),
      "requisicion"
    );
  }

  revalidatePath("/dashboard/capacitacion/planificacion-servicios/lista");
  return data;
}

// Get all control records (list view) - Filtered by current user
export async function getAllControlServiciosRecords() {
  const supabase = await createClient();
  const userResponse = await supabase.auth.getUser();
  const userId = userResponse.data.user?.id;

  if (!userId) return [];
  
  // Try to fetch with relationships
  const { data, error } = await supabase
    .from("requisiciones")
    .select(`
      *,
      ejecucion_osi!left (
        id,
        nro_osi_secuencial
      ),
      facilitadores!left (
        nombre_apellido,
        cedula
      )
    `)
    .eq("created_by", userId)
    .order("id", { ascending: false });

  if (error) {
    console.error("Error fetching requisiciones (with joins):", JSON.stringify(error, null, 2));
    
    // Fallback: Try to fetch just the main table data if joins fail
    const { data: simpleData, error: simpleError } = await supabase
      .from("requisiciones")
      .select("*")
      .eq("created_by", userId)
      .order("id", { ascending: false });
      
    if (simpleError) {
      console.error("Error fetching requisiciones (simple):", JSON.stringify(simpleError, null, 2));
      return [];
    }
    return simpleData;
  }
  
  return data;
}

// Get single record for editing
export async function getControlServiciosRecord(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("requisiciones")
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

    // Format additional items for observations
    const formattedAdditionalItems = formData.additional_items && formData.additional_items.length > 0
      ? "\n[ITEMS ADICIONALES]\n" + formData.additional_items.map(item => 
          `- ${item.cant} ${item.unidad || 'UND'} - ${item.descripcion} (Unit: $${item.costo_unitario}) Total: $${item.total.toFixed(2)}`
        ).join("\n")
      : "";

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

[CANTIDADES ITEMS FIJOS]
Traslado: ${formData.cant_traslado}
Impresión: ${formData.cant_impresion}
Honorarios: ${formData.cant_honorarios}
Informe Final: ${formData.cant_informe_final}

[TOTALES]
Honorarios Total: ${formData.honorarios_total}
Informe Final: ${formData.informe_final_total}
Banco: ${formData.banco}
Nro Cuenta: ${formData.nro_cuenta}
${formattedAdditionalItems}
-------------------
${formData.observaciones}
`.trim();

    const record = {
      id_osi: formData.selectedOSI?.id_osi || null,
      solicitante: formData.solicitante,
      gerencia_solicitante: formData.gerencia_solicitante,
      fecha_solicitud: formData.fecha_solicitud,
      tipo_solicitud: formData.tipo_solicitud || null,
      nro_correlativo: formData.nro_correlativo,
      tipo_servicio: formData.tipo_servicio || null,
      prioridad: formData.prioridad || null,
      corresponde_a: formData.corresponde_a,

      // Values and Quantities
      dias_traslado: formData.dias_traslado,
      costo_traslado: formData.costo_traslado,
      impresion_total: formData.impresion_total,
      honorarios_total: formData.honorarios_total,
      informe_final_total: formData.informe_final_total,
      cant_traslado: formData.cant_traslado,
      cant_impresion: formData.cant_impresion,
      cant_honorarios: formData.cant_honorarios,
      cant_informe_final: formData.cant_informe_final,

      // Facilitator
      cod_facilitador: formData.cod_facilitador ? parseInt(formData.cod_facilitador) : null,
      facilitador: formData.facilitador,
      banco: formData.banco,
      nro_cuenta: formData.nro_cuenta,

      additional_items: formData.additional_items,
      observaciones_compras: formData.observaciones,
      updated_by: userResponse.data.user?.id || null,

      // Schema fields
      item_solicitado: formData.selectedOSI?.servicio || null,
    };

  const { data, error } = await supabase
    .from("requisiciones")
    .update(record)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  // Sync the facilitador↔OSI assignment to the assignments table
  if (formData.selectedOSI?.id_osi && formData.cod_facilitador) {
    await assignOSIToFacilitador(
      formData.selectedOSI.id_osi,
      parseInt(formData.cod_facilitador),
      "requisicion"
    );
  }

  revalidatePath("/dashboard/capacitacion/planificacion-servicios/lista");
  return data;
}

// Delete control record
export async function deleteControlServiciosRecord(id: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("requisiciones")
    .delete()
    .eq("id", id);

  if (error) throw error;
  revalidatePath("/dashboard/capacitacion/planificacion-servicios/lista");
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
