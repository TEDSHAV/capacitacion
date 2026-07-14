import { CertificateParticipant, ParticipantsSectionProps } from '@/types'
import { useParticipants } from './use-participants'

export const ParticipantsSection = ({ participants, onChange }: ParticipantsSectionProps) => {
  // Ensure participants is always an array
  const safeParticipants = Array.isArray(participants) ? participants : []
  
  const {
    newParticipant,
    addParticipant,
    removeParticipant,
    updateNewParticipant,
    handleKeyPress
  } = useParticipants(onChange, safeParticipants)

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Participantes *
      </label>

      {/* Add Participant Form */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={newParticipant.name}
          onChange={e => updateNewParticipant('name', e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Nombre del participante"
          className="w-100 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="flex items-center gap-1">
          <select
            value={newParticipant.id_type || 'V-'}
            onChange={e => updateNewParticipant('id_type', e.target.value)}
            className="px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="V-">V -</option>
            <option value="E-">E -</option>
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
      {safeParticipants.length > 0 && (
        <div className="border border-gray-200 rounded-md max-h-40 overflow-y-auto">
          {safeParticipants.map(participant => (
            <div
              key={participant.id}
              className="flex justify-between items-center p-2 border-b border-gray-100 last:border-b-0"
            >
              <div>
                <span className="font-medium text-gray-900">
                  {participant.name}
                </span>
                <span className="text-gray-500 ml-2">
                  ({participant.id_type || 'V-'}{participant.id_number})
                </span>
                <span className="text-sm text-gray-400 ml-2">
                  {participant.score !== undefined && `${participant.score} pts`}
                </span>
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
          ))}
        </div>
      )}

      {safeParticipants.length === 0 && (
        <p className="text-sm text-gray-500">
          Agrega al menos un participante para generar el certificado
        </p>
      )}
    </div>
  )
}
