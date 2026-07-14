import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import Sidebar from "@/components/Sidebar";
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Check authentication before rendering anything
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Static departments for now to avoid database issues
  const sortedDepartamentos = [
    { id: '1', nombre: 'negocios', color: 'blue' },
    { id: '2', nombre: 'capacitacion', color: 'purple' }
  ];

  return (
    <div className="flex h-screen">
      <Sidebar departamentos={sortedDepartamentos} />
      <div className="flex flex-col flex-1">
        <Navbar />
        <main className="flex-1 overflow-y-auto bg-gray-100">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}
