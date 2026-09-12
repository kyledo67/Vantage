import { useCallback, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import VerificationShell from '../../components/verification/VerificationShell.jsx'
import VerificationProgress from '../../components/verification/VerificationProgress.jsx'
import CountrySelect from '../../components/verification/CountrySelect.jsx'
import PersonaVerification from '../../components/verification/PersonaVerification.jsx'
import { useVerification } from '../../context/VerificationContext.jsx'
import { checkCountryEligibility } from '../../services/verification.js'

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

function CountryStep({ country, onSelect, onContinue, eligibility }) {
  return (
    <StepTransition stepKey="country">
      <h1 className="text-2xl font-semibold text-vantage-text sm:text-3xl">
        Where are you located?
      </h1>
      <p className="mt-2 text-base leading-relaxed text-vantage-textDim">
        We need your country to confirm whether Vantage is available where you live.
      </p>

      <div className="mt-8">
        <CountrySelect value={country} onChange={onSelect} suggested={null} />
      </div>

      {eligibility.status === 'checking' && (
        <p className="mt-4 text-sm text-vantage-textDim" role="status" aria-live="polite">
          Checking availability for {country?.name}…
        </p>
      )}
      {eligibility.status === 'error' && (
        <p className="mt-4 text-sm text-vantage-danger" role="alert">
          We couldn’t confirm availability right now. Please try again.
        </p>
      )}

      <button
        type="button"
        onClick={onContinue}
        disabled={!country || eligibility.status === 'checking'}
        className="mt-8 flex min-h-[48px] w-full items-center justify-center rounded-full bg-vantage-accent text-base font-semibold text-vantage-ctaText transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vantage-accent"
      >
        Continue
      </button>
    </StepTransition>
  )
}

function UnavailableStep({ country, onChangeCountry }) {
  return (
    <StepTransition stepKey="unavailable">
      <h1 className="text-2xl font-semibold text-vantage-text sm:text-3xl">
        Vantage isn’t available in {country?.name} yet
      </h1>
      <p className="mt-2 text-base leading-relaxed text-vantage-textDim">
        We’re not able to offer Vantage in this region right now. This isn’t a reflection of
        your eligibility — it’s a regional availability limit.
      </p>
      <button
        type="button"
        onClick={onChangeCountry}
        className="mt-8 flex min-h-[48px] items-center rounded-full border border-vantage-border px-6 text-base font-medium text-vantage-text transition-colors hover:border-vantage-accent hover:text-vantage-accent"
      >
        Choose a different country
      </button>
    </StepTransition>
  )
}

function EligibilityStep({ country, onChangeCountry, onContinue }) {
  const [confirmed, setConfirmed] = useState(false)

  return (
    <StepTransition stepKey="eligibility">
      <h1 className="text-2xl font-semibold text-vantage-text sm:text-3xl">
        Confirm your eligibility
      </h1>

      <div className="mt-5 flex items-center justify-between gap-3 rounded-lg border border-vantage-border bg-vantage-surfaceAlt px-4 py-3">
        <span className="flex items-center gap-2.5 text-base text-vantage-text">
          <span aria-hidden="true" className="text-lg">
            {country?.flag}
          </span>
          {country?.name}
        </span>
        <button
          type="button"
          onClick={onChangeCountry}
          className="flex min-h-[44px] items-center text-sm font-medium text-vantage-alert transition-colors hover:text-vantage-accent"
        >
          Change
        </button>
      </div>

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
        Vantage provides market analysis and does not guarantee outcomes.
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

/**
 * Required verification onboarding — country, eligibility confirmation,
 * Persona, then complete. Reached only when the backend reports
 * `verification_status: "not_started"` (see VerificationGuard).
 */
export default function VerificationOnboardingPage() {
  const { country, setCountry, refetch } = useVerification()
  const navigate = useNavigate()
  const location = useLocation()
  const destination = location.state?.from?.pathname || '/ev-finder'
  const [step, setStep] = useState('country')
  const [eligibility, setEligibility] = useState({ status: 'idle' })

  const handleCountrySelect = useCallback(
    (next) => {
      setCountry(next)
      setEligibility({ status: 'idle' })
    },
    [setCountry]
  )

  const handleCountryContinue = useCallback(async () => {
    if (!country) return
    setEligibility({ status: 'checking' })
    try {
      const result = await checkCountryEligibility(country.code)
      if (result?.available) {
        setEligibility({ status: 'available' })
        setStep('eligibility')
      } else {
        setEligibility({ status: 'unavailable' })
        setStep('unavailable')
      }
    } catch {
      // The country-eligibility endpoint isn't implemented on the backend
      // yet (see services/verification.js) — surface that honestly rather
      // than guessing at availability ourselves.
      setEligibility({ status: 'error' })
    }
  }, [country])

  const handleVerified = useCallback(async () => {
    await refetch()
    setStep('complete')
  }, [refetch])

  const handlePending = useCallback(() => {
    navigate('/verify/pending', { replace: true, state: location.state })
  }, [navigate, location.state])

  return (
    <VerificationShell>
      {step !== 'complete' && <VerificationProgress currentStep={step === 'unavailable' ? 'country' : step} />}

      {step === 'country' && (
        <CountryStep
          country={country}
          onSelect={handleCountrySelect}
          onContinue={handleCountryContinue}
          eligibility={eligibility}
        />
      )}
      {step === 'unavailable' && (
        <UnavailableStep country={country} onChangeCountry={() => setStep('country')} />
      )}
      {step === 'eligibility' && (
        <EligibilityStep
          country={country}
          onChangeCountry={() => setStep('country')}
          onContinue={() => setStep('persona')}
        />
      )}
      {step === 'persona' && <PersonaStep onVerified={handleVerified} onPending={handlePending} />}
      {step === 'complete' && <CompleteStep destination={destination} />}
    </VerificationShell>
  )
}
