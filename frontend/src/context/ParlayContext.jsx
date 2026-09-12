import { createContext, useCallback, useContext, useState } from 'react'

/**
 * Session-only state for the hypothetical parlay builder.
 *
 * Everything here lives in memory for the lifetime of the tab — there is no
 * backend, no persistence across a refresh, and no trade or contract is ever
 * placed. `savedParlays` holds parlay objects assembled entirely from
 * opportunity data the Opportunities page already has locally.
 */

const ParlayContext = createContext(null)

export function ParlayProvider({ children }) {
  const [savedParlays, setSavedParlays] = useState([])
  const [toast, setToast] = useState(null)

  const addParlay = useCallback((parlay) => {
    setSavedParlays((current) => [parlay, ...current])
  }, [])

  const removeParlay = useCallback((id) => {
    setSavedParlays((current) => current.filter((parlay) => parlay.id !== id))
  }, [])

  const renameParlay = useCallback((id, name) => {
    setSavedParlays((current) =>
      current.map((parlay) => (parlay.id === id ? { ...parlay, name } : parlay))
    )
  }, [])

  const showToast = useCallback((next) => setToast(next), [])
  const dismissToast = useCallback(() => setToast(null), [])

  return (
    <ParlayContext.Provider
      value={{ savedParlays, addParlay, removeParlay, renameParlay, toast, showToast, dismissToast }}
    >
      {children}
    </ParlayContext.Provider>
  )
}

export function useParlays() {
  const ctx = useContext(ParlayContext)
  if (!ctx) throw new Error('useParlays must be used within a ParlayProvider')
  return ctx
}
