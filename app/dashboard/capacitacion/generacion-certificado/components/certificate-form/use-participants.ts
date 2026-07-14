import { useState, useCallback, useEffect } from 'react'
import { CertificateParticipant } from '@/types'

const initialParticipant = { name: '', id_number: '', score: 0, nacionalidad: 'venezolano' as 'venezolano' | 'extranjero' }

export const useParticipants = (onParticipantsChange: (participants: CertificateParticipant[]) => void, initialParticipants: CertificateParticipant[] = []) => {
  const [newParticipant, setNewParticipant] = useState(initialParticipant)
  const [currentParticipants, setCurrentParticipants] = useState<CertificateParticipant[]>(initialParticipants)

  // Sync with parent component when initial participants change
  useEffect(() => {
    setCurrentParticipants(initialParticipants || [])
  }, [initialParticipants])

  const addParticipant = useCallback((): boolean => {
    if (newParticipant.name.trim() && newParticipant.id_number.trim()) {
      // Check if participant with same ID number already exists
      const existingParticipant = currentParticipants.find(
        p => p.id_number === newParticipant.id_number.trim()
      )
      
      if (existingParticipant) {
        alert('Ya existe un participante con este número de cédula/pasaporte')
        return false
      }
      
      const participant: CertificateParticipant = {
        id: Date.now().toString(),
        name: newParticipant.name.trim(),
        id_number: newParticipant.id_number.trim(),
        score: newParticipant.score || 0,
        nacionalidad: newParticipant.nacionalidad || 'venezolano'
      }
      const updatedParticipants = [...currentParticipants, participant]
      setCurrentParticipants(updatedParticipants)
      onParticipantsChange(updatedParticipants)
      setNewParticipant(initialParticipant)
      return true
    }
    return false
  }, [newParticipant, currentParticipants, onParticipantsChange])

  const removeParticipant = useCallback((id: string) => {
    const updatedParticipants = currentParticipants.filter(p => p.id !== id)
    setCurrentParticipants(updatedParticipants)
    onParticipantsChange(updatedParticipants)
  }, [currentParticipants, onParticipantsChange])

  const updateNewParticipant = useCallback((field: keyof typeof newParticipant, value: string | number) => {
    setNewParticipant(prev => {
      const updated = { ...prev, [field]: value }
      return updated
    })
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
