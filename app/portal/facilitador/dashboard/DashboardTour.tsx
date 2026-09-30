"use client";

import { useCallback } from "react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { HelpCircle } from "lucide-react";

const TOUR_KEY = "facilitador-dashboard-tour-v3";

const dashboardSteps: DriveStep[] = [
  {
    element: "#tour-welcome",
    popover: {
      title: "Bienvenido a tu Portal de Facilitador",
      description: "Tu espacio centralizado para gestionar tus servicios asignados, registrar participantes, subir evidencias y gestionar tu facturación.",
    },
  },
  {
    element: "#tour-kpi-filters",
    popover: {
      title: "Resumen y Filtros Rápidos",
      description: "Revisa el total de servicios pendientes por cargar y finalizados. Haz clic en cualquier tarjeta para filtrar la lista instantáneamente.",
    },
  },
  {
    element: "#tour-nav-tabs",
    popover: {
      title: "Vistas del Portal",
      description: "Navega entre 'Mis Servicios' para trabajar en cursos asignados, 'Órdenes y Facturación' para consultar órdenes de compra y adjuntar facturas, y 'Mi Perfil' para ver tu ficha técnica.",
    },
  },
  {
    element: "#tour-tab-facturacion",
    popover: {
      title: "Órdenes de Compra y Facturación",
      description: "Una vez concluido el servicio y validados los soportes por Administración, aquí podrás consultar las Órdenes de Compra emitidas y adjuntar tu factura fiscal con sus datos de control.",
    },
  },
  {
    element: "#tour-osi-cards",
    popover: {
      title: "Servicios Asignados",
      description: "Visualiza tus cursos asignados con los datos de la empresa cliente, fecha de ejecución y sesiones programadas.",
    },
  },
  {
    element: "#tour-osi-card",
    popover: {
      title: "Ejecución del Servicio",
      description: "Haz clic en cualquier servicio para registrar la lista de asistencia firmada, notas de participantes y fotos de la sesión. Si el curso cuenta con material oficial cargado, podrás descargarlo aquí.",
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
