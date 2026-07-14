"use client";

import { useState, useEffect } from "react";
import { ManualOSIInput as ManualOSIInputType, Empresa, City } from "@/types";
import {
  checkOSIHasAnyCertificatesAction,
  checkOSIHasCertificatesForCourseAction,
} from "@/app/actions/certificados";

interface ManualOSIInputProps {
  companies: Empresa[];
  cities: City[];
  courseTopics: any[];
  data: ManualOSIInputType;
  onDataChange: (field: keyof ManualOSIInputType, value: any) => void;
  onCourseSelect: (courseTopic: any) => void;
  selectedCourseTopic: any;
  hasAttemptedSubmission: boolean;
  onHasAnyCertificatesChange?: (hasCertificates: boolean) => void;
  onHasCourseCertificatesChange?: (hasCertificates: boolean) => void;
}

export function ManualOSIInput({
  companies,
  cities,
  courseTopics,
  data,
  onDataChange,
  onCourseSelect,
  selectedCourseTopic,
  hasAttemptedSubmission,
  onHasAnyCertificatesChange,
  onHasCourseCertificatesChange,
}: ManualOSIInputProps) {
  const [useManualCompany, setUseManualCompany] = useState(false);
  const [hasAnyCertificates, setHasAnyCertificates] = useState(false);
  const [hasCourseCertificates, setHasCourseCertificates] = useState(false);
  const [certificateCount, setCertificateCount] = useState(0);
  const [isCheckingCertificates, setIsCheckingCertificates] = useState(false);

  // Debounced effect to check certificates when OSI number is typed
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (data.osi_number && data.osi_number.trim()) {
        setIsCheckingCertificates(true);
        try {
          const result = await checkOSIHasAnyCertificatesAction(
            data.osi_number,
          );
          setHasAnyCertificates(result.has_certificates);
          setCertificateCount(result.count);
          onHasAnyCertificatesChange?.(result.has_certificates);
        } catch (error) {
          console.error("Error checking certificates:", error);
        } finally {
          setIsCheckingCertificates(false);
        }
      } else {
        setHasAnyCertificates(false);
        setCertificateCount(0);
        onHasAnyCertificatesChange?.(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [data.osi_number, onHasAnyCertificatesChange]);

  // Effect to check course-specific certificates when course is selected
  useEffect(() => {
    const checkCourseCertificates = async () => {
      if (data.osi_number && selectedCourseTopic?.id) {
        try {
          const result = await checkOSIHasCertificatesForCourseAction(
            data.osi_number,
            parseInt(selectedCourseTopic.id),
          );
          setHasCourseCertificates(result.has_certificates);
          onHasCourseCertificatesChange?.(result.has_certificates);
        } catch (error) {
          console.error("Error checking course certificates:", error);
        }
      } else {
        setHasCourseCertificates(false);
        onHasCourseCertificatesChange?.(false);
      }
    };
    checkCourseCertificates();
  }, [data.osi_number, selectedCourseTopic?.id, onHasCourseCertificatesChange]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">
        Ingreso Manual de Datos OSI
      </h2>

      {/* OSI Number */}
      <div>
        <label
          htmlFor="osi_number"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Número OSI *
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            id="osi_number"
            value={data.osi_number || ""}
            onChange={(e) => onDataChange("osi_number", e.target.value)}
            className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              hasAttemptedSubmission && !data.osi_number
                ? "border-amber-400 bg-amber-50"
                : "border-gray-300"
            }`}
            placeholder="Ej: OSI-2024-001"
          />
          {isCheckingCertificates && (
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          )}
          {hasAnyCertificates && !isCheckingCertificates && (
            <span className="px-2 py-1 text-xs font-bold bg-green-100 text-green-800 rounded-full border border-green-200 whitespace-nowrap">
              Generado ({certificateCount})
            </span>
          )}
        </div>
        {hasAttemptedSubmission && !data.osi_number && (
          <p className="text-xs text-amber-700 font-medium mt-1">
            El número OSI es requerido
          </p>
        )}
      </div>

      {/* Company Selection */}
      <div>
        <label
          htmlFor="company"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Empresa *
        </label>
        {!useManualCompany ? (
          <>
            <select
              id="company"
              value={data.company_id || ""}
              onChange={(e) => {
                if (e.target.value === "manual") {
                  setUseManualCompany(true);
                  onDataChange("company_id", undefined);
                } else {
                  const companyId = e.target.value;
                  onDataChange("company_id", companyId);
                  // Handle both string and numeric IDs for comparison
                  const company = companies.find(
                    (c) => c.id.toString() === companyId.toString(),
                  );
                  const companyName = company?.razon_social || "";
                  console.log(
                    "ManualOSIInput - Selected company:",
                    companyId,
                    "companyName:",
                    companyName,
                    "full company:",
                    company,
                    "total companies:",
                    companies.length,
                  );
                  if (!company) {
                    console.warn(
                      "Company not found in companies array. Selected ID type:",
                      typeof companyId,
                      "Selected ID value:",
                      JSON.stringify(companyId),
                    );
                  }
                  onDataChange("company_name", companyName);
                }
              }}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                hasAttemptedSubmission && !data.company_id && !data.company_name
                  ? "border-amber-400 bg-amber-50"
                  : "border-gray-300"
              }`}
            >
              <option value="">Seleccionar empresa...</option>
              <option value="manual">Otro / Ingresar manualmente</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.razon_social}
                  {company.rif && ` (${company.rif})`}
                </option>
              ))}
            </select>
            {hasAttemptedSubmission &&
              !data.company_id &&
              !data.company_name && (
                <p className="text-xs text-amber-700 font-medium mt-1">
                  La empresa es requerida
                </p>
              )}
          </>
        ) : (
          <>
            <input
              type="text"
              id="company_manual"
              value={data.company_name || ""}
              onChange={(e) => onDataChange("company_name", e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                hasAttemptedSubmission && !data.company_name
                  ? "border-amber-400 bg-amber-50"
                  : "border-gray-300"
              }`}
              placeholder="Nombre de la empresa"
            />
            <button
              type="button"
              onClick={() => {
                setUseManualCompany(false);
                onDataChange("company_name", undefined);
              }}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              ← Seleccionar de la lista
            </button>
            {hasAttemptedSubmission && !data.company_name && (
              <p className="text-xs text-amber-700 font-medium mt-1">
                El nombre de la empresa es requerido
              </p>
            )}
          </>
        )}
      </div>

      {/* Course Selection */}
      <div>
        <label
          htmlFor="course_topic"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Curso *
        </label>
        <select
          id="course_topic"
          value={selectedCourseTopic?.id || ""}
          onChange={(e) => {
            const courseId = e.target.value;
            const course = courseTopics.find((c) => c.id === courseId);
            if (course) {
              onCourseSelect(course);
            }
          }}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            hasAttemptedSubmission && !selectedCourseTopic
              ? "border-amber-400 bg-amber-50"
              : "border-gray-300"
          }`}
        >
          <option value="">Seleccionar curso...</option>
          {courseTopics.map((course) => (
            <option key={course.id} value={course.id}>
              {course.nombre}
              {course.horas_estimadas && ` (${course.horas_estimadas} horas)`}
            </option>
          ))}
        </select>
        {hasAttemptedSubmission && !selectedCourseTopic && (
          <p className="text-xs text-amber-700 font-medium mt-1">
            El curso es requerido
          </p>
        )}
      </div>

      {/* City Selection */}
      <div>
        <label
          htmlFor="city"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Ciudad *
        </label>
        <select
          required
          id="city"
          value={data.city_id || ""}
          onChange={(e) => {
            const cityId = e.target.value ? Number(e.target.value) : undefined;
            onDataChange("city_id", cityId);
          }}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            hasAttemptedSubmission && !data.city_id
              ? "border-amber-400 bg-amber-50"
              : "border-gray-300"
          }`}
        >
          <option value="">Seleccionar ciudad...</option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.nombre_ciudad}
            </option>
          ))}
        </select>
        {hasAttemptedSubmission && !data.city_id && (
          <p className="text-xs text-amber-700 font-medium mt-1">
            La ciudad es requerida
          </p>
        )}
      </div>
    </div>
  );
}
