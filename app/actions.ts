"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

// Helper function to format error messages
function formatSupabaseError(error: any): string {
  if (error?.message) {
    return error.message;
  }
  return "Error desconocido de la base de datos";
}

export async function handleLogin(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // Surface a clearer message for rate-limit errors so the user knows to wait
    const status = (error as any)?.status;
    const code = (error as any)?.code;
    const isRateLimit =
      status === 429 ||
      code === "over_request_rate_limit" ||
      /rate limit/i.test(error.message || "");
    const message = isRateLimit
      ? "Demasiadas solicitudes. Espera 5 minutos e intenta de nuevo."
      : formatSupabaseError(error);
    redirect("/login?error=" + encodeURIComponent(message));
  }

  redirect("/dashboard");
}

export async function checkDepartments() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("departamentos").select("*");

  if (error) {
    console.error("Error loading departments:", error);
    return [];
  }

  return data;
}
