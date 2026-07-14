"use server";

import { createClient } from "@/utils/supabase/server";

// Create a new template record in the database
export async function createTemplateRecord(
  name: string,
  fileName: string,
  url: string,
  type: "certificate" | "carnet",
) {
  const supabase = await createClient();

  try {
    const tableName =
      type === "certificate" ? "plantillas_certificados" : "plantillas_carnets";

    // Check if this is the first template (auto-activate)
    const { count } = await supabase
      .from(tableName)
      .select("*", { count: "exact", head: true });

    const isFirstTemplate = count === 0;

    const { data, error } = await supabase
      .from(tableName)
      .insert({
        nombre: name.trim(),
        archivo: fileName,
        url_imagen: url,
        is_active: isFirstTemplate,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error creating template record:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: null,
    };
  }
}

// Set template as active (only one can be active at a time)
export async function setActiveTemplate(
  templateId: number,
  templateType: "certificate" | "carnet",
) {
  const supabase = await createClient();

  try {
    // First, deactivate all templates of this type
    const tableName =
      templateType === "certificate"
        ? "plantillas_certificados"
        : "plantillas_carnets";

    await supabase
      .from(tableName)
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("is_active", true);

    // Then activate the selected template
    const { error } = await supabase
      .from(tableName)
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq("id", templateId);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  } catch (error) {
    console.error("Error setting active template:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Get the active template for a type
export async function getActiveTemplate(
  templateType: "certificate" | "carnet",
) {
  const supabase = await createClient();

  try {
    const tableName =
      templateType === "certificate"
        ? "plantillas_certificados"
        : "plantillas_carnets";

    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .eq("is_active", true)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "not found" error
      throw new Error(error.message);
    }

    return { success: true, data: data || null };
  } catch (error) {
    console.error("Error getting active template:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: null,
    };
  }
}
