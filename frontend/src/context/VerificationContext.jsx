import { createContext, useCallback, useContext, useMemo } from 'react'
import { useAuth } from './AuthContext.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { getVerificationProfile } from '../services/verification.js'

/**
 * Verification state for the signed-in user, backed by the real
 * `GET /api/profile/` endpoint. Residence country/eligibility are Persona-
 * and backend-owned facts (see services/verification.js) — there's no
 * frontend pre-step that collects or guesses them.
 */

const VerificationContext = createContext(null)

export function VerificationProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const profile = useAsync(getVerificationProfile, [], { immediate: isAuthenticated })

  const refetch = useCallback(() => profile.refetch(), [profile.refetch])

  const status = profile.status === 'error'
    ? 'error'
    : profile.status === 'success'
      ? profile.data?.verification_status ?? 'not_started'
      : 'loading'

  const value = useMemo(
    () => ({
      status, // 'loading' | 'error' | not_started | pending | verified | declined
      profile: profile.data,
      isAgeVerified: Boolean(profile.data?.is_age_verified),
      eligibility: profile.data?.eligibility ?? null,
      residenceCountryCode: profile.data?.residence_country_code || null,
      refetch,
    }),
    [status, profile.data, refetch]
  )

  return <VerificationContext.Provider value={value}>{children}</VerificationContext.Provider>
}

export function useVerification() {
  const ctx = useContext(VerificationContext)
  if (!ctx) throw new Error('useVerification must be used within a VerificationProvider')
  return ctx
}
