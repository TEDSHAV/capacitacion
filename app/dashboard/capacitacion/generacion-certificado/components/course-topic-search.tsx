'use client'

import { useState } from 'react'
import { CourseTopic } from '@/types'

interface CourseTopicSearchProps {
  courseTopics: CourseTopic[]
  selectedCourseTopic: CourseTopic | null
  onSelect: (courseTopic: CourseTopic) => void
  isAutoPopulated?: boolean
}

export default function CourseTopicSearch({ courseTopics, selectedCourseTopic, onSelect, isAutoPopulated = false }: CourseTopicSearchProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleSelect = (topic: CourseTopic) => {
    onSelect(topic)
    setIsOpen(false)
  }

  const handleClear = () => {
    onSelect({} as CourseTopic)
    setIsOpen(false)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Tema del Curso
      </h2>

      {/* Selected Course Topic Display */}
      {selectedCourseTopic && selectedCourseTopic.id && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="font-medium text-green-900">
                {selectedCourseTopic.name}
                {isAutoPopulated && (
                  <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    Auto-seleccionado
                  </span>
                )}
              </div>
              {selectedCourseTopic.description && (
                <div className="text-sm text-green-700 mt-1">
                  {selectedCourseTopic.description}
                </div>
              )}
            </div>
            <button
              onClick={handleClear}
              className="ml-2 text-green-600 hover:text-green-800"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Instructions when no course topic is selected */}
      {!selectedCourseTopic && (
        <div className="text-sm text-gray-500">
          El tema del curso se seleccionará automáticamente cuando elijas una OSI
        </div>
      )}
    </div>
  )
}
