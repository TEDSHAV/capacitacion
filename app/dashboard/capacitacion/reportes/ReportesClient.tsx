"use client";

import { useState } from "react";
import { ReportesClientProps, State } from "@/types";
import { Button } from "@/components/ui/button";
import FacilitadorStateStats from "./components/FacilitadorStateStats";
import FacilitadorHoursStats from "./components/FacilitadorHoursStats";
import CourseStats from "./components/CourseStats";

export default function ReportesClient({ user, states, courses }: ReportesClientProps) {
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"states" | "hours" | "courses">("courses");

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Reportes de Capacitación
        </h1>
        <p className="mt-2 text-gray-600">
          Estadísticas y análisis de facilitadores
        </p>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex flex-wrap gap-4">
        <Button
          variant={activeTab === "courses" ? "default" : "outline"}
          onClick={() => setActiveTab("courses")}
          className="min-w-[200px]"
        >
          Cursos
        </Button>
        <Button
          variant={activeTab === "states" ? "default" : "outline"}
          onClick={() => setActiveTab("states")}
          className="min-w-[200px]"
        >
          Facilitadores por Estado
        </Button>
        <Button
          variant={activeTab === "hours" ? "default" : "outline"}
          onClick={() => setActiveTab("hours")}
          className="min-w-[200px]"
        >
          Horas de Capacitación
        </Button>
      </div>

      {/* State Filter (for both tabs) */}
      <div className="mb-6">
        <label
          htmlFor="state-filter"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Filtrar por Estado:
        </label>
        <select
          id="state-filter"
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          className="block w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value="">Todos los estados</option>
          {states.map((state) => (
            <option key={state.id} value={state.id.toString()}>
              {state.nombre_estado}
            </option>
          ))}
        </select>
      </div>

      {/* Course Filter (for both tabs) */}
      <div className="mb-6">
        <label
          htmlFor="course-filter"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Filtrar por Curso:
        </label>
        <select
          id="course-filter"
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="block w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value="">Todos los cursos</option>
          {courses?.map((course) => (
            <option key={course.id} value={course.id}>
              {course.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === "courses" && (
          <CourseStats selectedState={selectedState} selectedCourse={selectedCourse} />
        )}
        {activeTab === "states" && (
          <FacilitadorStateStats selectedState={selectedState} selectedCourse={selectedCourse} />
        )}
        {activeTab === "hours" && (
          <FacilitadorHoursStats selectedState={selectedState} selectedCourse={selectedCourse} />
        )}
      </div>
    </div>
  );
}
