"use server";

import { createClient } from "@/utils/supabase/server";
import { ControlSequenceConfig, ControlSequenceFormData } from "@/types";

/**
 * Get the active control sequence configuration
 */
export async function getActiveControlSequence(): Promise<{
  success: boolean;
  data?: ControlSequenceConfig;
  message?: string;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("control_sequences")
      .select("*")
      .eq("is_active", true)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows found
      console.error("Error fetching active control sequence:", error);
      return {
        success: false,
        message: "Error fetching control sequence configuration",
      };
    }

    if (!data) {
      return {
        success: true,
        data: undefined,
        message: "No active control sequence configuration found",
      };
    }

    return {
      success: true,
      data: data as ControlSequenceConfig,
    };
  } catch (error) {
    console.error("Unexpected error fetching control sequence:", error);
    return {
      success: false,
      message: "Unexpected error fetching control sequence",
    };
  }
}

/**
 * Get all control sequence configurations (history)
 */
export async function getAllControlSequences(): Promise<{
  success: boolean;
  data?: ControlSequenceConfig[];
  message?: string;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("control_sequences")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching control sequences:", error);
      return {
        success: false,
        message: "Error fetching control sequences",
      };
    }

    return {
      success: true,
      data: data as ControlSequenceConfig[],
    };
  } catch (error) {
    console.error("Unexpected error fetching control sequences:", error);
    return {
      success: false,
      message: "Unexpected error fetching control sequences",
    };
  }
}

/**
 * Check if any certificates have been generated
 */
export async function hasCertificatesBeenGenerated(): Promise<{
  success: boolean;
  hasData: boolean;
  message?: string;
}> {
  try {
    const supabase = await createClient();

    const { count, error } = await supabase
      .from("certificados")
      .select("id", { count: "exact", head: true });

    if (error) {
      console.error("Error checking certificates:", error);
      return {
        success: false,
        hasData: false,
        message: "Error checking if certificates exist",
      };
    }

    return {
      success: true,
      hasData: (count || 0) > 0,
    };
  } catch (error) {
    console.error("Unexpected error checking certificates:", error);
    return {
      success: false,
      hasData: false,
      message: "Unexpected error checking certificates",
    };
  }
}

/**
 * Create a new control sequence configuration
 * Only allowed if no certificates have been generated yet
 */
export async function createControlSequence(
  formData: ControlSequenceFormData,
  userId?: string,
): Promise<{
  success: boolean;
  data?: ControlSequenceConfig;
  message?: string;
}> {
  try {
    // Check if certificates already exist
    const certCheck = await hasCertificatesBeenGenerated();
    if (!certCheck.success) {
      return {
        success: false,
        message: certCheck.message || "Error checking existing certificates",
      };
    }

    if (certCheck.hasData) {
      return {
        success: false,
        message:
          "Cannot set control sequence after certificates have been generated. The sequence is now determined by the last certificate.",
      };
    }

    // Validate input
    if (
      !Number.isInteger(formData.nro_libro) ||
      formData.nro_libro < 1 ||
      !Number.isInteger(formData.nro_hoja) ||
      formData.nro_hoja < 1 ||
      formData.nro_hoja > 100 ||
      !Number.isInteger(formData.nro_linea) ||
      formData.nro_linea < 1 ||
      formData.nro_linea > 10 ||
      !Number.isInteger(formData.nro_control) ||
      formData.nro_control < 1
    ) {
      return {
        success: false,
        message:
          "Invalid control sequence values. Libro must be >= 1, Hoja 1-100, Linea 1-10, Nro. Ctrl >= 1",
      };
    }

    const supabase = await createClient();

    // Get current user for audit trail
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Deactivate any existing active sequences
    await supabase
      .from("control_sequences")
      .update({ is_active: false })
      .eq("is_active", true);

    // Create new sequence
    const { data, error } = await supabase
      .from("control_sequences")
      .insert({
        nro_libro: formData.nro_libro,
        nro_hoja: formData.nro_hoja,
        nro_linea: formData.nro_linea,
        nro_control: formData.nro_control,
        is_active: true,
        created_by: user?.id || userId,
        notes: formData.notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating control sequence:", error);
      return {
        success: false,
        message: "Error creating control sequence",
      };
    }

    return {
      success: true,
      data: data as ControlSequenceConfig,
      message: "Control sequence configured successfully",
    };
  } catch (error) {
    console.error("Unexpected error creating control sequence:", error);
    return {
      success: false,
      message: "Unexpected error creating control sequence",
    };
  }
}

/**
 * Deactivate the current control sequence (read-only after certificates exist)
 */
export async function deactivateControlSequence(): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("control_sequences")
      .update({ is_active: false })
      .eq("is_active", true);

    if (error) {
      console.error("Error deactivating control sequence:", error);
      return {
        success: false,
        message: "Error deactivating control sequence",
      };
    }

    return {
      success: true,
      message: "Control sequence deactivated successfully",
    };
  } catch (error) {
    console.error("Unexpected error deactivating control sequence:", error);
    return {
      success: false,
      message: "Unexpected error deactivating control sequence",
    };
  }
}
