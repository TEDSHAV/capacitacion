import { useState, useEffect, useMemo } from 'react'

interface Empresa {
  id: string;
  razon_social: string;
  rif: string;
  direccion_fiscal: string;
  codigo_cliente: string;
}

interface CatalogoServicio {
  id: number;
  nombre: string;
}

const useSearch = <T extends Record<string, any>>(
  items: T[],
  searchTerm: string,
  searchField: keyof T
) => {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)

  const filteredItems = useMemo(() => {
    if (!localSearchTerm.trim()) {
      return items
    }

    return items.filter((item) => {
      const fieldValue = item[searchField]
      if (typeof fieldValue === 'string') {
        return fieldValue.toLowerCase().includes(localSearchTerm.toLowerCase())
      }
      return false
    })
  }, [items, localSearchTerm, searchField])

  const clearSearch = () => {
    setLocalSearchTerm('')
  }

  const updateSearch = (term: string) => {
    setLocalSearchTerm(term)
  }

  // Sync with external searchTerm changes
  useEffect(() => {
    setLocalSearchTerm(searchTerm)
  }, [searchTerm])

  return {
    filteredItems,
    searchTerm: localSearchTerm,
    setSearchTerm: updateSearch,
    clearSearch,
    hasResults: filteredItems.length > 0
  }
}

export default useSearch
