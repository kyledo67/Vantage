import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useAuth } from './AuthContext.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { VERIFICATION_STATUS, getVerificationProfile } from '../services/verification.js'

/**
 * Verification state for the signed-in user, backed by the real
 * `GET /api/profile/` endpoint. Country is tracked here too, but only as
 * local, session-only UI state — the backend has no field for it yet (see
 * services/verification.js), so it is never treated as a confirmed,
 * backend-verified fact and is never persisted anywhere.
 */

const VerificationContext = createContext(null)

export function VerificationProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const profile = useAsync(getVerificationProfile, [], { immediate: isAuthenticated })
  const [country, setCountry] = useState(null)

  const refetch = useCallback(() => profile.refetch(), [profile.refetch])

  const status = profile.status === 'error' ? 'error' : profile.status === 'success'
    ? profile.data?.verification_status ?? VERIFICATION_STATUS.NOT_STARTED
    : 'loading'

  const value = useMemo(
    () => ({
      status, // 'loading' | 'error' | not_started | pending | verified | declined
      profile: profile.data,
      isAgeVerified: Boolean(profile.data?.is_age_verified),
      country,
      setCountry,
      refetch,
    }),
    [status, profile.data, country, refetch]
  )

  return <VerificationContext.Provider value={value}>{children}</VerificationContext.Provider>
}

export function useVerification() {
  const ctx = useContext(VerificationContext)
  if (!ctx) throw new Error('useVerification must be used within a VerificationProvider')
  return ctx
}
