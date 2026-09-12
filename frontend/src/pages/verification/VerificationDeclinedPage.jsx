import { useNavigate } from 'react-router-dom'
import VerificationShell from '../../components/verification/VerificationShell.jsx'

/**
 * Reached when the backend reports `verification_status: "declined"`.
 *
 * The backend doesn't yet expose whether a new attempt is allowed (no
 * "can retry" field on the profile — see services/verification.js), so
 * this defaults to offering one. If that ever needs to be conditional,
 * that flag belongs on the profile response, not decided here.
 */
export default function VerificationDeclinedPage() {
  const navigate = useNavigate()

  return (
    <VerificationShell>
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-2xl font-semibold text-vantage-text sm:text-3xl">
          We couldn’t verify your account
        </h1>
        <p className="max-w-sm text-base leading-relaxed text-vantage-textDim">
          Your verification wasn’t approved. This can happen for a number of reasons and isn’t
          necessarily something you did wrong. You’re welcome to try again.
        </p>
        <button
          type="button"
          onClick={() => navigate('/verify')}
          className="mt-2 flex min-h-[48px] items-center rounded-full bg-vantage-accent px-8 text-base font-semibold text-vantage-ctaText transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vantage-accent"
        >
          Try again
        </button>
      </div>
    </VerificationShell>
  )
}
