import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

function Metric({ label, value, positive }) {
  const unavailable = !value
  return (
    <div>
      <dt className="text-sm uppercase tracking-wide text-vantage-alert">{label}</dt>
      <dd
        className={`mt-2 text-lg font-semibold ${
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
              className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-vantage-border bg-vantage-surface sm:rounded-2xl"
            >
              <div className="flex items-start justify-between gap-5 border-b border-vantage-border px-6 py-6">
                <div>
                  <h2 id="parlay-details-title" className="text-4xl font-semibold text-vantage-text">
                    {parlay?.name || 'Untitled parlay'}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-vantage-textDim">
                    Saved hypothetical analysis — read only.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-md text-vantage-textDim transition-colors hover:bg-vantage-surfaceAlt hover:text-vantage-text"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <ul className="mt-2.5">
                  {parlay?.selections?.map((opportunity) => (
                    <li
                      key={opportunity.id}
                      className="border-b border-vantage-border/60 px-6 py-5 last:border-b-0"
                    >
                      {opportunity.selection?.title && (
                        <p className="truncate text-base font-medium leading-tight text-vantage-text">
                          {opportunity.selection.title}
                        </p>
                      )}
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-vantage-textDim">
                        {opportunity.selection?.subtitle && (
                          <span className="truncate">{opportunity.selection.subtitle}</span>
                        )}
                        {opportunity.market?.title && <span>{opportunity.market.title}</span>}
                        {opportunity.platform?.name && <span>{opportunity.platform.name}</span>}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 text-sm">
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

                <div className="mx-6 my-5 rounded-xl bg-vantage-raised p-6">
                  <dl className="grid grid-cols-3 gap-5">
                    <Metric label="Estimated Edge" value={parlay?.estimatedEdge} positive />
                    <Metric label="Estimated Chance" value={parlay?.estimatedChance} positive />
                    <Metric label="Selections" value={String(parlay?.selections?.length ?? 0)} />
                  </dl>
                  <p className="mt-5 text-sm leading-relaxed text-vantage-textDim">
                    This is a hypothetical market analysis. It does not place a trade or guarantee
                    an outcome.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end border-t border-vantage-border px-6 py-5">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex min-h-[56px] items-center rounded-full border border-vantage-border px-6 text-base font-medium text-vantage-text transition-colors hover:border-vantage-borderLight"
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
