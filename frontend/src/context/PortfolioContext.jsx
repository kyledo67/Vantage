import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { MAX_PORTFOLIO_LEGS } from '../utils/constants.js'

const PortfolioContext = createContext(null)

export function PortfolioProvider({ children }) {
  const [selectedContracts, setSelectedContracts] = useState([])

  const addContract = useCallback((contract) => {
    setSelectedContracts((prev) => {
      if (prev.some((c) => c.id === contract.id)) return prev
      if (prev.length >= MAX_PORTFOLIO_LEGS) return prev
      // Same-game combinations are not modeled for correlation in the MVP — reject them.
      if (prev.some((c) => c.event === contract.event)) return prev
      return [...prev, contract]
    })
  }, [])

  const removeContract = useCallback((contractId) => {
    setSelectedContracts((prev) => prev.filter((c) => c.id !== contractId))
  }, [])

  const clearPortfolio = useCallback(() => setSelectedContracts([]), [])

  const value = useMemo(
    () => ({ selectedContracts, addContract, removeContract, clearPortfolio }),
    [selectedContracts, addContract, removeContract, clearPortfolio]
  )

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>
}

export function usePortfolio() {
  const ctx = useContext(PortfolioContext)
  if (!ctx) throw new Error('usePortfolio must be used within a PortfolioProvider')
  return ctx
}
