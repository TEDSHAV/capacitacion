import { useLocationSearch } from './use-location-search'

interface LocationSearchProps {
  value: string
  onChange: (value: string) => void
}

export const LocationSearch = ({ value, onChange }: LocationSearchProps) => {
  const {
    locationInput,
    isDropdownOpen,
    selectedIndex,
    filteredLocations,
    handleLocationSelect,
    handleInputChange,
    handleKeyDown,
    handleClear,
    setIsDropdownOpen
  } = useLocationSearch(onChange)

  return (
    <div className="mb-4">
      <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
        Ubicación *
      </label>
      <div className="relative">
        <div className="relative">
          <input
            type="text"
            id="location"
            value={locationInput}
            onChange={e => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setIsDropdownOpen(true)
            }}
            onBlur={() => setTimeout(() => setIsDropdownOpen(false), 150)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Buscar ciudad o estado en Venezuela..."
          />
          {locationInput && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-0 w-8 flex items-center justify-center text-white hover:text-gray-200"
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
          )}
        </div>

        {/* Autocomplete Suggestions */}
        {isDropdownOpen && locationInput && (
          <div 
            className="absolute mt-2 w-full border border-gray-300 rounded-md shadow-lg bg-white max-h-60 overflow-y-auto z-50"
            onMouseDown={e => e.preventDefault()}
          >
            {filteredLocations.length === 0 ? (
              <div className="p-3 text-gray-500 text-center">
                No se encontraron ubicaciones que coincidan
              </div>
            ) : (
              filteredLocations.map((location, index) => (
                <div
                  key={index}
                  onClick={() => handleLocationSelect(location)}
                  className={`p-3 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                    index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-gray-900">{location}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
