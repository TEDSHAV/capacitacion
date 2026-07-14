"use client";

import { useCallback } from "react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";

const TOUR_KEY = "facilitador-dashboard-tour";

const dashboardSteps: DriveStep[] = [
  {
    element: "#tour-welcome",
    popover: {
      title: "Bienvenido al Portal de Facilitadores",
      description: "Aquí puedes gestionar tus servicios asignados. Veamos cómo funciona.",
    },
  },
  {
    element: "#tour-osi-cards",
    popover: {
      title: "Servicios Asignados",
      description: "Estas son tus OSIs asignadas. Cada tarjeta muestra el número de OSI, la empresa y detalles del servicio.",
    },
  },
  {
    element: () => {
      const mobile = document.querySelector("#tour-status-badge-mobile");
      const desktop = document.querySelector("#tour-status-badge");
      if (mobile && window.getComputedStyle(mobile).display !== "none") return mobile as Element;
      return (desktop || mobile) as Element;
    },
    popover: {
      title: "Estado del Listado",
      description: "El estado indica si los documentos están pendientes de enviar (amarillo) o ya fueron enviados (verde).",
    },
  },
  {
    element: "#tour-osi-card",
    popover: {
      title: "Abrir OSI",
      description: "Toca una tarjeta para cargar la lista de asistencia, escanear participantes y completar las calificaciones.",
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
      doneBtnText: "Entendido",
      onDestroyed: () => {
        localStorage.setItem(TOUR_KEY, "completed");
      },
    });
    driverInstance.drive();
  }, []);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={startTour}
      className="text-blue-600 border-blue-200 hover:bg-blue-50"
    >
      <HelpCircle className="w-4 h-4 mr-2" />
      <span className="hidden sm:inline">Tour</span>
    </Button>
  );
}

export { TOUR_KEY as DASHBOARD_TOUR_KEY, dashboardSteps };
