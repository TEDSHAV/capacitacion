import { FacilitadorFormData, CourseTopic } from "@/types";
import { useState } from "react";

interface CourseTopicsSectionProps {
  formData: FacilitadorFormData;
  handleInputChange: (field: keyof FacilitadorFormData, value: any) => void;
  courseTopics: CourseTopic[];
  loadingCourseTopics: boolean;
}

export const CourseTopicsSection = ({ formData, handleInputChange, courseTopics, loadingCourseTopics }: CourseTopicsSectionProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  const handleTopicToggle = (topicId: string, topicName: string) => {
    const currentTopics = formData.temas_cursos || [];
    const isSelected = currentTopics.includes(topicName);
    
    let newTopics: string[];
    if (isSelected) {
      // Remove topic
      newTopics = currentTopics.filter(topic => topic !== topicName);
    } else {
      // Add topic
      newTopics = [...currentTopics, topicName];
    }
    
    handleInputChange("temas_cursos", newTopics);
  };

  const filteredTopics = courseTopics.filter(topic =>
    topic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (topic.description && topic.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <h3 className="text-md font-medium text-gray-900">Temas de Cursos</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Selecciona los temas que puede dictar el facilitador
        </label>
        
        <div className="mb-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar curso por nombre..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        {loadingCourseTopics ? (
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="space-y-2">
              <div className="h-8 bg-gray-200 rounded"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
            {filteredTopics.length === 0 ? (
              <p className="text-sm text-gray-500">
                {searchTerm ? "No se encontraron cursos que coincidan con la búsqueda" : "No hay temas de cursos disponibles"}
              </p>
            ) : (
              filteredTopics.map((topic) => (
                <label key={topic.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                  <input
                    type="checkbox"
                    checked={formData.temas_cursos?.includes(topic.name) || false}
                    onChange={() => handleTopicToggle(topic.id, topic.name)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">{topic.name}</span>
                  {topic.description && (
                    <span className="text-xs text-gray-500 ml-2">({topic.description})</span>
                  )}
                </label>
              ))
            )}
          </div>
        )}
        
        <p className="text-xs text-gray-500 mt-1">
          Selecciona todos los temas aplicables. El facilitador podrá dictar estos cursos.
        </p>
      </div>
    </div>
  );
};
