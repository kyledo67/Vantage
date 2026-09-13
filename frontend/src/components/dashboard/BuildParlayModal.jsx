import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  computeEstimatedChance,
  computeEstimatedEdge,
  computeParlaySizing,
  findDuplicateEventGroups,
  getMarketHandoffUrl,
} from '../../utils/parlay.js'

function SelectedItem({ opportunity, onRemove }) {
  const { selection, market, platform, price, ev } = opportunity
  const marketUrl = getMarketHandoffUrl(opportunity)
  return (
    <li className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-vantage-border/60 bg-vantage-surfaceAlt/40 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        {selection?.title && (
          <p className="truncate text-sm font-medium leading-tight text-vantage-text">
            {selection.title}
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-vantage-textDim">
          {selection?.subtitle && <span className="truncate">{selection.subtitle}</span>}
          {market?.title && <span>{market.title}</span>}
          {platform?.name && <span>{platform.name}</span>}
          {price?.label && <span className="font-medium text-vantage-text">{price.label}</span>}
          {ev?.label && <span className="text-vantage-positive">{ev.label} EV</span>}
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-1">
        {marketUrl && (
          <a
            href={marketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-9 items-center rounded-full border border-vantage-border px-3 text-xs font-semibold text-vantage-text transition-colors hover:border-vantage-accent hover:text-vantage-accent"
          >
            Open market ↗
          </a>
        )}
        <button
          type="button"
          onClick={() => onRemove(opportunity.id)}
          aria-label={selection?.title ? `Remove ${selection.title}` : 'Remove selection'}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md text-vantage-textDim transition-colors hover:bg-vantage-surface hover:text-vantage-text"
        >
          ✕
        </button>
      </div>
    </li>
  )
}

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

function money(amount, signed = false) {
  if (!Number.isFinite(amount)) return 'Unavailable'
  return `${signed ? '+' : ''}$${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function StakeSlider({ sizing, value, onChange }) {
  const recommended = Number(sizing?.recommendedAmount)
  const maximum = Math.max(recommended, Number(sizing?.maximumAmount))
  const isValidRange = Number.isFinite(recommended) && recommended > 0 && Number.isFinite(maximum)
  const stake = isValidRange
    ? Math.min(maximum, Math.max(recommended, Number(value) || recommended))
    : 0
  const range = maximum - recommended
  const progress = isValidRange && range > 0 ? ((stake - recommended) / range) * 100 : 0
  const profitMultiple = Math.max(0, Number(sizing.combinedDecimalOdds) - 1)
  const profitIfWin = Math.floor(stake * profitMultiple * 100 + Number.EPSILON) / 100
  const profitTransform = progress < 8 ? 'translateX(0)' : progress > 92 ? 'translateX(-100%)' : 'translateX(-50%)'
  const [typedAmount, setTypedAmount] = useState('')

  useEffect(() => {
    if (isValidRange) setTypedAmount(stake.toFixed(2))
  }, [isValidRange, stake])

  if (!isValidRange) return null

  const clampStake = (amount) => Math.min(maximum, Math.max(recommended, amount))
  const handleTypedAmount = (event) => {
    const next = event.target.value
    setTypedAmount(next)
    const amount = Number(next)
    if (next !== '' && Number.isFinite(amount)) onChange(clampStake(amount))
  }
  const commitTypedAmount = () => {
    const amount = Number(typedAmount)
    const next = Number.isFinite(amount) ? clampStake(amount) : stake
    onChange(next)
    setTypedAmount(next.toFixed(2))
  }

  return (
    <section className="border-t border-vantage-border px-5 py-4" aria-label="Choose parlay stake">
      <div className="relative pt-9">
        <p
          className="pointer-events-none absolute top-0 whitespace-nowrap text-sm font-semibold text-vantage-positive"
          style={{ left: `${progress}%`, transform: profitTransform }}
        >
          Bet {money(stake)} · {money(profitIfWin, true)} if parlay wins
        </p>
        <input
          type="range"
          min={recommended}
          max={maximum}
          step="0.01"
          value={stake}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-label="Parlay stake"
          aria-valuetext={`${money(stake)} stake; ${money(profitIfWin, true)} profit if the parlay wins`}
          className="h-7 w-full cursor-pointer accent-vantage-accent disabled:cursor-default"
          disabled={range <= 0}
        />
      </div>
      <div className="mt-1 flex justify-between gap-4 text-xs text-vantage-textDim">
        <span>Recommended bet {money(recommended)}</span>
        <span>Max bet {money(maximum)}</span>
      </div>
      <label className="mt-3 flex items-center justify-between gap-3 text-sm text-vantage-textDim">
        <span>Bet amount</span>
        <div className="flex items-center overflow-hidden rounded-md border border-vantage-border bg-vantage-surfaceAlt focus-within:border-vantage-accent">
          <span className="px-2 text-vantage-textDim">$</span>
          <input
            type="number"
            min={recommended}
            max={maximum}
            step="0.01"
            inputMode="decimal"
            value={typedAmount}
            onChange={handleTypedAmount}
            onBlur={commitTypedAmount}
            aria-label="Type parlay stake amount"
            className="h-9 w-28 bg-transparent pr-2 text-right font-medium text-vantage-text outline-none"
          />
        </div>
      </label>
    </section>
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
  const sizing = useMemo(() => computeParlaySizing(selections), [selections])
  const conflictGroups = useMemo(() => findDuplicateEventGroups(selections), [selections])
  const [stake, setStake] = useState(null)
  const hasConflict = conflictGroups.length > 0
  const canSave = selections.length > 0 && !hasConflict

  useEffect(() => {
    setStake(sizing?.recommendedAmount ?? null)
  }, [open, sizing?.recommendedAmount, sizing?.maximumAmount])

  const selectedSizing = useMemo(() => {
    if (!sizing || !Number.isFinite(Number(stake))) return sizing

    const selectedAmount = Math.min(
      Number(sizing.maximumAmount),
      Math.max(Number(sizing.recommendedAmount), Number(stake))
    )
    const profitMultiple = Math.max(0, Number(sizing.combinedDecimalOdds) - 1)
    const profitIfWin = Math.floor(selectedAmount * profitMultiple * 100 + Number.EPSILON) / 100
    const totalPayout = Math.floor(selectedAmount * Number(sizing.combinedDecimalOdds) * 100 + Number.EPSILON) / 100

    return {
      ...sizing,
      selectedAmount,
      selectedAmountLabel: money(selectedAmount),
      profitIfWin,
      profitIfWinLabel: money(profitIfWin, true),
      totalPayout,
      totalPayoutLabel: money(totalPayout),
    }
  }, [sizing, stake])

  const handleSave = () => {
    if (!canSave) return
    onSave({
      id: `parlay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: 'Untitled parlay',
      createdAt: new Date().toISOString(),
      selections,
      estimatedEdge: edge,
      estimatedChance: chance,
      positionSizing: selectedSizing,
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
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-3 py-3 sm:items-center">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="build-parlay-title"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 32 }}
              transition={{ duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
              onClick={(event) => event.stopPropagation()}
              className="flex w-full max-w-3xl flex-col rounded-2xl border border-vantage-border bg-vantage-surface"
            >
              <div className="flex items-start justify-between gap-5 border-b border-vantage-border px-5 py-4">
                <div>
                  <h2 id="build-parlay-title" className="text-2xl font-semibold text-vantage-text">
                    Build hypothetical parlay
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-vantage-textDim">
                    Review your selected opportunities before saving this analysis.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md text-vantage-textDim transition-colors hover:bg-vantage-surfaceAlt hover:text-vantage-text"
                >
                  ✕
                </button>
              </div>

              <div>
                {selections.length > 0 && (
                  <div className="flex items-center justify-between px-5 pt-3">
                    <span className="text-sm uppercase tracking-wide text-vantage-textDim">
                      Selected ({selections.length})
                    </span>
                    <button
                      type="button"
                      onClick={onClearAll}
                      className="flex min-h-9 items-center text-sm font-medium text-vantage-textDim transition-colors hover:text-vantage-text"
                    >
                      Clear all
                    </button>
                  </div>
                )}

                {selections.length === 0 ? (
                  <p className="px-5 py-8 text-center text-base text-vantage-textDim">
                    No opportunities selected.
                  </p>
                ) : (
                  <ul className="mx-5 mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {selections.map((opportunity) => (
                      <SelectedItem key={opportunity.id} opportunity={opportunity} onRemove={onRemove} />
                    ))}
                  </ul>
                )}

                <div className="mx-5 my-3 rounded-xl bg-vantage-raised p-4">
                  <dl className="grid grid-cols-2 gap-5 sm:grid-cols-3">
                    <Metric label="Recommended" value={sizing?.recommendedAmountLabel} />
                    <Metric label="Maximum allowed" value={sizing?.maximumAmountLabel} />
                    <Metric label="Combined odds" value={sizing?.combinedOddsLabel} />
                    <Metric label="Chance all legs win" value={sizing?.combinedProbabilityLabel ?? chance} />
                    <Metric label="Estimated EV" value={sizing?.netEvLabel ?? edge} positive />
                    <Metric label="Selections" value={String(selections.length)} />
                  </dl>

                  {hasConflict && (
                    <p className="mt-2.5 text-sm font-medium leading-relaxed text-vantage-danger">
                      Correlation not modeled. Remove one selection from &ldquo;
                      {conflictGroups[0].eventName}&rdquo; to continue.
                    </p>
                  )}
                </div>
              </div>

              {selections.length > 0 && !hasConflict && (
                <StakeSlider sizing={sizing} value={stake} onChange={setStake} />
              )}

              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-vantage-border px-5 py-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex min-h-11 items-center rounded-full border border-vantage-border px-5 text-sm font-medium text-vantage-text transition-colors hover:border-vantage-borderLight"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!canSave}
                  className="flex min-h-11 items-center rounded-full border border-vantage-border px-5 text-sm font-medium text-vantage-text transition-colors hover:border-vantage-borderLight disabled:cursor-not-allowed disabled:opacity-40"
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
