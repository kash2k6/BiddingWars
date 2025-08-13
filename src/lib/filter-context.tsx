"use client"

import { createContext, useContext, useState, ReactNode } from 'react'

interface FilterState {
  searchTerm: string
  filterType: 'all' | 'digital' | 'physical'
  filterPriceRange: 'all' | 'low' | 'medium' | 'high'
}

interface FilterContextType {
  filters: FilterState
  setFilters: (filters: FilterState) => void
  updateFilter: (key: keyof FilterState, value: string) => void
  clearFilters: () => void
}

const FilterContext = createContext<FilterContextType | undefined>(undefined)

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    filterType: 'all',
    filterPriceRange: 'all'
  })

  const updateFilter = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      filterType: 'all',
      filterPriceRange: 'all'
    })
  }

  return (
    <FilterContext.Provider value={{ filters, setFilters, updateFilter, clearFilters }}>
      {children}
    </FilterContext.Provider>
  )
}

export function useFilters() {
  const context = useContext(FilterContext)
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider')
  }
  return context
}
