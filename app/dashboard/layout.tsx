export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-screen bg-gray-100 overflow-x-hidden">
      {children}
    </main>
  );
}
