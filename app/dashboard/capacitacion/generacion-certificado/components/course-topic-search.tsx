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
  // This component is now just a placeholder for auto-populated course topic data
  // The course topic information is displayed in the main certificate form
  return null
}
