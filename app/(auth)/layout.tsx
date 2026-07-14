import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 mt-16">{children}</main>
      <Footer />
    </div>
  );
}
