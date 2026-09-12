import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DURATION, EASE, PRESS_BUTTON } from './tokens.js'

/**
 * Toasts report the outcome of real actions (an alert created, a removal that
 * failed). They never announce market data. Non-critical toasts auto-dismiss;
 * `tone: 'critical'` stays until dismissed.
 */
const ToastContext = createContext(null)

const TONE = {
  neutral: 'border-vantage-accentEnd/40 bg-vantage-raised text-vantage-text',
  positive: 'border-vantage-positive/40 bg-vantage-raised text-vantage-text',
  critical: 'border-vantage-danger/50 bg-vantage-raised text-vantage-text',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const notify = useCallback(
    ({ title, description, tone = 'neutral', timeout = 5000 }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      setToasts((current) => [...current, { id, title, description, tone }])
      if (tone !== 'critical' && timeout) {
        setTimeout(() => dismiss(id), timeout)
      }
      return id
    },
    [dismiss]
  )

  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed right-4 top-[84px] z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
        role="region"
        aria-label="Notifications"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: DURATION.nav, ease: EASE.out }}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-3.5 py-3 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.9)] ${
                TONE[toast.tone] ?? TONE.neutral
              }`}
            >
              <div className="min-w-0 flex-1">
                {toast.title && <p className="text-xs font-medium">{toast.title}</p>}
                {toast.description && (
                  <p className="mt-0.5 text-[11px] text-vantage-textDim">{toast.description}</p>
                )}
              </div>
              <motion.button
                type="button"
                whileTap={PRESS_BUTTON}
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                className="-mr-1 -mt-1 rounded p-1 text-vantage-textDim transition-colors hover:text-vantage-text"
              >
                <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
                  <path
                    d="M2.5 2.5l7 7M9.5 2.5l-7 7"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </motion.button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
