"use client";

import { useState, useEffect } from "react";
import { Facilitator } from "@/types";
import { FacilitatorForm } from "./facilitator-form";
import { FacilitatorList } from "./facilitator-list";

export const FacilitatorManagement = () => {
  const [facilitators, setFacilitators] = useState<Facilitator[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleFacilitatorSaved = () => {
    // Refresh the facilitator list
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Facilitator Form Section */}
      <FacilitatorForm onFacilitatorSaved={handleFacilitatorSaved} />
      
      {/* Facilitator List Section */}
      <FacilitatorList 
        refreshKey={refreshKey}
        onFacilitatorDeleted={handleFacilitatorSaved}
      />
    </div>
  );
};
