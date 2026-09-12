import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

/** Sticky compact tray — appears only once at least one opportunity is
 *  selected, and never claims to place anything: it only opens the builder. */
export default function SelectionTray({ count, onClear, onBuild }) {
  const reduceMotion = useReducedMotion()

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
          className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-5 pb-5 lg:pl-[288px]"
        >
          <div className="flex w-full max-w-xl items-center justify-between gap-5 rounded-xl border border-vantage-border bg-vantage-surfaceAlt/95 px-6 py-4 shadow-lg shadow-black/40 backdrop-blur">
            <span className="text-base font-medium text-vantage-text">
              {count} {count === 1 ? 'selection' : 'selections'}
            </span>
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={onClear}
                className="flex min-h-[56px] items-center text-base font-medium text-vantage-textDim transition-colors hover:text-vantage-text"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={onBuild}
                className="flex min-h-[62px] items-center rounded-full bg-vantage-accent px-8 text-base font-semibold text-vantage-ctaText transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vantage-accent"
              >
                Build parlay
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
