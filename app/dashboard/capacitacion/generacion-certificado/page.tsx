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

  const supabase = await createClient();
  const editIdNum =
    editId && typeof editId === "string" ? parseInt(editId) : null;

  const [
    { data: claimsData },
    certificateData,
    editCertificateData,
  ] = await Promise.all([
    supabase.auth.getClaims(),
    getOptimizedCertificateData(),
    editIdNum ? getCertificateForEdit(editIdNum) : Promise.resolve(null),
  ]);

  if (!claimsData?.claims) {
    redirect(`${process.env.NEXT_PUBLIC_SHELL_URL}/auth/login`);
  }

  return (
    <GeneracionCertificadoClient
      user={claimsData.claims as any}
      initialData={certificateData}
      editData={editCertificateData}
    />
  );
}
