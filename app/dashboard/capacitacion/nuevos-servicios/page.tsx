import ShellRedirectBridge from "./ShellRedirectBridge";

export const metadata = {
  title: "Nuevos Servicios | Capacitación",
};

export default function NuevosServiciosPage() {
  const shellUrl = process.env.NEXT_PUBLIC_SHELL_URL || "";
  const target = `${shellUrl}/nuevo-servicio?dept=cap`;

  return <ShellRedirectBridge targetPath={target} />;
}
