"use client";

import React from "react";
import { CertificateData, CertificateTemplateProps } from "@/types/dashboard";

const CertificateTemplate: React.FC<CertificateTemplateProps> = ({
  data,
  svgBackgroundPath = "/templates/certificado.svg",
}) => {
  return (
    <div className="relative w-full" style={{ aspectRatio: "279.4/215.9" }}>
      {/* SVG Background */}
      <img
        src={svgBackgroundPath}
        alt="Certificate Background"
        className="absolute inset-0 w-full h-full object-contain"
      />

      {/* Text Overlays */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
        {/* Recipient Name */}
        <div className="absolute top-[35%] text-center">
          <h2 className="text-4xl font-bold text-blue-600 mt-2">
            {data.recipientName.toUpperCase()}
          </h2>
        </div>

        {/* Date and Signature */}
        <div className="absolute bottom-[20%] flex justify-between w-full max-w-4xl px-16">
          {/* Date */}
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">Date of Completion</p>
            <p className="text-lg font-semibold text-gray-800">
              {data.completionDate}
            </p>
          </div>

          {/* Signature */}
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">Instructor</p>
            <p className="text-lg font-semibold text-gray-800">
              {data.instructorName}
            </p>
          </div>
        </div>

        {/* Certificate ID */}
        <div className="absolute bottom-[5%] text-center">
          <p className="text-sm text-gray-500">
            Certificate ID: {data.certificateId}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CertificateTemplate;
