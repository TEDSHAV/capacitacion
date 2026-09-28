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
  const resolvedParams = await searchParams;
  const { editId, osi, osiId } = resolvedParams;

  const supabase = await createClient();
  const editIdNum =
    editId && typeof editId === "string" ? parseInt(editId) : null;
  const initialOsiParam =
    typeof osi === "string" ? osi : typeof osiId === "string" ? osiId : null;

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
      initialOsiParam={initialOsiParam}
    />
  );
}
