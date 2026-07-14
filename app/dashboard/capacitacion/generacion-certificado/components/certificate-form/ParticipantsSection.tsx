'use client'

import { useState, useMemo, useRef } from 'react'
import { CertificateParticipant, ParticipantsSectionProps } from '@/types'
import { useParticipants } from './use-participants'

export const ParticipantsSection = ({ participants, onChange, passing_grade }: ParticipantsSectionProps) => {
  const nameInputRef = useRef<HTMLInputElement>(null)
  
  // Ensure participants is always an array
  const safeParticipants = Array.isArray(participants) ? participants : []
  
  // Remove duplicates by ID number (memoized to prevent infinite loop)
  const uniqueParticipants = useMemo(() => 
    safeParticipants.filter((participant, index, self) => 
      index === self.findIndex((p) => p.id_number === participant.id_number)
    ), [safeParticipants])
  
  const {
    newParticipant,
    addParticipant: addParticipantHook,
    removeParticipant,
    updateNewParticipant,
    handleKeyPress: handleKeyPressHook
  } = useParticipants(onChange, uniqueParticipants)

  const addParticipant = () => {
    const wasAdded = addParticipantHook()
    // Focus back to name input only if participant was successfully added
    if (wasAdded) {
      setTimeout(() => {
        if (nameInputRef.current) {
          nameInputRef.current.focus()
        }
      }, 0) // Small delay to ensure DOM has updated
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addParticipant()
    }
  }
  const getParticipantStatus = (participant: CertificateParticipant) => {
    if (participant.score === undefined || participant.score === null) {
      return 'unknown'
    }
    return participant.score >= (passing_grade || 0) ? 'approved' : 'attendance'
  }

  // Helper function to get badge styles
  const getBadgeStyles = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'attendance':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  // Helper function to get badge text
  const getBadgeText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Aprobado'
      case 'attendance':
        return 'Asistencia'
      default:
        return 'Sin calificación'
    }
  }

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Participantes *
      </label>

      {/* Add Participant Form */}
      <div className="flex gap-2 mb-3">
        <input
          ref={nameInputRef}
          type="text"
          value={newParticipant.name}
          onChange={e => updateNewParticipant('name', e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Nombre del participante"
          className="w-100 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="flex items-center gap-1">
          <select
            value={newParticipant.nacionalidad || 'venezolano'}
            onChange={e => updateNewParticipant('nacionalidad', e.target.value)}
            className="px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="venezolano">V -</option>
            <option value="extranjero">E -</option>
          </select>
          <input
            type="text"
            value={newParticipant.id_number}
            onChange={e => updateNewParticipant('id_number', e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Cédula/Pasaporte"
            className="w-40 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <input
          type="number"
          value={newParticipant.score || ''}
          onChange={e => updateNewParticipant('score', parseInt(e.target.value) || 0)}
          onKeyPress={handleKeyPress}
          placeholder="Calificación"
          min="0"
          max="20"
          className="w-40 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          type="button"
          onClick={addParticipant}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Agregar
        </button>
      </div>

      {/* Participants List */}
      {uniqueParticipants.length > 0 && (
        <div className="border border-gray-200 rounded-md max-h-40 overflow-y-auto">
          {uniqueParticipants.map(participant => {
            const status = getParticipantStatus(participant)
            const badgeStyles = getBadgeStyles(status)
            const badgeText = getBadgeText(status)
            
            return (
              <div
                key={participant.id}
                className="flex justify-between items-center p-2 border-b border-gray-100 last:border-b-0"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {participant.name}
                    </span>
                    <span className="text-gray-500 text-sm">
                      ({participant.nacionalidad === 'venezolano' ? 'V-' : 'E-'}{participant.id_number})
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${badgeStyles}`}>
                      {badgeText}
                    </span>
                    {participant.score !== undefined && (
                      <span className="text-sm text-gray-400 ml-2">
                        {participant.score} pts
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeParticipant(participant.id!)}
                  className="text-red-600 hover:text-red-800"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      )}

      {uniqueParticipants.length === 0 && (
        <p className="text-sm text-gray-500">
          Agrega al menos un participante para generar el certificado
        </p>
      )}
    </div>
  )
}
