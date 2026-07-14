"use server";

import { createClient } from "@/utils/supabase/server";
import { cache } from "react";

// Get signatures for dropdown
const getSignaturesForDropdown = cache(async () => {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("firmas")
      .select("id, nombre, tipo, url_imagen, is_active")
      .eq("is_active", true)
      .order("nombre");

    if (error) {
      return { error: error.message, data: [] };
    }

    return { data: data || [], error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Unknown error",
      data: [],
    };
  }
});

// Get certificate templates (all templates, active first)
const getCertificateTemplates = cache(async () => {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("plantillas_certificados")
      .select("*")
      .order("is_active", { ascending: false })
      .order("nombre");

    if (error) {
      return { error: error.message, data: [] };
    }

    return { data: data || [], error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Unknown error",
      data: [],
    };
  }
});

// Get carnet templates (all templates, active first)
const getCarnetTemplates = cache(async () => {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("plantillas_carnets")
      .select("*")
      .order("is_active", { ascending: false })
      .order("nombre");

    if (error) {
      return { error: error.message, data: [] };
    }

    return { data: data || [], error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Unknown error",
      data: [],
    };
  }
});

// Get Venezuelan states
const getVenezuelanStates = cache(async () => {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("cat_estados_venezuela")
      .select("id, nombre_estado")
      .order("nombre_estado");

    if (error) {
      return { error: error.message, data: [] };
    }

    return { data: data || [], error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Unknown error",
      data: [],
    };
  }
});

// Get course topics
const getCourseTopics = cache(async () => {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("temas_cursos")
      .select("*")
      .order("nombre");

    if (error) {
      return { error: error.message, data: [] };
    }

    return { data: data || [], error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Unknown error",
      data: [],
    };
  }
});

// Get certificate templates filtered by course
const getCertificateTemplatesByCourse = cache(async (courseId?: string) => {
  const supabase = await createClient();

  try {
    // For now, get all active templates
    // In the future, this can be enhanced to filter by course when the relationship is established
    let query = supabase
      .from("plantillas_certificados")
      .select("*")
      .eq("is_active", true)
      .order("nombre");

    // If courseId is provided, we could add filtering logic here
    // For now, we'll return all templates and let the frontend handle the filtering
    // based on course-specific preferences or business logic

    const { data, error } = await query;

    if (error) {
      return { error: error.message, data: [] };
    }

    return { data: data || [], error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Unknown error",
      data: [],
    };
  }
});

// Get course templates (plantillas_cursos) filtered by course and company
const getCourseTemplatesByOSI = cache(
  async (courseId?: string, empresaId?: string) => {
    const supabase = await createClient();

    try {
      if (!courseId && !empresaId) {
        // If no course or company selected, return empty list (not all templates)
        return { data: [], error: null };
      }

      // Fetch all active templates and filter in JS to avoid complex PostgREST query issues
      // and ensure we don't miss any data due to syntax edge cases
      let query = supabase
        .from("plantillas_cursos")
        .select(
          `
        *,
        empresas (
          id,
          razon_social
        )
      `,
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error("❌ Error fetching templates:", error);
        return { error: error.message, data: [] };
      }

      // Filter in JS for exact matches
      const filteredData = (data || []).filter((t) => {
        const tCourseId = t.id_curso ? String(t.id_curso) : null;
        const tEmpresaId = t.id_empresa ? String(t.id_empresa) : null;
        const targetCourseId = courseId ? String(courseId) : null;
        const targetEmpresaId = empresaId ? String(empresaId) : null;

        // Logic:
        // 1. If it's a course-specific template, it must match our course
        if (tCourseId && tCourseId !== targetCourseId) return false;

        // 2. If it's a company-specific template, it must match our company
        if (tEmpresaId && tEmpresaId !== targetEmpresaId) return false;

        // 3. If it's global (both null), it's always included
        // 4. If it's course-only, it matches if the course IDs match (handled by rule 1)
        // 5. If it's company-only, it matches if the company IDs match (handled by rule 2)

        return true;
      });

      return { data: filteredData, error: null };
    } catch (err) {
      console.error("💥 Unexpected error in getCourseTemplatesByOSI:", err);
      return {
        error: err instanceof Error ? err.message : "Unknown error",
        data: [],
      };
    }
  },
);

// Export server actions
export async function getSignaturesForDropdownAction() {
  return await getSignaturesForDropdown();
}

export async function getCertificateTemplatesAction() {
  return await getCertificateTemplates();
}

export async function getCarnetTemplatesAction() {
  return await getCarnetTemplates();
}

export async function getActiveTemplateAction(
  templateType: "certificate" | "carnet",
) {
  const { getActiveTemplate } = await import("./template-actions");
  return await getActiveTemplate(templateType);
}

export async function getCertificateTemplatesByCourseAction(courseId?: string) {
  return await getCertificateTemplatesByCourse(courseId);
}

export async function getCourseTemplatesByOSIAction(
  courseId?: string,
  empresaId?: string,
) {
  return await getCourseTemplatesByOSI(courseId, empresaId);
}

export async function getVenezuelanStatesAction() {
  return await getVenezuelanStates();
}

export async function getCourseTopicsAction() {
  return await getCourseTopics();
}

// Get technical services from catalogo_servicios where id_departamento_ejecutante = 4
const getTechnicalServices = cache(async () => {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("catalogo_servicios")
      .select("*")
      .eq("id_departamento_ejecutante", 4)
      .order("nombre");

    if (error) {
      return { error: error.message, data: [] };
    }

    return { data: data || [], error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Unknown error",
      data: [],
    };
  }
});

export async function getTechnicalServicesAction() {
  return await getTechnicalServices();
}
