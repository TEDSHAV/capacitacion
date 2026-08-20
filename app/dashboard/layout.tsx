import { PWALayout } from "@/components/PWALayout";
import VersionBadge from "@/components/VersionBadge";
import { createClient } from "@/utils/supabase/server";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  // Use getSession() (cookie-only, no network) instead of getUser() to avoid
  // hitting the Supabase Auth API on every dashboard navigation.
  const { data: { session } } = await supabase.auth.getSession();
  const userName = session?.user?.user_metadata?.name || session?.user?.email || undefined;

  return (
    <PWALayout userName={userName}>
      {children}
      {/* The dashboard is embedded in the PRISMA shell and renders no chrome of
          its own, so the build version is surfaced here instead of in a footer. */}
      <VersionBadge />
    </PWALayout>
  );
}
