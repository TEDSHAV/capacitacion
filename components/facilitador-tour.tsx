"use client";

import { useEffect, useRef, useCallback } from "react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

interface FacilitadorTourProps {
  tourKey: string;
  steps: DriveStep[];
  autoStart?: boolean;
}

export function FacilitadorTour({ tourKey, steps, autoStart = true }: FacilitadorTourProps) {
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  const startTour = useCallback(() => {
    const driverInstance = driver({
      steps,
      showProgress: true,
      allowClose: true,
      nextBtnText: "Siguiente",
      prevBtnText: "Anterior",
      doneBtnText: "Entendido",
      onDestroyed: () => {
        localStorage.setItem(tourKey, "completed");
      },
    });
    driverRef.current = driverInstance;
    driverInstance.drive();
  }, [steps, tourKey]);

  useEffect(() => {
    if (!autoStart) return;
    const completed = localStorage.getItem(tourKey);
    if (!completed) {
      const timer = setTimeout(() => {
        startTour();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoStart, startTour, tourKey]);

  return null;
}

export function useTourReplay(tourKey: string, steps: DriveStep[]) {
  const replay = useCallback(() => {
    const driverInstance = driver({
      steps,
      showProgress: true,
      allowClose: true,
      nextBtnText: "Siguiente",
      prevBtnText: "Anterior",
      doneBtnText: "Entendido",
      onDestroyed: () => {
        localStorage.setItem(tourKey, "completed");
      },
    });
    driverInstance.drive();
  }, [steps, tourKey]);

  return replay;
}
