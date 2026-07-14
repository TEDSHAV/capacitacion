"use server";

import { createClient } from "@/utils/supabase/server";
import { CarnetGeneration } from "@/types";

export async function saveCustomCarnetsToDatabase(
  carnetData: CarnetGeneration[],
  certificateIds: number[],
): Promise<{ success: boolean; message: string; carnetIds?: number[] }> {
  try {
    const supabase = await createClient();

    if (carnetData.length !== certificateIds.length) {
      return {
        success: false,
        message: "Number of carnets must match number of certificates",
      };
    }

    const carnetIds: number[] = [];

    const preparedCarnets = carnetData.map((carnet, i) => {
      const certificateId = certificateIds[i];
      const nombre_participante_upper = carnet.nombre_participante.toUpperCase();

      const snapshotContent = JSON.stringify({
        ...carnet,
        nombre_participante: nombre_participante_upper,
        generated_at: new Date().toISOString(),
        id_plantilla_carnet: carnet.id_plantilla_carnet || null,
      });

      return {
        id_certificado: certificateId,
        id_participante: carnet.id_participante,
        id_empresa: carnet.id_empresa,
        id_curso: carnet.id_curso,
        id_osi: carnet.id_osi,
        titulo_curso: carnet.titulo_curso,
        subtitulo_curso: carnet.subtitulo_curso,
        fecha_emision: carnet.fecha_emision,
        fecha_vencimiento: carnet.fecha_vencimiento,
        nombre_participante: nombre_participante_upper,
        cedula_participante: carnet.cedula_participante,
        empresa_participante: carnet.empresa_participante,
        snapshot_contenido: snapshotContent,
        is_active: true,
      };
    });

    const { data, error } = await supabase
      .from("carnets")
      .insert(preparedCarnets)
      .select("id");

    if (error) {
      console.error("Database error bulk inserting custom carnets:", error);
      return {
        success: false,
        message: `Error saving carnets: ${error.message}`,
      };
    }

    if (data) {
      const ids = data.map((row) => row.id);
      return {
        success: true,
        message: `Successfully saved ${ids.length} carnets`,
        carnetIds: ids,
      };
    }

    return {
      success: true,
      message: `Successfully saved ${preparedCarnets.length} carnets`,
      carnetIds: [],
    };
  } catch (error) {
    console.error("Critical error in saveCustomCarnetsToDatabase:", error);
    return {
      success: false,
      message: "Unexpected error saving carnets to database",
    };
  }
}
