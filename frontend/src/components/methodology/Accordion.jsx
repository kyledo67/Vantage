import { useId } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { DURATION, EASE } from '../../motion/tokens.js'

/**
 * Minimal controlled disclosure with a smooth height animation — used for
 * both the formula disclosure and every glossary entry, so expand/collapse
 * reads consistently across the page. Closed by default wherever it's used.
 */
export default function Accordion({ open, onToggle, trigger, children, className = '' }) {
  const panelId = useId()
  return (
    <div className={className}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        {trigger}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DURATION.expand, ease: EASE.out }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
