import ShellRedirectBridge from "../ShellRedirectBridge";

export default async function DisenoServicioWizardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const shellUrl = process.env.NEXT_PUBLIC_SHELL_URL || "";
  const target = `${shellUrl}/nuevo-servicio/${id}`;

  return (
    <ShellRedirectBridge
      targetPath={target}
      title={`Diseño de Servicio #${id}`}
      subtitle="El formulario interactivo y la generación de Ficha Técnica oficial (FT-CO-XXX) se encuentran disponibles en la plataforma central de PRISMA."
    />
  );
}
