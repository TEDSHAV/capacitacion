import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getIndicadoresFilterOptionsAction } from "@/app/actions/indicadores-certificados";
import IndicadoresClient from "./IndicadoresClient";

export default async function IndicadoresPage() {
  const supabase = await createClient();

  const [
    {
      data: { user },
    },
    filterOptions,
  ] = await Promise.all([
    supabase.auth.getUser(),
    getIndicadoresFilterOptionsAction(),
  ]);

  if (!user) {
    redirect(`${process.env.NEXT_PUBLIC_SHELL_URL}/auth/login`);
  }

  return <IndicadoresClient user={user} filterOptions={filterOptions} />;
}
