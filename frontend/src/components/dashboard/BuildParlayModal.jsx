import { useMemo } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  computeEstimatedChance,
  computeEstimatedEdge,
  findDuplicateEventGroups,
} from '../../utils/parlay.js'

function SelectedItem({ opportunity, onRemove }) {
  const { selection, market, platform, price, ev } = opportunity
  return (
    <li className="flex items-start justify-between gap-3 border-b border-vantage-border/60 px-5 py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        {selection?.title && (
          <p className="truncate text-sm font-medium text-vantage-text">{selection.title}</p>
        )}
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-vantage-textDim">
          {selection?.subtitle && <span className="truncate">{selection.subtitle}</span>}
          {market?.title && <span>{market.title}</span>}
          {platform?.name && <span>{platform.name}</span>}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs">
          {price?.label && <span className="font-medium text-vantage-text">{price.label}</span>}
          {ev?.label && <span className="text-vantage-positive">{ev.label} EV</span>}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onRemove(opportunity.id)}
        aria-label={selection?.title ? `Remove ${selection.title}` : 'Remove selection'}
        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-vantage-textDim transition-colors hover:bg-vantage-surface hover:text-vantage-text"
      >
        ✕
      </button>
    </li>
  )
}

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

/**
 * Assembles a hypothetical parlay from opportunities already selected on the
 * Opportunities page. Nothing here calls an API, places a trade, or invents
 * a field the selected opportunities didn't already have.
 */
export default function BuildParlayModal({ open, onClose, selections, onRemove, onClearAll, onSave }) {
  const reduceMotion = useReducedMotion()
  const edge = useMemo(() => computeEstimatedEdge(selections), [selections])
  const chance = useMemo(() => computeEstimatedChance(selections), [selections])
  const conflictGroups = useMemo(() => findDuplicateEventGroups(selections), [selections])
  const hasConflict = conflictGroups.length > 0
  const canSave = selections.length > 0 && !hasConflict

  const handleSave = () => {
    if (!canSave) return
    onSave({
      id: `parlay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: 'Untitled parlay',
      createdAt: new Date().toISOString(),
      selections,
      estimatedEdge: edge,
      estimatedChance: chance,
    })
  }

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
              aria-labelledby="build-parlay-title"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 32 }}
              transition={{ duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
              onClick={(event) => event.stopPropagation()}
              className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-vantage-border bg-vantage-surface sm:rounded-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-vantage-border px-5 py-4">
                <div>
                  <h2 id="build-parlay-title" className="text-base font-semibold text-vantage-text">
                    Build hypothetical parlay
                  </h2>
                  <p className="mt-1 text-xs text-vantage-textDim">
                    Review your selected opportunities before saving this analysis.
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
                {selections.length > 0 && (
                  <div className="flex items-center justify-between px-5 pt-3">
                    <span className="text-[11px] uppercase tracking-wide text-vantage-textDim">
                      Selected ({selections.length})
                    </span>
                    <button
                      type="button"
                      onClick={onClearAll}
                      className="text-xs font-medium text-vantage-textDim transition-colors hover:text-vantage-text"
                    >
                      Clear all
                    </button>
                  </div>
                )}

                {selections.length === 0 ? (
                  <p className="px-5 py-10 text-center text-sm text-vantage-textDim">
                    No opportunities selected.
                  </p>
                ) : (
                  <ul className="mt-2">
                    {selections.map((opportunity) => (
                      <SelectedItem key={opportunity.id} opportunity={opportunity} onRemove={onRemove} />
                    ))}
                  </ul>
                )}

                {selections.length === 1 && (
                  <p className="mx-5 mt-3 rounded-lg border border-vantage-border bg-vantage-surfaceAlt px-3 py-2.5 text-[11px] leading-relaxed text-vantage-textDim">
                    Save this as a straight-position analysis, or add more opportunities from the
                    table to analyze them together as a parlay.
                  </p>
                )}

                <div className="mx-5 my-4 rounded-xl bg-vantage-raised p-4">
                  <dl className="grid grid-cols-3 gap-3">
                    <Metric label="Estimated Edge" value={edge} positive />
                    <Metric label="Estimated Chance" value={chance} positive />
                    <Metric label="Selections" value={String(selections.length)} />
                  </dl>

                  <p className="mt-4 text-[11px] leading-relaxed text-vantage-textDim">
                    This is a hypothetical market analysis. It does not place a trade or guarantee
                    an outcome.
                  </p>

                  {selections.length >= 2 && !hasConflict && (
                    <p className="mt-2 text-[11px] leading-relaxed text-vantage-textDim">
                      Cross-game selections only. Same-game correlation is not modeled.
                    </p>
                  )}

                  {hasConflict && (
                    <p className="mt-2 text-[11px] font-medium leading-relaxed text-vantage-danger">
                      Correlation not modeled. Remove one selection from &ldquo;
                      {conflictGroups[0].eventName}&rdquo; to continue.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-vantage-border px-5 py-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-vantage-border px-4 py-2 text-xs font-medium text-vantage-text transition-colors hover:border-vantage-borderLight"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!canSave}
                  className="rounded-full bg-vantage-accent px-4 py-2 text-xs font-semibold text-vantage-ctaText transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Save to My Parlays
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
