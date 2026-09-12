import { Navigate, useLocation } from 'react-router-dom'
import { useVerification } from '../../context/VerificationContext.jsx'
import { VERIFICATION_STATUS } from '../../services/verification.js'
import LoadingSpinner from '../common/LoadingSpinner.jsx'
import VerificationShell from '../verification/VerificationShell.jsx'

/**
 * Sits inside RequireAuth, around every authenticated product route.
 * Verification and eligibility are both real, backend-computed facts
 * (GET /api/profile/'s `verification_status` and `eligibility.is_eligible`)
 * — nothing here decides either one itself.
 */
export default function VerificationGuard({ children }) {
  const { status, isAgeVerified, eligibility } = useVerification()
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

  if (eligibility && !eligibility.is_eligible) {
    return <Navigate to="/verify/unavailable" state={{ from: location }} replace />
  }

  return children
}
