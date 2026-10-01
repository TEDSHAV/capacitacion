"use client";

import { useCallback } from "react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { HelpCircle } from "lucide-react";

const TOUR_KEY = "facilitador-dashboard-tour-v4";

const dashboardSteps: DriveStep[] = [
  {
    element: "#tour-welcome",
    popover: {
      title: "Bienvenido a tu Portal de Facilitador",
      description:
        "Tu plataforma operativa centralizada para gestionar cursos asignados, registrar asistencia y participantes, subir evidencias fotográficas y cargar tus facturas fiscales.",
    },
  },
  {
    element: "#tour-compliance-banner",
    popover: {
      title: "Normativas y Cumplimiento Legal",
      description:
        "Aquí puedes consultar el estado de tus documentos legales y de auditoría (Ficha Técnica, Declaración de Salud, etc.) requeridos para el cumplimiento de normativas ISO y LOPCYMAT.",
    },
  },
  {
    element: "#tour-nav-tabs",
    popover: {
      title: "Vistas del Portal",
      description:
        "Navega fácilmente entre:\n• Mis Servicios: Tus capacitaciones asignadas para ejecución.\n• Órdenes y Facturación: Consulta de OCs y carga de facturas fiscales.\n• Mi Perfil: Estadísticas de carrera y datos personales.",
    },
  },
  {
    element: "#tour-kpi-filters",
    popover: {
      title: "Resumen y Filtros Rápidos",
      description:
        "Revisa cuántos servicios tienes pendientes por cargar soporte y cuántos han sido finalizados. Haz clic en cualquiera de las tarjetas para alternar la vista al instante.",
    },
  },
  {
    element: "#tour-search-bar",
    popover: {
      title: "Búsqueda Inmediata",
      description:
        "Localiza rápidamente cualquier capacitación escribiendo el número de OSI (#), nombre de la empresa cliente o título del curso.",
    },
  },
  {
    element: "#tour-osi-cards",
    popover: {
      title: "Tus Servicios Asignados",
      description:
        "Cada tarjeta contiene la información esencial del servicio: cliente, curso, ciudad, fecha y número de sesiones programadas.",
    },
  },
  {
    element: "#tour-osi-card",
    popover: {
      title: "Ejecución y Cierre del Servicio",
      description:
        "Haz clic en cualquier servicio para abrir el asistente paso a paso. Allí podrás descargar el material didáctico oficial, subir la lista de asistencia física, extraer participantes con OCR, registrar calificaciones (0 a 20) y adjuntar fotos de la sesión.",
    },
  },
  {
    element: "#tour-tab-facturacion",
    popover: {
      title: "Fase 2: Órdenes de Compra y Facturación",
      description:
        "¡Recuerda! La factura NO se carga dentro del servicio. Una vez que remites el servicio y Administración valida los soportes, se emite tu Orden de Compra (OC). En esta pestaña podrás consultar tu OC y adjuntar tu factura fiscal en PDF con su número y número de control.",
    },
  },
];

export function DashboardTour() {
  const startTour = useCallback(() => {
    const driverInstance = driver({
      steps: dashboardSteps,
      showProgress: true,
      allowClose: true,
      nextBtnText: "Siguiente",
      prevBtnText: "Anterior",
      doneBtnText: "¡Listo!",
      onDestroyed: () => {
        localStorage.setItem(TOUR_KEY, "completed");
      },
    });
    driverInstance.drive();
  }, []);

  return (
    <button
      type="button"
      onClick={startTour}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition-colors"
      title="Iniciar tour guiado"
    >
      <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
      <span className="hidden sm:inline">Guía Rápida</span>
    </button>
  );
}

export { TOUR_KEY as DASHBOARD_TOUR_KEY, dashboardSteps };
