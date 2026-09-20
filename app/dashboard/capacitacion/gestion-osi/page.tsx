import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getOSIsForGestionOSI, getOSIFilterOptions } from "@/app/actions/osi";
import GestionOSIClient from "./GestionOSIClient";

export const dynamic = "force-dynamic";

export default async function GestionOSIPage() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    redirect(`${process.env.NEXT_PUBLIC_SHELL_URL}/auth/login`);
  }

  // Pre-fetch initial page 1 data and filter options in parallel on the server
  const [initialData, initialFilterOptions] = await Promise.all([
    getOSIsForGestionOSI({}, 1, 20),
    getOSIFilterOptions(),
  ]);

  return (
    <GestionOSIClient
      user={claimsData.claims as any}
      initialOsis={initialData.osis}
      initialTotalCount={initialData.totalCount}
      initialFilterOptions={initialFilterOptions}
    />
  );
}
