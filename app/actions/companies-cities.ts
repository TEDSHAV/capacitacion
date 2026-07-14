"use server";

import { createClient } from "@/utils/supabase/server";
import { Empresa } from "@/types";

export interface City {
  id: number;
  nombre_ciudad: string;
  id_estado: number;
}

export interface CompaniesCitiesResult {
  success: boolean;
  companies?: Empresa[];
  cities?: City[];
  error?: string;
}

/**
 * Fetch companies and cities for manual OSI input dropdowns
 */
export async function getCompaniesAndCities(): Promise<CompaniesCitiesResult> {
  try {
    const supabase = await createClient();

    // Fetch companies and cities in parallel (independent queries)
    const [
      { data: companies, error: companiesError },
      { data: cities, error: citiesError },
    ] = await Promise.all([
      supabase
        .from("empresas")
        .select("id, razon_social, rif, direccion_fiscal, codigo_cliente")
        .order("razon_social", { ascending: true }),
      supabase
        .from("cat_ciudades")
        .select("id, nombre_ciudad, id_estado")
        .order("nombre_ciudad", { ascending: true }),
    ]);

    if (companiesError) {
      console.error("Error fetching companies:", companiesError);
      return {
        success: false,
        error: `Error fetching companies: ${companiesError.message}`,
      };
    }

    if (citiesError) {
      console.error("Error fetching cities:", citiesError);
      return {
        success: false,
        error: `Error fetching cities: ${citiesError.message}`,
      };
    }

    return {
      success: true,
      companies: companies || [],
      cities: cities || [],
    };
  } catch (error) {
    console.error("Error in getCompaniesAndCities:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error fetching companies and cities",
    };
  }
}
