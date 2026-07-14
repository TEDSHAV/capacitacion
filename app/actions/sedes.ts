"use server";

import { createClient } from "@/utils/supabase/server";

export interface Sede {
  id: number;
  nombre_sede: string;
  id_empresa: number;
  id_estado: number | null;
  esta_activo: boolean;
}

export interface SedeWithEmpresa extends Sede {
  empresa_razon_social: string;
}

export async function getSedesByEmpresaAction(
  empresaId: number,
): Promise<{ data?: Sede[]; error?: string }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("empresa_sedes")
      .select("id, nombre_sede, id_empresa, id_estado, esta_activo")
      .eq("id_empresa", empresaId)
      .eq("esta_activo", true)
      .order("nombre_sede", { ascending: true });

    if (error) {
      console.error("Error fetching sedes by empresa:", error);
      return { error: error.message };
    }

    return { data: (data as Sede[]) || [] };
  } catch (error) {
    console.error("Error in getSedesByEmpresaAction:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unknown error fetching sedes",
    };
  }
}

export async function getAllSedesAction(): Promise<{
  data?: SedeWithEmpresa[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("empresa_sedes")
      .select(
        "id, nombre_sede, id_empresa, id_estado, esta_activo, empresas!inner(razon_social)",
      )
      .eq("esta_activo", true)
      .order("nombre_sede", { ascending: true });

    if (error) {
      console.error("Error fetching all sedes:", error);
      return { error: error.message };
    }

    const sedes: SedeWithEmpresa[] = (data || []).map((row: any) => ({
      id: row.id,
      nombre_sede: row.nombre_sede,
      id_empresa: row.id_empresa,
      id_estado: row.id_estado,
      esta_activo: row.esta_activo,
      empresa_razon_social: row.empresas?.razon_social || "",
    }));

    return { data: sedes };
  } catch (error) {
    console.error("Error in getAllSedesAction:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unknown error fetching sedes",
    };
  }
}
