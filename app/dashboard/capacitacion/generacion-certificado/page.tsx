import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import GeneracionCertificadoClient from "./GeneracionCertificadoClient";
import { getOptimizedCertificateData } from "@/app/actions/certificate-optimized";
import { getCertificateForEdit } from "@/app/actions/certificados";

export default async function GeneracionCertificadoPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { editId } = await searchParams;

  // Check authentication - following your existing pattern
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`${process.env.NEXT_PUBLIC_SHELL_URL}/auth/login`);
  }

  // Use existing optimized server action with caching
  const certificateData = await getOptimizedCertificateData();

  // If in edit mode, fetch the specific certificate data
  let editCertificateData = null;
  if (editId && typeof editId === "string") {
    editCertificateData = await getCertificateForEdit(parseInt(editId));
  }

  return (
    <GeneracionCertificadoClient
      user={user}
      initialData={certificateData}
      editData={editCertificateData}
    />
  );
}
