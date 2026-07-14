"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function handleLogin(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect("/login?error=" + encodeURIComponent(error.message));
  }

  redirect("/dashboard");
}

export async function checkDepartments() {
  const supabase = await createClient();
  const {data,error} = await supabase.from("departamentos").select("*");

  if (error) {
    console.error(error);
    return [];
  }

  return data;
}
