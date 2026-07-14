import React, { useState, useEffect } from 'react'

interface DateTimePickerProps {
  sessionNum: number
  currentDateTime: Date | null
  isEditing: boolean
  isNew: boolean
  updateFormData: (field: string, value: any) => void
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({
  sessionNum,
  currentDateTime,
  isEditing,
  isNew,
  updateFormData
}) => {
  // Local state for period selection
  const [localPeriod, setLocalPeriod] = useState<"AM" | "PM">("AM")
  
  // Extract current values for display
  const selectedDate = currentDateTime ? currentDateTime.toISOString().split("T")[0] : ""
  const selectedHour = currentDateTime ? (currentDateTime.getHours() % 12 || 12).toString().padStart(2, "0") : "12"
  const selectedMinute = currentDateTime ? currentDateTime.getMinutes().toString().padStart(2, "0") : "00"
  
  // Update local period when currentDateTime changes
  useEffect(() => {
    if (currentDateTime) {
      setLocalPeriod(currentDateTime.getHours() >= 12 ? "PM" : "AM")
    }
  }, [currentDateTime])
  
  const handleDateTimeChange = (date: string, hour: string, minute: string, period: "AM" | "PM") => {
    if (date) {
      let hours24 = parseInt(hour)
      if (period === "PM" && hours24 !== 12) {
        hours24 += 12
      } else if (period === "AM" && hours24 === 12) {
        hours24 = 0
      }
      
      const newDateTime = new Date(date)
      newDateTime.setHours(hours24, parseInt(minute), 0, 0)
      
      // Update local period state for immediate UI feedback
      setLocalPeriod(period)
      
      // Store in format compatible with Supabase
      updateFormData(`fecha_ejecucion${sessionNum}`, newDateTime)
    }
  }
  
  const handlePeriodClick = (period: "AM" | "PM") => {
    const dateToUse = selectedDate || new Date().toISOString().split("T")[0]
    handleDateTimeChange(dateToUse, selectedHour, selectedMinute, period)
  }
  
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Fecha y Hora Ejecución {sessionNum}
      </label>

      {/* Combined DateTime Picker */}
      <div className="border border-gray-300 rounded-lg p-3 space-y-3">
        {/* Date Input */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              handleDateTimeChange(e.target.value, selectedHour, selectedMinute, localPeriod)
            }}
            disabled={!isEditing && !isNew}
            tabIndex={!isEditing && !isNew ? -1 : 0}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        {/* Time Input */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Hora</label>
          <div className="flex items-center space-x-2">
            {/* Hour Dropdown */}
            <select
              value={selectedHour}
              onChange={(e) => {
                handleDateTimeChange(selectedDate, e.target.value, selectedMinute, localPeriod)
              }}
              disabled={!isEditing && !isNew}
              tabIndex={!isEditing && !isNew ? -1 : 0}
              className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                <option key={hour} value={hour.toString().padStart(2, "0")}>
                  {hour.toString().padStart(2, "0")}
                </option>
              ))}
            </select>

            <span className="text-gray-500">:</span>

            {/* Minute Dropdown */}
            <select
              value={selectedMinute}
              onChange={(e) => {
                handleDateTimeChange(selectedDate, selectedHour, e.target.value, localPeriod)
              }}
              disabled={!isEditing && !isNew}
              tabIndex={!isEditing && !isNew ? -1 : 0}
              className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                <option key={minute} value={minute.toString().padStart(2, "0")}>
                  {minute.toString().padStart(2, "0")}
                </option>
              ))}
            </select>

            {/* AM/PM Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <div
                onClick={() => (isEditing || isNew) && handlePeriodClick("AM")}
                className={`flex-1 px-2 py-1 text-xs font-medium rounded text-center cursor-pointer transition-colors ${
                  localPeriod === "AM" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-700"
                } ${(!isEditing && !isNew) ? "opacity-50 cursor-not-allowed" : "hover:bg-opacity-80"}`}
              >
                AM
              </div>
              <div
                onClick={() => (isEditing || isNew) && handlePeriodClick("PM")}
                className={`flex-1 px-2 py-1 text-xs font-medium rounded text-center cursor-pointer transition-colors ${
                  localPeriod === "PM" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-700"
                } ${(!isEditing && !isNew) ? "opacity-50 cursor-not-allowed" : "hover:bg-opacity-80"}`}
              >
                PM
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Display selected datetime */}
      {currentDateTime && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          {currentDateTime.toLocaleString("es-ES", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </div>
      )}
    </div>
  )
}

export default DateTimePicker
