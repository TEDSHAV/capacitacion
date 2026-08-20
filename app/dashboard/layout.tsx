import VersionBadge from "@/components/VersionBadge";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { SyncBadge } from "@/components/SyncBadge";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-screen bg-gray-100 overflow-x-hidden">
      {children}
      {/* The dashboard is embedded in the PRISMA shell and renders no chrome of
          its own, so the build version is surfaced here instead of in a footer. */}
      <VersionBadge />
      <OfflineIndicator />
      <SyncBadge />
    </main>
  );
}
