import { useCallback, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import VerificationShell from '../../components/verification/VerificationShell.jsx'
import VerificationProgress from '../../components/verification/VerificationProgress.jsx'
import PersonaVerification from '../../components/verification/PersonaVerification.jsx'
import { useVerification } from '../../context/VerificationContext.jsx'

/** Fades/slides between steps — 200ms sits inside the requested 180–240ms band. */
function StepTransition({ stepKey, children }) {
  const reduceMotion = useReducedMotion()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stepKey}
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
        transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

function EligibilityStep({ onContinue }) {
  const [confirmed, setConfirmed] = useState(false)

  return (
    <StepTransition stepKey="eligibility">
      <h1 className="text-2xl font-semibold text-vantage-text sm:text-3xl">
        Confirm your eligibility
      </h1>
      <p className="mt-2 text-base leading-relaxed text-vantage-textDim">
        Before we verify your identity, confirm the basics.
      </p>

      <label className="mt-6 flex min-h-[48px] cursor-pointer items-start gap-3 rounded-lg border border-vantage-border bg-vantage-surfaceAlt px-4 py-4">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          className="mt-0.5 h-5 w-5 flex-shrink-0 accent-[#CE63E9]"
        />
        <span className="text-sm leading-relaxed text-vantage-text">
          I confirm that I am at least 18 years old and eligible to use this service in my
          location.
        </span>
      </label>

      <p className="mt-4 text-xs leading-relaxed text-vantage-textDim">
        Vantage provides market analysis and does not guarantee outcomes. Your country and age
        are confirmed by Persona in the next step — this checkbox is only your confirmation
        before we start.
      </p>

      <button
        type="button"
        onClick={onContinue}
        disabled={!confirmed}
        className="mt-8 flex min-h-[48px] w-full items-center justify-center rounded-full bg-vantage-accent text-base font-semibold text-vantage-ctaText transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vantage-accent"
      >
        Continue to verification
      </button>
    </StepTransition>
  )
}

function PersonaStep({ onVerified, onPending }) {
  return (
    <StepTransition stepKey="persona">
      <h1 className="text-2xl font-semibold text-vantage-text sm:text-3xl">
        Verify your identity
      </h1>
      <p className="mt-2 text-base leading-relaxed text-vantage-textDim">
        To help keep Vantage available to eligible users, we use Persona to verify your
        identity and age.
      </p>
      <div className="mt-8">
        <PersonaVerification onVerified={onVerified} onPending={onPending} />
      </div>
    </StepTransition>
  )
}

function CompleteStep({ destination }) {
  return (
    <StepTransition stepKey="complete">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-vantage-positive/15 text-vantage-positive">
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M4 10.5l4 4 8-9"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <h1 className="text-2xl font-semibold text-vantage-text sm:text-3xl">You’re verified</h1>
        <p className="text-base text-vantage-textDim">Your Vantage account is ready.</p>
        <Link
          to={destination}
          replace
          className="mt-2 flex min-h-[48px] items-center rounded-full bg-vantage-accent px-8 text-base font-semibold text-vantage-ctaText transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vantage-accent"
        >
          Explore opportunities
        </Link>
      </div>
    </StepTransition>
  )
}

function UnavailableStep({ eligibility }) {
  const reasons = eligibility
    ? Object.values(eligibility.platforms ?? {})
        .filter((platform) => !platform.eligible)
        .map((platform) => platform.reason)
    : []

  return (
    <StepTransition stepKey="unavailable">
      <h1 className="text-2xl font-semibold text-vantage-text sm:text-3xl">
        Vantage isn’t available for your region yet
      </h1>
      <p className="mt-2 text-base leading-relaxed text-vantage-textDim">
        You’re verified, but Kalshi and Polymarket US both restrict trading from your confirmed
        location right now. This isn’t a reflection of your eligibility as a person — it’s a
        regional availability limit set by those platforms.
      </p>
      {reasons.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
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
    </StepTransition>
  )
}

/**
 * Required verification onboarding — eligibility confirmation, Persona,
 * then complete (or an unavailable-region screen if Persona's verified
 * residence turns out to be restricted). Reached when the backend reports
 * `verification_status` other than "verified" (see VerificationGuard).
 */
export default function VerificationOnboardingPage() {
  const { refetch } = useVerification()
  const navigate = useNavigate()
  const location = useLocation()
  const destination = location.state?.from?.pathname || '/ev-finder'
  const [step, setStep] = useState('eligibility')
  const [eligibility, setEligibility] = useState(null)

  const handleVerified = useCallback(async () => {
    const profile = await refetch()
    if (profile?.eligibility && !profile.eligibility.is_eligible) {
      setEligibility(profile.eligibility)
      setStep('unavailable')
    } else {
      setStep('complete')
    }
  }, [refetch])

  const handlePending = useCallback(() => {
    navigate('/verify/pending', { replace: true, state: location.state })
  }, [navigate, location.state])

  return (
    <VerificationShell>
      {step !== 'complete' && step !== 'unavailable' && <VerificationProgress currentStep={step} />}

      {step === 'eligibility' && <EligibilityStep onContinue={() => setStep('persona')} />}
      {step === 'persona' && <PersonaStep onVerified={handleVerified} onPending={handlePending} />}
      {step === 'complete' && <CompleteStep destination={destination} />}
      {step === 'unavailable' && <UnavailableStep eligibility={eligibility} />}
    </VerificationShell>
  )
}
