"use client";

import { useState, useEffect } from "react";
import { Signature, SignatureType } from "@/types";
import { SignatureUpload } from "./signature-upload";
import { SignatureList } from "./signature-list";
import { getSignaturesAction } from "@/app/actions/signatures-crud";

export const SignatureManagement = () => {
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load signatures on component mount
  useEffect(() => {
    const loadSignatures = async () => {
      try {
        setLoading(true);
        const result = await getSignaturesAction();
        if (result.data) {
          setSignatures(result.data);
        }
      } catch (error) {
        console.error("Error loading signatures:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSignatures();
  }, []);

  const handleSignatureUploaded = () => {
    // Refresh the signature list
    setRefreshKey(prev => prev + 1);
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
      <SignatureList 
        signatures={signatures} 
        onSignatureDeleted={handleSignatureUploaded}
        refreshKey={refreshKey}
      />
    </div>
  );
};
