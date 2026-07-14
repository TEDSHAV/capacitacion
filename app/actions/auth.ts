"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function handleSignup(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  // Validate required fields
  if (!email || !password || !name) {
    return { error: "Todos los campos son requeridos" };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
        },
      },
    });

    if (error) {
      return { error: error.message };
    }

    return {
      success: "Cuenta creada exitosamente. Por favor verifica tu email.",
      redirect: "/login",
    };
  } catch (error) {
    return { error: "Error al crear la cuenta" };
  }
}

export async function handleLogout() {
  try {
    const supabase = await createClient();
    const headersList = await headers();
    const host = headersList.get("host") || "";
    const isLocalhost =
      host.includes("localhost") || host.includes("127.0.0.1");
    const isProduction = process.env.NODE_ENV === "production";

    await supabase.auth.signOut();
    revalidatePath("/dashboard");

    const loginUrl =
      isProduction && !isLocalhost && process.env.NEXT_PUBLIC_SHELL_URL
        ? `${process.env.NEXT_PUBLIC_SHELL_URL}/auth/login`
        : "/login";

    redirect(loginUrl);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    return { error: "Error al cerrar sesión" };
  }
}
