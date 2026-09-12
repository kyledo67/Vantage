import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useVerification } from '../../context/VerificationContext.jsx'
import { createPersonaInquiry } from '../../services/verification.js'
import VerificationShell from '../../components/verification/VerificationShell.jsx'

/**
 * Reached when the backend reports `verification_status: "pending"` — which
 * covers two different real situations: an inquiry is genuinely under
 * Persona's review, or the user started but never finished one (the backend
 * marks a profile "pending" as soon as an inquiry is created, before the
 * widget is even opened — see PersonaInquiryView). "Continue verification"
 * exists for the second case, since there's otherwise no way back in.
 *
 * "Check status" calls the real `POST /api/persona/inquiries/` endpoint
 * rather than just re-reading the stored profile: that endpoint round-trips
 * to Persona itself and re-syncs the result, so it reflects Persona's
 * current state even if the webhook that normally does this hasn't reached
 * this environment (e.g. no local tunnel configured) — a plain profile
 * refetch would otherwise look "stuck" indefinitely.
 */
export default function VerificationPendingPage() {
  const { refetch } = useVerification()
  const navigate = useNavigate()
  const location = useLocation()
  const destination = location.state?.from?.pathname || '/ev-finder'
  const [checking, setChecking] = useState(false)
  const [message, setMessage] = useState(null)

  async function handleCheckStatus() {
    setChecking(true)
    setMessage(null)
    try {
      const inquiry = await createPersonaInquiry()
      if (inquiry?.verified) {
        await refetch()
        navigate(destination, { replace: true })
        return
      }
      setMessage(
        'Still pending. If you haven’t finished verification yet, you can continue it below.'
      )
    } catch {
      setMessage('Couldn’t check your status right now. Please try again in a moment.')
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

        {message && (
          <p className="max-w-sm text-sm leading-relaxed text-vantage-textDim" role="status" aria-live="polite">
            {message}
          </p>
        )}

        <Link
          to="/verify"
          className="mt-1 flex min-h-[44px] items-center text-sm font-medium text-vantage-alert transition-colors hover:text-vantage-accent"
        >
          Continue verification
        </Link>
      </div>
    </VerificationShell>
  )
}
