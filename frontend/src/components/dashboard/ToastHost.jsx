import { useEffect } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useParlays } from '../../context/ParlayContext.jsx'

/** Single subtle confirmation toast, driven by ParlayContext. Auto-dismisses;
 *  its action (if any) only ever navigates when the user explicitly clicks it. */
export default function ToastHost() {
  const { toast, dismissToast } = useParlays()
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(dismissToast, 5000)
    return () => clearTimeout(timer)
  }, [toast, dismissToast])

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center lg:pl-[288px]">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
            role="status"
            aria-live="polite"
            className="pointer-events-auto flex min-h-[56px] items-center gap-5 rounded-full border border-vantage-border bg-vantage-surfaceAlt px-6 py-2.5 text-sm text-vantage-text shadow-lg shadow-black/40"
          >
            <span>{toast.message}</span>
            {toast.actionLabel && (
              <button
                type="button"
                onClick={() => {
                  toast.onAction?.()
                  dismissToast()
                }}
                className="font-semibold text-vantage-accent transition-opacity hover:opacity-80"
              >
                {toast.actionLabel}
              </button>
            )}
            <button
              type="button"
              onClick={dismissToast}
              aria-label="Dismiss"
              className="flex h-6 w-6 items-center justify-center text-vantage-textDim transition-colors hover:text-vantage-text"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
