"use client";

import { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { DASHBOARD_TOUR_KEY, dashboardSteps } from "./DashboardTour";

export function DashboardTourAutoStart() {
  useEffect(() => {
    const completed = localStorage.getItem(DASHBOARD_TOUR_KEY);
    if (!completed) {
      const timer = setTimeout(() => {
        const driverInstance = driver({
          steps: dashboardSteps,
          showProgress: true,
          allowClose: true,
          nextBtnText: "Siguiente",
          prevBtnText: "Anterior",
          doneBtnText: "¡Listo!",
          onDestroyed: () => {
            localStorage.setItem(DASHBOARD_TOUR_KEY, "completed");
          },
        });
        driverInstance.drive();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, []);

  return null;
}

