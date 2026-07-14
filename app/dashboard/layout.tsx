import Breadcrumb from "@/components/Breadcrumb";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-screen bg-gray-100">
      <Breadcrumb />
      {children}
    </main>
  );
}
