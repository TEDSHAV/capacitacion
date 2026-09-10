import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import PlantillasEmailClient from "./PlantillasEmailClient";

export default async function PlantillasEmailPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`${process.env.NEXT_PUBLIC_SHELL_URL}/auth/login`);
  }

  return <PlantillasEmailClient />;
}
