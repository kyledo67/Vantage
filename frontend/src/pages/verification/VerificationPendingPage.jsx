import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import VerificationShell from '../../components/verification/VerificationShell.jsx'
import { useVerification } from '../../context/VerificationContext.jsx'
import { VERIFICATION_STATUS } from '../../services/verification.js'

/**
 * Reached when the backend reports `verification_status: "pending"`, or
 * right after Persona reports completion while the backend/webhook hasn't
 * caught up yet. "Check status" re-polls the real profile endpoint —
 * nothing here decides verification itself.
 */
export default function VerificationPendingPage() {
  const { refetch } = useVerification()
  const navigate = useNavigate()
  const location = useLocation()
  const destination = location.state?.from?.pathname || '/ev-finder'
  const [checking, setChecking] = useState(false)

  async function handleCheckStatus() {
    setChecking(true)
    try {
      const result = await refetch()
      if (result?.verification_status === VERIFICATION_STATUS.VERIFIED) {
        navigate(destination, { replace: true })
      }
    } finally {
      setChecking(false)
    }
  }

  return (
    <VerificationShell>
      <div className="flex flex-col items-center gap-4 text-center">
        <span
          aria-hidden="true"
          className="h-10 w-10 animate-spin rounded-full border-2 border-vantage-border border-t-vantage-accent"
        />
        <h1 className="text-2xl font-semibold text-vantage-text sm:text-3xl">
          Verification in progress
        </h1>
        <p className="max-w-sm text-base leading-relaxed text-vantage-textDim">
          We’re confirming your verification. You can return shortly to check your status.
        </p>
        <button
          type="button"
          onClick={handleCheckStatus}
          disabled={checking}
          className="mt-2 flex min-h-[48px] items-center rounded-full bg-vantage-accent px-8 text-base font-semibold text-vantage-ctaText transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vantage-accent"
        >
          {checking ? 'Checking…' : 'Check status'}
        </button>
      </div>
    </VerificationShell>
  )
}
