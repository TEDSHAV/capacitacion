import { useState, useCallback, useEffect } from 'react'
import { CertificateParticipant } from '@/types'

const initialParticipant = { name: '', id_number: '', score: 0, nationality: 'venezolano' as 'venezolano' | 'extranjero' }

export const useParticipants = (onParticipantsChange: (participants: CertificateParticipant[]) => void, initialParticipants: CertificateParticipant[] = []) => {
  const [newParticipant, setNewParticipant] = useState(initialParticipant)
  const [currentParticipants, setCurrentParticipants] = useState<CertificateParticipant[]>(initialParticipants)
  const [error, setError] = useState<string>('')

  // Sync with parent component when initial participants change
  useEffect(() => {
    setCurrentParticipants(initialParticipants || [])
  }, [initialParticipants])

  const addParticipant = useCallback((): boolean => {
    if (newParticipant.name.trim() && newParticipant.id_number.trim()) {
      // Validate score range
      const score = typeof newParticipant.score === 'string' ? parseInt(newParticipant.score) || 0 : newParticipant.score || 0
      
      if (score < 0 || score > 20) {
        setError('La calificación debe estar entre 0 y 20')
        return false
      }
      
      // Check if participant with same ID number already exists
      const existingParticipant = currentParticipants.find(
        p => p.id_number === newParticipant.id_number.trim()
      )
      
      if (existingParticipant) {
        setError('Ya existe un participante con este número de cédula/pasaporte')
        return false
      }
      
      // Clear error when validation passes
      setError('')
      
      const participant: CertificateParticipant = {
        id: Date.now().toString(),
        name: newParticipant.name.trim(),
        id_number: newParticipant.id_number.trim(),
        score: score,
        nationality: newParticipant.nationality || 'venezolano'
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
    // Clear error when user starts typing
    setError('')
    setNewParticipant(prev => {
      return { ...prev, [field]: value }
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
    handleKeyPress,
    error
  }
}
