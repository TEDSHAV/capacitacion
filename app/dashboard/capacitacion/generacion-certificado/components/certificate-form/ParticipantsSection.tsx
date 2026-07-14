import { CertificateParticipant } from '@/types'
import { useParticipants } from './use-participants'

interface ParticipantsSectionProps {
  participants: CertificateParticipant[]
  onChange: (participants: CertificateParticipant[]) => void
}

export const ParticipantsSection = ({ participants, onChange }: ParticipantsSectionProps) => {
  const {
    newParticipant,
    addParticipant,
    removeParticipant,
    updateNewParticipant,
    handleKeyPress
  } = useParticipants(onChange)

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
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <input
          type="text"
          value={newParticipant.id_number}
          onChange={e => updateNewParticipant('id_number', e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Cédula/ID"
          className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <input
          type="number"
          value={newParticipant.score || ''}
          onChange={e => updateNewParticipant('score', parseInt(e.target.value) || 0)}
          onKeyPress={handleKeyPress}
          placeholder="Calificación"
          min="0"
          max="20"
          className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
      {participants.length > 0 && (
        <div className="border border-gray-200 rounded-md max-h-40 overflow-y-auto">
          {participants.map(participant => (
            <div
              key={participant.id}
              className="flex justify-between items-center p-2 border-b border-gray-100 last:border-b-0"
            >
              <div>
                <span className="font-medium text-gray-900">
                  {participant.name}
                </span>
                <span className="text-gray-500 ml-2">
                  ({participant.id_number})
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
                    d="M19 7l-.867 5.14M12 16l-7 7m0 0l7 7-7"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {participants.length === 0 && (
        <p className="text-sm text-gray-500">
          Agrega al menos un participante para generar el certificado
        </p>
      )}
    </div>
  )
}
