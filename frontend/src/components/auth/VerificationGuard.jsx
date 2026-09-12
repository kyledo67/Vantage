import { Navigate, useLocation } from 'react-router-dom'
import { useVerification } from '../../context/VerificationContext.jsx'
import { VERIFICATION_STATUS } from '../../services/verification.js'
import LoadingSpinner from '../common/LoadingSpinner.jsx'
import VerificationShell from '../verification/VerificationShell.jsx'

/**
 * Sits inside RequireAuth, around every authenticated product route.
 * "Eligible country" isn't something the backend tracks yet (see
 * services/verification.js) — the real, enforceable gate here is the
 * backend's own `verification_status` (and `is_age_verified`, which
 * Persona/the backend sets). A signed-in-but-unverified user can never
 * see product routes through this guard, regardless of what the country
 * step showed them client-side.
 */
export default function VerificationGuard({ children }) {
  const { status, isAgeVerified } = useVerification()
  const location = useLocation()

  if (status === 'loading') {
    return <LoadingSpinner label="Checking your verification status…" />
  }

  if (status === 'error') {
    return (
      <VerificationShell showSignOut>
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-2xl font-semibold text-vantage-text sm:text-3xl">
            Couldn’t check your verification status
          </h1>
          <p className="max-w-sm text-base leading-relaxed text-vantage-textDim">
            We weren’t able to reach the verification service. For your safety, Vantage stays
            locked until we can confirm your status.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 flex min-h-[48px] items-center rounded-full bg-vantage-accent px-8 text-base font-semibold text-vantage-ctaText transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vantage-accent"
          >
            Try again
          </button>
        </div>
      </VerificationShell>
    )
  }

  if (status === VERIFICATION_STATUS.PENDING) {
    return <Navigate to="/verify/pending" state={{ from: location }} replace />
  }

  if (status === VERIFICATION_STATUS.DECLINED) {
    return <Navigate to="/verify/declined" state={{ from: location }} replace />
  }

  if (status !== VERIFICATION_STATUS.VERIFIED || !isAgeVerified) {
    return <Navigate to="/verify" state={{ from: location }} replace />
  }

  return children
}
