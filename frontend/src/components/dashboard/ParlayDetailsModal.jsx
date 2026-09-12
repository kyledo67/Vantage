import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

function Metric({ label, value, positive }) {
  const unavailable = !value
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-vantage-alert">{label}</dt>
      <dd
        className={`mt-1 text-lg font-semibold ${
          unavailable ? 'text-vantage-textDim' : positive ? 'text-vantage-positive' : 'text-vantage-text'
        }`}
      >
        {value ?? 'Unavailable'}
      </dd>
    </div>
  )
}

/** Read-only view of a saved parlay — no remove/save actions, just the
 *  selections and summary as they were captured at save time. */
export default function ParlayDetailsModal({ parlay, onClose }) {
  const reduceMotion = useReducedMotion()
  const open = Boolean(parlay)

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60"
          />
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="parlay-details-title"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 32 }}
              transition={{ duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
              onClick={(event) => event.stopPropagation()}
              className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-vantage-border bg-vantage-surface sm:rounded-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-vantage-border px-5 py-4">
                <div>
                  <h2 id="parlay-details-title" className="text-base font-semibold text-vantage-text">
                    {parlay?.name || 'Untitled parlay'}
                  </h2>
                  <p className="mt-1 text-xs text-vantage-textDim">
                    Saved hypothetical analysis — read only.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-vantage-textDim transition-colors hover:bg-vantage-surfaceAlt hover:text-vantage-text"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <ul className="mt-2">
                  {parlay?.selections?.map((opportunity) => (
                    <li
                      key={opportunity.id}
                      className="border-b border-vantage-border/60 px-5 py-3 last:border-b-0"
                    >
                      {opportunity.selection?.title && (
                        <p className="truncate text-sm font-medium text-vantage-text">
                          {opportunity.selection.title}
                        </p>
                      )}
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-vantage-textDim">
                        {opportunity.selection?.subtitle && (
                          <span className="truncate">{opportunity.selection.subtitle}</span>
                        )}
                        {opportunity.market?.title && <span>{opportunity.market.title}</span>}
                        {opportunity.platform?.name && <span>{opportunity.platform.name}</span>}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs">
                        {opportunity.price?.label && (
                          <span className="font-medium text-vantage-text">{opportunity.price.label}</span>
                        )}
                        {opportunity.ev?.label && (
                          <span className="text-vantage-positive">{opportunity.ev.label} EV</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="mx-5 my-4 rounded-xl bg-vantage-raised p-4">
                  <dl className="grid grid-cols-3 gap-3">
                    <Metric label="Estimated Edge" value={parlay?.estimatedEdge} positive />
                    <Metric label="Estimated Chance" value={parlay?.estimatedChance} positive />
                    <Metric label="Selections" value={String(parlay?.selections?.length ?? 0)} />
                  </dl>
                  <p className="mt-4 text-[11px] leading-relaxed text-vantage-textDim">
                    This is a hypothetical market analysis. It does not place a trade or guarantee
                    an outcome.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end border-t border-vantage-border px-5 py-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-vantage-border px-4 py-2 text-xs font-medium text-vantage-text transition-colors hover:border-vantage-borderLight"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
