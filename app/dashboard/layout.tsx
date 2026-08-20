import { PWALayout } from "@/components/PWALayout";
import VersionBadge from "@/components/VersionBadge";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <PWALayout>
      {children}
      {/* The dashboard is embedded in the PRISMA shell and renders no chrome of
          its own, so the build version is surfaced here instead of in a footer. */}
      <VersionBadge />
    </PWALayout>
  );
}
