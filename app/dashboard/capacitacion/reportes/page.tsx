import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
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
    .select("id, nombre_estado")
    .order("nombre_estado");

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <ReportesClient user={user} states={states || []} />
    </div>
  );
}
