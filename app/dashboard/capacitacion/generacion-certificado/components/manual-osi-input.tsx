"use client";

import { useState } from "react";
import { ManualOSIInput as ManualOSIInputType, Empresa, City } from "@/types";

interface ManualOSIInputProps {
  companies: Empresa[];
  cities: City[];
  courseTopics: any[];
  data: ManualOSIInputType;
  onDataChange: (field: keyof ManualOSIInputType, value: any) => void;
  onCourseSelect: (courseTopic: any) => void;
  selectedCourseTopic: any;
  hasAttemptedSubmission: boolean;
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
}: ManualOSIInputProps) {
  const [useManualCompany, setUseManualCompany] = useState(false);

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
        <input
          type="text"
          id="osi_number"
          value={data.osi_number || ""}
          onChange={(e) => onDataChange("osi_number", e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            hasAttemptedSubmission && !data.osi_number
              ? "border-amber-400 bg-amber-50"
              : "border-gray-300"
          }`}
          placeholder="Ej: OSI-2024-001"
        />
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
