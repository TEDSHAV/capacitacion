"use client";

import { useState, useEffect } from "react";
import { Signature, SignatureType } from "@/types";
import { SignatureUpload } from "./signature-upload";
import { SignatureList } from "./signature-list";

export const SignatureManagement = () => {
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSignatureUploaded = () => {
    // Refresh the signature list
    setRefreshKey(prev => prev + 1);
  };

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
