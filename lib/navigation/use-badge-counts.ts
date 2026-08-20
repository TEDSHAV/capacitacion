"use client";

import { useState, useEffect } from "react";
import type { NavigationContext } from "./navigation-config";

export interface BadgeCounts {
  [key: string]: number;
}

/**
 * Hook to fetch real-time badge counts for navigation items
 * Updates automatically when data changes
 */
export function useBadgeCounts(context: NavigationContext): BadgeCounts {
  const [counts, setCounts] = useState<BadgeCounts>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        setLoading(true);

        // For now, return empty counts
        // In a real implementation, these would fetch from server actions
        // Example:
        // const pendingOSIs = await getOSIsForManagement({ status: 'pending' });
        // const pendingCerts = await getCertificatesForManagement({ status: 'pending' });

        const newCounts: BadgeCounts = {};

        switch (context) {
          case "portal-facilitador":
            // TODO: Fetch pending OSIs count
            // newCounts.osis = pendingOSIs.length;
            break;

          case "portal-cliente":
            // TODO: Fetch pending surveys count
            // newCounts.surveys = pendingSurveys.length;
            break;

          case "dashboard":
            // TODO: Fetch pending items count
            // newCounts["gestion-osis"] = pendingOSIs.length;
            // newCounts.management = pendingCerts.length;
            break;
        }

        setCounts(newCounts);
      } catch (error) {
        console.error("Error fetching badge counts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();

    // Optionally set up polling for real-time updates
    // const interval = setInterval(fetchCounts, 30000); // every 30 seconds
    // return () => clearInterval(interval);
  }, [context]);

  return counts;
}
