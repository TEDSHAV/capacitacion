import { useState, useCallback } from 'react'
import { CertificateParticipant } from '@/types'

const initialParticipant = { name: '', id_number: '', score: 0 }

export const useParticipants = (onParticipantsChange: (participants: CertificateParticipant[]) => void) => {
  const [newParticipant, setNewParticipant] = useState(initialParticipant)

  const addParticipant = useCallback(() => {
    if (newParticipant.name.trim() && newParticipant.id_number.trim()) {
      const participant: CertificateParticipant = {
        id: Date.now().toString(),
        name: newParticipant.name.trim(),
        id_number: newParticipant.id_number.trim(),
        score: newParticipant.score || 0
      }
      onParticipantsChange(prev => [...prev, participant])
      setNewParticipant(initialParticipant)
    }
  }, [newParticipant, onParticipantsChange])

  const removeParticipant = useCallback((id: string) => {
    onParticipantsChange(prev => prev.filter(p => p.id !== id))
  }, [onParticipantsChange])

  const updateNewParticipant = useCallback((field: keyof typeof newParticipant, value: string | number) => {
    setNewParticipant(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addParticipant()
    }
  }, [addParticipant])

  return {
    newParticipant,
    addParticipant,
    removeParticipant,
    updateNewParticipant,
    handleKeyPress
  }
}
