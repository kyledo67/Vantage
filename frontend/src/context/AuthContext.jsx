import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

/**
 * Client-side session state.
 *
 * ⚠️ This is NOT security. It gates the UI only — anyone can grant themselves
 * access by editing localStorage. Every protected resource must ALSO be
 * enforced server-side once the Django/Supabase Auth backend exists.
 *
 * The `login` / `logout` signatures are what Supabase Auth will expose, so
 * swapping the mock for the real client should stay contained to this file.
 */

const STORAGE_KEY = 'vantage.auth.session'

const AuthContext = createContext(null)

function readStoredSession() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    // Private mode / blocked storage — treat as signed out rather than crashing.
    return null
  }
}

function persistSession(session) {
  try {
    if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Non-fatal: the session just won't survive a reload.
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // Starts true so guards don't bounce a signed-in user to /login on first paint.
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setUser(readStoredSession())
    setLoading(false)
  }, [])

  const login = useCallback(async ({ email, provider = 'password' } = {}) => {
    const session = {
      email: email || `demo.user@${provider}.example`,
      provider,
      signedInAt: new Date().toISOString(),
    }
    setUser(session)
    persistSession(session)
    return session
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    persistSession(null)
  }, [])

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), loading, login, logout }),
    [user, loading, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
