"use client";

import { useState, useEffect } from "react";
import { Signature, SignatureType, Facilitador } from "@/types";
import { SignatureUpload } from "./signature-upload";
import { SignatureListOptimized } from "./signature-list-optimized";
import { getSignaturesAction } from "@/app/actions/signatures-crud";
import { getFacilitatorsAction } from "@/app/actions/facilitators-crud";

export const SignatureManagement = () => {
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [facilitadores, setFacilitadores] = useState<Facilitador[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load signatures and facilitadores on component mount and when refreshKey changes
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [signaturesResult, facilitadoresResult] = await Promise.all([
          getSignaturesAction(),
          getFacilitatorsAction(),
        ]);
        if (signaturesResult.data) {
          setSignatures(signaturesResult.data);
        }
        if (facilitadoresResult.data) {
          setFacilitadores(facilitadoresResult.data);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [refreshKey]);

  const handleSignatureUploaded = () => {
    // Refresh the signature list
    setRefreshKey((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-2 text-gray-600">Cargando firmas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Signature Upload Section */}
      <SignatureUpload onSignatureUploaded={handleSignatureUploaded} />

      {/* Signature List Section */}
      <SignatureListOptimized
        signatures={signatures}
        facilitadores={facilitadores}
        onSignatureDeleted={handleSignatureUploaded}
        refreshKey={refreshKey}
      />
    </div>
  );
};
