import { PWALayout } from "@/components/PWALayout";
import VersionBadge from "@/components/VersionBadge";
import { createClient } from "@/utils/supabase/server";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userName = user?.user_metadata?.name || user?.email || undefined;

  return (
    <PWALayout userName={userName}>
      {children}
      {/* The dashboard is embedded in the PRISMA shell and renders no chrome of
          its own, so the build version is surfaced here instead of in a footer. */}
      <VersionBadge />
    </PWALayout>
  );
}
