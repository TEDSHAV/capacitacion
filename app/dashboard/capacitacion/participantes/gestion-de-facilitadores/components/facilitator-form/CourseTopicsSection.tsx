"use client";

import React from "react";
import { CourseTopicsSectionProps } from "@/types";

export const CourseTopicsSection = ({ formData, handleInputChange, courseTopics, loadingCourseTopics }: CourseTopicsSectionProps) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Temas de Curso que puede dictar *
      </label>
      {loadingCourseTopics ? (
        <div className="animate-pulse">
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
            {courseTopics.map((topic) => (
              <label key={topic.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                <input
                  type="checkbox"
                  checked={formData.temas_cursos.includes(topic.nombre)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleInputChange("temas_cursos", [...formData.temas_cursos, topic.nombre]);
                    } else {
                      handleInputChange("temas_cursos", formData.temas_cursos.filter((t: string) => t !== topic.nombre));
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{topic.nombre}</span>
              </label>
            ))}
          </div>
          {formData.temas_cursos.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {formData.temas_cursos.map((topic: string, index: number) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                >
                  {topic}
                  <button
                    type="button"
                    onClick={() => handleInputChange("temas_cursos", formData.temas_cursos.filter((t: string) => t !== topic))}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
