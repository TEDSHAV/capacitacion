import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import GestionOSIClient from "./GestionOSIClient";

export default async function GestionOSIPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`${process.env.NEXT_PUBLIC_SHELL_URL}/auth/login`);
  }

  return <GestionOSIClient user={user} />;
}
