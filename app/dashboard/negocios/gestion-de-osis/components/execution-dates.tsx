import { useState } from 'react'
import DateTimePicker from './datetime-picker'

interface ExecutionDatesProps {
  formData: any;
  isEditing: boolean;
  isNew: boolean;
  updateFormData: (field: string, value: any) => void;
}

const ExecutionDates = ({
  formData,
  isEditing,
  isNew,
  updateFormData,
}: ExecutionDatesProps) => {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900 border-b pb-1">
        Fechas de Ejecución
      </h2>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número de Sesiones
            </label>
            <input
              type="number"
              min="1"
              max="5"
              value={formData.nro_sesiones || 1}
              onChange={(e) =>
                updateFormData("nro_sesiones", parseInt(e.target.value) || 1)
              }
              disabled={!isEditing && !isNew}
              tabIndex={!isEditing && !isNew ? -1 : 0}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: formData.nro_sesiones || 1 }, (_, index) => {
            const sessionNum = index + 1
            const sessionDate = formData[`fecha_ejecucion${sessionNum}`]
            let currentDateTime = null
            
            if (sessionDate) {
              if (sessionDate instanceof Date) {
                currentDateTime = sessionDate
              } else if (typeof sessionDate === 'string') {
                // Handle string dates from database
                currentDateTime = new Date(sessionDate)
              } else if (typeof sessionDate === 'object' && sessionDate.year) {
                // Handle date objects from date inputs
                currentDateTime = new Date(sessionDate.year, sessionDate.month - 1, sessionDate.day)
              }
            }
            
            return (
              <DateTimePicker
                key={sessionNum}
                sessionNum={sessionNum}
                currentDateTime={currentDateTime}
                isEditing={isEditing}
                isNew={isNew}
                updateFormData={updateFormData}
              />
            )
          })}
        </div>
      </div>
    </div>
  );
};

export default ExecutionDates;
