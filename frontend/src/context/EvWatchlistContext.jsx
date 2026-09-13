import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext.jsx'

/**
 * EV Finder Watchlist — which opportunities (real ids from the live
 * /api/opportunities feed) a user has bookmarked, a snapshot of price/EV at
 * save time, and a genuinely-observed history of EV readings over time for
 * each (see recordObservation below — every point is a real value the app
 * actually fetched, never a generated/fabricated series).
 *
 * There's no backend watchlist endpoint (GET/POST /api/watchlist was never
 * implemented — confirmed against market_data/urls.py), so "persist across
 * sessions" is implemented with localStorage, keyed by the signed-in user's
 * id: real across reloads and re-logins on this device, but not synced
 * across devices the way a real backend-persisted watchlist would be.
 */

const EvWatchlistContext = createContext(null)
const MAX_HISTORY_POINTS = 60

function entriesKey(userId) {
  return `vantage:ev-watchlist:${userId ?? 'anon'}`
}

function historyKey(userId) {
  return `vantage:ev-watchlist-history:${userId ?? 'anon'}`
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : fallback
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage can be unavailable (private browsing, quota) — this just won't
    // survive a reload this session; nothing else depends on it.
  }
}

export function EvWatchlistProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [entries, setEntries] = useState(() => readJSON(entriesKey(userId), []))
  const [history, setHistory] = useState(() => readJSON(historyKey(userId), {}))

  // Re-read if the signed-in user changes (account switch in the same tab).
  useEffect(() => {
    setEntries(readJSON(entriesKey(userId), []))
    setHistory(readJSON(historyKey(userId), {}))
  }, [userId])
  useEffect(() => writeJSON(entriesKey(userId), entries), [userId, entries])
  useEffect(() => writeJSON(historyKey(userId), history), [userId, history])

  const isWatched = useCallback((id) => entries.some((e) => e.id === id), [entries])

  /**
   * Appends a real observed reading for a watched id — called every time a
   * page actually fetches this opportunity's current data. Skips writing if
   * the value hasn't changed since the last point, so the series reflects
   * genuine odds/EV movement rather than one point per poll tick.
   */
  const recordObservation = useCallback((id, { evValue, priceLabel }) => {
    if (evValue === undefined || evValue === null) return
    setHistory((current) => {
      const points = current[id] ?? []
      const last = points[points.length - 1]
      if (last && last.evValue === evValue && last.priceLabel === priceLabel) return current
      const next = [...points, { t: new Date().toISOString(), evValue, priceLabel }].slice(
        -MAX_HISTORY_POINTS
      )
      return { ...current, [id]: next }
    })
  }, [])

  const addToWatchlist = useCallback((opportunity) => {
    const snapshot = {
      priceLabel: opportunity.price?.label ?? null,
      evValue: opportunity.ev?.value ?? null,
      evLabel: opportunity.ev?.label ?? null,
    }
    setEntries((current) => {
      if (current.some((e) => e.id === opportunity.id)) return current
      return [...current, { id: opportunity.id, addedAt: new Date().toISOString(), snapshot }]
    })
    if (snapshot.evValue !== null) {
      setHistory((current) => ({
        ...current,
        [opportunity.id]: [
          { t: new Date().toISOString(), evValue: snapshot.evValue, priceLabel: snapshot.priceLabel },
        ],
      }))
    }
  }, [])

  const removeFromWatchlist = useCallback((id) => {
    setEntries((current) => current.filter((e) => e.id !== id))
    setHistory((current) => {
      if (!(id in current)) return current
      const next = { ...current }
      delete next[id]
      return next
    })
  }, [])

  const toggleWatch = useCallback(
    (opportunity) => {
      if (entries.some((e) => e.id === opportunity.id)) removeFromWatchlist(opportunity.id)
      else addToWatchlist(opportunity)
    },
    [entries, addToWatchlist, removeFromWatchlist]
  )

  const clearAll = useCallback(() => {
    setEntries([])
    setHistory({})
  }, [])

  const getHistory = useCallback((id) => history[id] ?? [], [history])

  const value = useMemo(
    () => ({
      entries,
      isWatched,
      addToWatchlist,
      removeFromWatchlist,
      toggleWatch,
      clearAll,
      recordObservation,
      getHistory,
    }),
    [
      entries,
      isWatched,
      addToWatchlist,
      removeFromWatchlist,
      toggleWatch,
      clearAll,
      recordObservation,
      getHistory,
    ]
  )

  return <EvWatchlistContext.Provider value={value}>{children}</EvWatchlistContext.Provider>
}

export function useEvWatchlist() {
  const ctx = useContext(EvWatchlistContext)
  if (!ctx) throw new Error('useEvWatchlist must be used within an EvWatchlistProvider')
  return ctx
}
