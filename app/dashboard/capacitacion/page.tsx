import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";
import CapacitacionClient from "./CapacitacionClient";
import { CapacitacionStats } from "./CapacitacionStats";

async function StatsWrapper() {
  const stats = await CapacitacionStats({
    firstDayOfMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
  });
  return stats;
}

export default async function CapacitacionPage() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    redirect(`${process.env.NEXT_PUBLIC_SHELL_URL}/auth/login`);
  }

  return (
    <Suspense fallback={<CapacitacionClient user={claimsData.claims as any} />}>
      <CapacitacionClientWithStats user={claimsData.claims as any} />
    </Suspense>
  );
}

async function CapacitacionClientWithStats({ user }: { user: any }) {
  const stats = await StatsWrapper();
  return <CapacitacionClient user={user} stats={stats} />;
}
