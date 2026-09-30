import { Metadata } from "next";
import { getAlertasCertificadosPendientes } from "@/app/actions/alertas-certificados";
import NotificacionesClient from "./NotificacionesClient";

export const metadata: Metadata = {
  title: "Centro de Notificaciones | PRISMA Capacitación",
  description: "Control centralizado de notificaciones y emisión de certificados pendientes (estándar 72 horas).",
};

export default async function NotificacionesPage() {
  const initialResumen = await getAlertasCertificadosPendientes();

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <NotificacionesClient initialResumen={initialResumen} />
    </div>
  );
}
