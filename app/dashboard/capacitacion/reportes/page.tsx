import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { State } from "@/types";
import ReportesClient from "./ReportesClient";

export default async function ReportesPage() {
  const supabase = await createClient();

  const [
    {
      data: { user },
    },
    { data: states },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("cat_estados_venezuela")
      .select("id, nombre_estado, capital_estado")
      .order("nombre_estado"),
  ]);

  if (!user) {
    redirect(`${process.env.NEXT_PUBLIC_SHELL_URL}/auth/login`);
  }

  const typedStates: State[] = (states || []).map((s) => ({
    id: Number(s.id),
    nombre_estado: s.nombre_estado,
    capital_estado: s.capital_estado,
  }));

  return <ReportesClient user={user} states={typedStates} />;
}
