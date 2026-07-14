import { getFacilitatorSession } from "@/app/actions/facilitador-portal";
import { redirect } from "next/navigation";

export default async function FacilitadorPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
