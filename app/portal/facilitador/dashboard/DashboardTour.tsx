"use client";

import { useCallback } from "react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { HelpCircle } from "lucide-react";

const TOUR_KEY = "facilitador-dashboard-tour-v2";

const dashboardSteps: DriveStep[] = [
  {
    element: "#tour-welcome",
    popover: {
      title: "Bienvenido a tu Portal de Facilitador",
      description: "Tu espacio centralizado para gestionar servicios asignados, descargar material didáctico y consultar tu perfil profesional.",
    },
  },
  {
    element: "#tour-kpi-filters",
    popover: {
      title: "Resumen y Filtros Rápidos",
      description: "Revisa el total de servicios, pendientes por cargar y finalizados. Haz clic en cualquier tarjeta para filtrar la lista instantáneamente.",
    },
  },
  {
    element: "#tour-nav-tabs",
    popover: {
      title: "Vistas del Portal",
      description: "Alterna entre 'Mis Servicios' para trabajar en tus cursos activos y 'Mi Perfil' para revisar tu ficha técnica, temas acreditados y firma digital.",
    },
  },
  {
    element: "#tour-osi-cards",
    popover: {
      title: "Servicios Asignados",
      description: "Visualiza tus cursos asignados con la empresa, fecha de ejecución, sesiones programadas y disponibilidad de material didáctico.",
    },
  },
  {
    element: "#tour-osi-card",
    popover: {
      title: "Ejecución del Servicio",
      description: "Haz clic en cualquier servicio para descargar la presentación oficial (.pptx), cargar listas de participantes y completar las calificaciones.",
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
