import VerificationShell from '../../components/verification/VerificationShell.jsx'
import { useVerification } from '../../context/VerificationContext.jsx'

/**
 * Reached when VerificationGuard sees `verification_status: "verified"` but
 * `eligibility.is_eligible: false` — a real, backend-computed fact from the
 * confirmed Persona residence, not a guess. Distinct from
 * VerificationDeclinedPage: the person is verified, the region just isn't
 * currently supported.
 */
export default function VerificationUnavailablePage() {
  const { eligibility } = useVerification()
  const reasons = eligibility
    ? Object.values(eligibility.platforms ?? {})
        .filter((platform) => !platform.eligible)
        .map((platform) => platform.reason)
    : []

  return (
    <VerificationShell>
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-2xl font-semibold text-vantage-text sm:text-3xl">
          Vantage isn’t available for your region yet
        </h1>
        <p className="max-w-sm text-base leading-relaxed text-vantage-textDim">
          You’re verified, but Kalshi and Polymarket both restrict trading from your confirmed
          location right now. This isn’t a reflection of your eligibility as a person — it’s a
          regional availability limit set by those platforms.
        </p>
        {reasons.length > 0 && (
          <ul className="flex w-full max-w-sm flex-col gap-2 text-left">
            {reasons.map((reason) => (
              <li
                key={reason}
                className="rounded-lg border border-vantage-border bg-vantage-surfaceAlt px-4 py-3 text-sm text-vantage-textDim"
              >
                {reason}
              </li>
            ))}
          </ul>
        )}
      </div>
    </VerificationShell>
  )
}
