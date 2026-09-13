import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { requireSupabase, supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return undefined
    }

    let active = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) console.error('Could not restore Supabase session:', error.message)
      setSession(data?.session ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setLoading(false)
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
      if (event === 'SIGNED_OUT') setPasswordRecovery(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const login = useCallback(async ({ email, password, provider, redirectTo } = {}) => {
    const client = requireSupabase()
    if (provider) {
      const callbackUrl = new URL(redirectTo || '/home', window.location.origin).toString()
      const { data, error } = await client.auth.signInWithOAuth({
        provider,
        options: { redirectTo: callbackUrl },
      })
      if (error) throw error
      return { ...data, redirecting: true }
    }

    const { data, error } = await client.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }, [])

  const signup = useCallback(async ({ email, password } = {}) => {
    const client = requireSupabase()
    const emailRedirectTo = new URL('/home', window.location.origin).toString()
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo },
    })
    if (error) throw error
    return data
  }, [])

  const resetPassword = useCallback(async (email) => {
    const client = requireSupabase()
    const redirectTo = new URL('/login?recovery=1', window.location.origin).toString()
    const { data, error } = await client.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) throw error
    return data
  }, [])

  const updatePassword = useCallback(async (password) => {
    const client = requireSupabase()
    const { data, error } = await client.auth.updateUser({ password })
    if (error) throw error
    setPasswordRecovery(false)
    return data
  }, [])

  const logout = useCallback(async () => {
    const client = requireSupabase()
    const { error } = await client.auth.signOut()
    if (error) throw error
  }, [])

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      session,
      accessToken: session?.access_token ?? null,
      isAuthenticated: Boolean(session?.user),
      loading,
      passwordRecovery,
      login,
      signup,
      resetPassword,
      updatePassword,
      logout,
    }),
    [
      session,
      loading,
      passwordRecovery,
      login,
      signup,
      resetPassword,
      updatePassword,
      logout,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
