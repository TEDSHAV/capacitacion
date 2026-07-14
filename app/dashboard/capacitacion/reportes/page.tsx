import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { State } from "@/types";
import ReportesClient from "./ReportesClient";

export default async function ReportesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch states for filter dropdown
  const { data: states } = await supabase
    .from("cat_estados_venezuela")
    .select("id, nombre_estado, capital_estado")
    .order("nombre_estado");

  // Transform the data to match State interface
  const typedStates: State[] = (states || []).map(state => ({
    id: Number(state.id),
    nombre_estado: state.nombre_estado,
    capital_estado: state.capital_estado
  }));

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <ReportesClient user={user} states={typedStates} />
    </div>
  );
}
