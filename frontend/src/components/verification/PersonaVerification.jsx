import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { createPersonaInquiry, getVerificationProfile, VERIFICATION_STATUS } from '../../services/verification.js'

// Persona requires an exact pinned version in the path (no bare "v5.js") —
// see https://docs.withpersona.com/embedded-flow-changelog for the latest.
const PERSONA_SCRIPT_SRC = 'https://cdn.withpersona.com/dist/persona-v5.8.0.js'

let personaScriptPromise = null

/** Loads Persona's embeddable widget script once, reusing the same promise
 *  across mounts so a second visit to this step doesn't re-fetch it. */
function loadPersonaScript() {
  if (window.Persona) return Promise.resolve()
  if (personaScriptPromise) return personaScriptPromise

  personaScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = PERSONA_SCRIPT_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      personaScriptPromise = null
      reject(new Error('Could not load the verification widget.'))
    }
    document.head.appendChild(script)
  })
  return personaScriptPromise
}

const COPY = {
  loading: {
    title: 'Preparing verification…',
    body: 'We’re setting up your verification session.',
  },
  open: {
    title: 'Verification window open',
    body: 'Finish the steps in the verification window. Don’t see it? It may have opened behind this one.',
  },
  cancelled: {
    title: 'Verification not finished',
    body: 'You closed the verification window before finishing. You can pick back up whenever you’re ready — nothing was lost.',
  },
  failed: {
    title: 'We couldn’t verify you',
    body: 'Something went wrong during verification. This doesn’t necessarily mean anything is wrong with your information — it can help to try again.',
  },
  unavailable: {
    title: 'Verification isn’t available right now',
    body: 'A new verification attempt can’t be started at the moment. Please check back later.',
  },
  error: {
    title: 'Couldn’t reach the verification service',
    body: 'We weren’t able to start verification right now. Please check your connection and try again.',
  },
}

/**
 * Reusable Persona identity-verification widget wrapper, built against the
 * real `POST /api/persona/inquiries/` endpoint.
 *
 * Every terminal state defers final authorization to the backend: a
 * client-side Persona "complete" callback only triggers a real
 * `GET /api/profile/` check, and `onVerified` fires only once that check
 * itself reports `verification_status: "verified"`.
 */
export default function PersonaVerification({ onVerified, onPending }) {
  // idle | loading | open | confirming | cancelled | failed | unavailable | error
  const [state, setState] = useState('idle')
  const clientRef = useRef(null)
  const reduceMotion = useReducedMotion()

  const confirmWithBackend = useCallback(async () => {
    setState('confirming')
    try {
      const profile = await getVerificationProfile()
      if (profile.verification_status === VERIFICATION_STATUS.VERIFIED) {
        onVerified(profile)
      } else {
        // Persona says done; the backend/webhook hasn't caught up yet. Hand
        // off to the real pending screen rather than inventing a second
        // copy of that state here.
        onPending()
      }
    } catch {
      setState('error')
    }
  }, [onVerified, onPending])

  const start = useCallback(async () => {
    setState('loading')
    try {
      const inquiry = await createPersonaInquiry()

      // Already verified — nothing to open. This can happen if the profile
      // flipped to verified between the guard's check and this step
      // mounting (e.g. a second tab finished it first).
      if (inquiry.verified) {
        onVerified()
        return
      }

      if (!inquiry.launchable) {
        setState('unavailable')
        return
      }

      await loadPersonaScript()
      // Resuming a backend-created inquiry uses inquiryId + sessionToken (no
      // environmentId/templateId — those are for the client-creates-its-own-
      // inquiry flow instead). `open()` must be called from inside onReady,
      // not right after construction, or Persona ignores the call.
      const client = new window.Persona.Client({
        inquiryId: inquiry.inquiryId,
        sessionToken: inquiry.sessionToken,
        onReady: () => {
          setState('open')
          client.open()
        },
        onComplete: () => confirmWithBackend(),
        onCancel: () => setState('cancelled'),
        onError: () => setState('failed'),
      })
      clientRef.current = client
    } catch {
      setState('error')
    }
  }, [confirmWithBackend, onVerified])

  useEffect(() => {
    start()
    return () => clientRef.current?.destroy?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const copy = COPY[state]

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <motion.div
        key={state}
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
        className="flex flex-col items-center gap-3"
        role="status"
        aria-live="polite"
      >
        {(state === 'loading' || state === 'confirming') && (
          <span
            aria-hidden="true"
            className="h-8 w-8 animate-spin rounded-full border-2 border-vantage-border border-t-vantage-accent"
          />
        )}
        {copy && (
          <div>
            <p className="text-base font-medium text-vantage-text">{copy.title}</p>
            <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-vantage-textDim">{copy.body}</p>
          </div>
        )}
      </motion.div>

      {(state === 'cancelled' || state === 'failed' || state === 'error') && (
        <button
          type="button"
          onClick={start}
          className="flex min-h-[48px] items-center rounded-full bg-vantage-accent px-6 text-base font-semibold text-vantage-ctaText transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vantage-accent"
        >
          Try again
        </button>
      )}

      {state === 'open' && (
        <button
          type="button"
          onClick={() => clientRef.current?.open?.()}
          className="flex min-h-[48px] items-center rounded-full border border-vantage-border px-6 text-base font-medium text-vantage-text transition-colors hover:border-vantage-accent hover:text-vantage-accent"
        >
          Reopen verification window
        </button>
      )}
    </div>
  )
}
