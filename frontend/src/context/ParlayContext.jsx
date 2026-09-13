import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext.jsx'
import {
  createSavedParlay,
  deleteSavedParlay,
  getSavedParlays,
  updateSavedParlay,
} from '../services/parlays.js'

/**
 * Saved state for the hypothetical parlay builder. Each parlay is persisted
 * through Django to Supabase Postgres under the authenticated user's profile.
 * It remains analysis only: no trade or contract is ever placed.
 */

const ParlayContext = createContext(null)

export function ParlayProvider({ children }) {
  const { isAuthenticated, user } = useAuth()
  const [savedParlays, setSavedParlays] = useState([])
  const [status, setStatus] = useState('idle')
  const [toast, setToast] = useState(null)

  const loadParlays = useCallback(async () => {
    if (!isAuthenticated) {
      setSavedParlays([])
      setStatus('idle')
      return []
    }
    setStatus('loading')
    try {
      const parlays = await getSavedParlays()
      setSavedParlays(Array.isArray(parlays) ? parlays : [])
      setStatus('success')
      return parlays
    } catch (error) {
      console.error('Could not load saved parlays:', error)
      setStatus('error')
      return []
    }
  }, [isAuthenticated])

  useEffect(() => {
    loadParlays()
  }, [loadParlays, user?.id])

  const addParlay = useCallback(async (parlay) => {
    try {
      const saved = await createSavedParlay(parlay)
      setSavedParlays((current) => [saved, ...current])
      return saved
    } catch (error) {
      console.error('Could not save parlay:', error)
      setToast({ message: 'Couldn’t save this parlay. Please try again.' })
      throw error
    }
  }, [])

  const removeParlay = useCallback(async (id) => {
    try {
      await deleteSavedParlay(id)
      setSavedParlays((current) => current.filter((parlay) => parlay.id !== id))
    } catch (error) {
      console.error('Could not remove parlay:', error)
      setToast({ message: 'Couldn’t remove this parlay. Please try again.' })
    }
  }, [])

  const renameParlay = useCallback(async (id, name) => {
    try {
      const saved = await updateSavedParlay(id, { name })
      setSavedParlays((current) => current.map((parlay) => (parlay.id === id ? saved : parlay)))
    } catch (error) {
      console.error('Could not rename parlay:', error)
      setToast({ message: 'Couldn’t rename this parlay. Please try again.' })
    }
  }, [])

  const setParlayOutcome = useCallback(async (id, outcome) => {
    const nextOutcome = ['won', 'lost'].includes(outcome) ? outcome : 'pending'
    try {
      const saved = await updateSavedParlay(id, { outcome: nextOutcome })
      setSavedParlays((current) => current.map((parlay) => (parlay.id === id ? saved : parlay)))
    } catch (error) {
      console.error('Could not update parlay result:', error)
      setToast({ message: 'Couldn’t update this result. Please try again.' })
    }
  }, [])

  const showToast = useCallback((next) => setToast(next), [])
  const dismissToast = useCallback(() => setToast(null), [])

  const value = useMemo(
    () => ({
      savedParlays,
      status,
      addParlay,
      removeParlay,
      renameParlay,
      setParlayOutcome,
      reloadParlays: loadParlays,
      toast,
      showToast,
      dismissToast,
    }),
    [
      savedParlays,
      status,
      addParlay,
      removeParlay,
      renameParlay,
      setParlayOutcome,
      loadParlays,
      toast,
      showToast,
      dismissToast,
    ]
  )

  return <ParlayContext.Provider value={value}>{children}</ParlayContext.Provider>
}

export function useParlays() {
  const ctx = useContext(ParlayContext)
  if (!ctx) throw new Error('useParlays must be used within a ParlayProvider')
  return ctx
}
