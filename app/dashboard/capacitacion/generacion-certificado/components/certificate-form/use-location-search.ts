import { useState, useCallback } from 'react'
import { CourseTopic } from '@/types'

const venezuelanLocations = [
  { state: "Amazonas", cities: ["Puerto Ayacucho", "El Atajo", "San Fernando de Atabapo"] },
  { state: "Anzoátegui", cities: ["Barcelona", "Lechería", "Puerto La Cruz", "Clarines", "El Tigre", "San Tomé"] },
  { state: "Apure", cities: ["San Fernando de Apure", "Achaguas", "Biruaca", "Guasdualito"] },
  { state: "Aragua", cities: ["Barcelona", "Cumaná", "Onoto", "Puerto Píritu"] },
  { state: "Barinas", cities: ["Barinas", "Barinitas", "Socopó", "Ciudad Bolivia"] },
  { state: "Bolívar", cities: ["Ciudad Bolívar", "Ciudad Guayana", "Upata", "Caicara"] },
  { state: "Carabobo", cities: ["Valencia", "Naguanagua", "Guacara", "Los Guayos"] },
  { state: "Cojedes", cities: ["San Carlos", "Tinaquillo", "El Pao", "Las Vegas"] },
  { state: "Delta Amacuro", cities: ["Tucupita", "Pedernales", "Curiapo", "Punta de Piedras"] },
  { state: "Distrito Capital", cities: ["Caracas", "El Hatillo", "Los Teques", "Petare"] },
  { state: "Falcón", cities: ["Coro", "Punto Fijo", "Cabudare", "Churuguara"] },
  { state: "Guárico", cities: ["San Juan de los Morros", "Calabozo", "Altagracia de Orituco", "Zaraza"] },
  { state: "Lara", cities: ["Barquisimeto", "Carora", "Cabudare", "El Tocuyo"] },
  { state: "Mérida", cities: ["Mérida", "Ejido", "Timotes", "Santo Domingo"] },
  { state: "Miranda", cities: ["Los Teques", "Ocumare del Tuy", "Charallave", "Santa Teresa del Tuy"] },
  { state: "Monagas", cities: ["Maturín", "Caripito", "Punta de Mata", "Temblador"] },
  { state: "Nueva Esparta", cities: ["La Asunción", "Margarita", "Juan Griego"] },
  { state: "Portuguesa", cities: ["Guanare", "Acarigua", "Piritu", "Güigüe"] },
  { state: "Sucre", cities: ["Cumaná", "Carúpano", "Río Caribe", "Yaguaraparo"] },
  { state: "Táchira", cities: ["San Cristóbal", "Rubio", "Táriba", "La Fría"] },
  { state: "Trujillo", cities: ["Trujillo", "Valera", "Boconó", "Carache"] },
  { state: "Yaracuy", cities: ["San Felipe", "Chivacoa", "Aroa", "Yaritagua"] },
  { state: "Zulia", cities: ["Maracaibo", "Cabimas", "Machiques", "Ciudad Ojeda"] }
]

const allLocations = venezuelanLocations.flatMap(loc => 
  loc.cities.map(city => `${city}, ${loc.state}`)
)

export const useLocationSearch = (onLocationChange: (location: string) => void) => {
  const [locationInput, setLocationInput] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const filteredLocations = allLocations.filter(location =>
    location.toLowerCase().includes(locationInput.toLowerCase())
  )

  const handleLocationSelect = useCallback((location: string) => {
    setLocationInput(location)
    setIsDropdownOpen(false)
    onLocationChange(location)
  }, [onLocationChange])

  const handleInputChange = useCallback((value: string) => {
    setLocationInput(value)
    setIsDropdownOpen(true)
    setSelectedIndex(0)
    onLocationChange(value)
  }, [onLocationChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const currentFiltered = filteredLocations.slice(0, 8)
    
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        if (currentFiltered.length > 0) {
          setIsDropdownOpen(true)
          setSelectedIndex(prev => {
            const safePrev = Math.min(prev, currentFiltered.length - 1)
            return safePrev < currentFiltered.length - 1 ? safePrev + 1 : 0
          })
        }
        break
      case "ArrowUp":
        e.preventDefault()
        if (currentFiltered.length > 0) {
          setIsDropdownOpen(true)
          setSelectedIndex(prev => {
            const safePrev = Math.min(prev, currentFiltered.length - 1)
            return safePrev > 0 ? safePrev - 1 : currentFiltered.length - 1
          })
        }
        break
      case "Enter":
        e.preventDefault()
        if (isDropdownOpen && currentFiltered[selectedIndex]) {
          handleLocationSelect(currentFiltered[selectedIndex])
        }
        break
      case "Escape":
        e.preventDefault()
        setIsDropdownOpen(false)
        setSelectedIndex(0)
        break
    }
  }, [filteredLocations, isDropdownOpen, selectedIndex, handleLocationSelect])

  const handleClear = useCallback(() => {
    setLocationInput('')
    setIsDropdownOpen(false)
    setSelectedIndex(0)
    onLocationChange('')
  }, [onLocationChange])

  return {
    locationInput,
    isDropdownOpen,
    selectedIndex,
    filteredLocations: filteredLocations.slice(0, 8),
    handleLocationSelect,
    handleInputChange,
    handleKeyDown,
    handleClear,
    setIsDropdownOpen
  }
}
