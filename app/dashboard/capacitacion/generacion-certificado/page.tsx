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
    {
      data: { user },
    },
    certificateData,
    editCertificateData,
  ] = await Promise.all([
    supabase.auth.getUser(),
    getOptimizedCertificateData(),
    editIdNum ? getCertificateForEdit(editIdNum) : Promise.resolve(null),
  ]);

  if (!user) {
    redirect(`${process.env.NEXT_PUBLIC_SHELL_URL}/auth/login`);
  }

  return (
    <GeneracionCertificadoClient
      user={user}
      initialData={certificateData}
      editData={editCertificateData}
    />
  );
}
