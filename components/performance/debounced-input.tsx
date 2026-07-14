'use client'

import { useState, useEffect, useCallback } from 'react'
import { DebouncedInputProps } from '@/types'

export default function DebouncedInput({
  value,
  onChange,
  placeholder = '',
  delay = 300,
  className = '',
  type = 'text'
}: DebouncedInputProps) {
  const [internalValue, setInternalValue] = useState(value)

  // Update internal value when prop changes
  useEffect(() => {
    setInternalValue(value)
  }, [value])

  // Debounced onChange
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (internalValue !== value) {
        onChange(internalValue)
      }
    }, delay)

    return () => clearTimeout(timeoutId)
  }, [internalValue, value, onChange, delay])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInternalValue(e.target.value)
  }, [])

  return (
    <input
      type={type}
      value={internalValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
    />
  )
}
