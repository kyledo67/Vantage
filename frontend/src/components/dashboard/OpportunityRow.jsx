import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Chevron, PlaceholderIcon, PlatformBadge, PositiveValue, Skeleton } from './atoms.jsx'
import ValueFlash from '../../motion/ValueFlash.jsx'
import { DURATION, EASE, PRESS_ROW } from '../../motion/tokens.js'

// Column template shared by the header and every row so they stay aligned.
// Widened proportionally for the larger type scale, and the trailing column
// now matches the 56px chevron button so it's never clipped.
export const COLUMNS =
  'grid grid-cols-[2fr_1.1fr_0.9fr_0.85fr_0.9fr_0.8fr_56px] items-center gap-5'

/** Detail panel — each block is skipped entirely when its data is absent. */
function ExpandedPanel({ detail, status, onMethodology }) {
  if (status === 'loading' || status === 'idle') {
    return (
      <div className="flex flex-col gap-4 px-5 pb-5" aria-busy="true">
        <Skeleton className="h-3 w-40" />
        <div className="flex gap-2.5">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 flex-1 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <p className="px-5 pb-5 text-xs text-vantage-textDim">
        Couldn&apos;t load the details for this market.
      </p>
    )
  }

  if (!detail) return null

  const { sources, signal, stats } = detail
  const hasAnything = sources?.length || signal || stats?.length
  if (!hasAnything) return null

  return (
    <div className="flex flex-col gap-5 px-5 pb-5">
      {sources?.length > 0 && (
        <div>
          <p className="mb-2.5 text-sm uppercase tracking-wide text-vantage-alert">
            Market prices
          </p>
          <div className="no-scrollbar flex gap-4 overflow-x-auto">
            {sources.map((source) => (
              <div
                key={source.id ?? source.name}
                className="min-w-[11rem] flex-shrink-0 rounded-lg border border-vantage-border bg-vantage-surface p-5"
              >
                <div className="flex items-center gap-2.5">
                  {source.iconUrl ? (
                    <img src={source.iconUrl} alt="" className="h-[18px] w-[18px] rounded-sm object-cover" />
                  ) : (
                    <PlaceholderIcon name={source.name} className="h-[18px] w-[18px]" />
                  )}
                  {source.name && (
                    <span className="truncate text-xs text-vantage-textDim">{source.name}</span>
                  )}
                </div>
                {source.priceLabel && (
                  <p className="mt-2 text-lg font-semibold leading-none text-vantage-text">
                    {source.priceLabel}
                  </p>
                )}
                {source.otherPriceLabel && (
                  <p className="mt-1.5 text-xs text-vantage-textDim">
                    {source.otherName && <span className="truncate">{source.otherName} </span>}
                    <span className="font-medium text-vantage-text">{source.otherPriceLabel}</span>
                  </p>
                )}
                {source.subLabel && (
                  <p className="mt-1.5 text-xs text-vantage-textDim">{source.subLabel}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {signal && (
        <div>
          <div className="flex items-center justify-between text-xs text-vantage-textDim">
            {signal.leftLabel && <span>{signal.leftLabel}</span>}
            {signal.rightLabel && (
              <span className="text-vantage-alert">{signal.rightLabel}</span>
            )}
          </div>
          {typeof signal.percent === 'number' && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-vantage-raised">
              <motion.div
                className="h-full rounded-full bg-vantage-hero"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(0, Math.min(100, signal.percent))}%` }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              />
            </div>
          )}
        </div>
      )}

      {stats?.length > 0 && (
        <div className="flex flex-wrap gap-x-8 gap-y-2.5">
          {stats.map((stat) => (
            <span key={stat.label} className="text-xs text-vantage-textDim">
              {stat.label}{' '}
              <span
                className={
                  stat.isPositive === true
                    ? 'font-medium text-vantage-positive'
                    : 'font-medium text-vantage-text'
                }
              >
                {stat.value}
              </span>
            </span>
          ))}
        </div>
      )}

      {onMethodology && (
        <button
          type="button"
          onClick={onMethodology}
          className="flex min-h-[56px] items-center self-start text-sm font-medium text-vantage-alert transition-colors hover:text-vantage-accent"
        >
          How this is calculated →
        </button>
      )}
    </div>
  )
}

export default function OpportunityRow({
  opportunity,
  expanded,
  onToggle,
  detail,
  detailStatus,
  selected,
  onSelect,
}) {
  const navigate = useNavigate()
  const { selection, market, platform, price, consensus, ev, evaluation } = opportunity
  const hitChance = evaluation?.hitProbabilityLabel || consensus?.label

  const handleMethodology = () => {
    navigate('/methodology', {
      state: {
        opportunity: {
          title: selection?.title,
          subtitle: selection?.subtitle,
          platform: platform?.name,
          price: price?.label,
          ev: ev?.label,
        },
        backTo: '/ev-finder',
        backLabel: 'Back to opportunity',
      },
    })
  }

  return (
    <motion.div
      // Press feedback only — rows never animate continuously.
      whileTap={PRESS_ROW}
      className={`relative border-b border-vantage-border/60 transition-colors duration-200 last:border-b-0 active:bg-vantage-raised ${
        expanded
          ? 'bg-vantage-raised'
          : selected
            ? 'bg-vantage-accent/10 hover:bg-vantage-accent/15'
            : 'hover:bg-vantage-surfaceAlt/60'
      }`}
    >
      {/* 3px accent that wipes in top-to-bottom on the selected row */}
      <AnimatePresence>
        {(expanded || selected) && (
          <motion.span
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            exit={{ scaleY: 0 }}
            transition={{ duration: DURATION.interaction, ease: EASE.out }}
            style={{ originY: 0 }}
            className="absolute inset-y-0 left-0 w-[3px] bg-vantage-accent"
          />
        )}
      </AnimatePresence>

      {/* Desktop row */}
      <div className={`${COLUMNS} hidden min-h-[100px] px-5 py-5 lg:grid`} role="row">
        <div className="flex min-w-0 items-center gap-4" role="cell">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(opportunity.id)}
            aria-label={selection?.title ? `Select ${selection.title}` : 'Select opportunity'}
            className="h-6 w-6 flex-shrink-0 accent-[#CE63E9]"
          />
          {selection?.avatarUrl && (
            <img
              src={selection.avatarUrl}
              alt=""
              className="h-12 w-12 flex-shrink-0 rounded-full object-cover"
            />
          )}
          <div className="min-w-0">
            {selection?.title && (
              <p className="truncate text-base font-medium leading-tight text-vantage-text">
                {selection.title}
              </p>
            )}
            <div className="mt-1.5 flex items-center gap-2">
              {selection?.subtitle && (
                <p className="truncate text-sm text-vantage-textDim">{selection.subtitle}</p>
              )}
              {selection?.tags?.map((tag) => (
                <span
                  key={tag}
                  className="flex-shrink-0 rounded bg-vantage-surfaceAlt px-2 py-0.5 text-xs uppercase text-vantage-textDim"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="min-w-0" role="cell">
          {market?.title && (
            <p className="truncate text-sm text-vantage-text">{market.title}</p>
          )}
          {market?.subtitle && (
            <p className="mt-0.5 truncate text-xs text-vantage-textDim">{market.subtitle}</p>
          )}
        </div>

        <div className="min-w-0" role="cell">
          <PlatformBadge platform={platform} />
        </div>

        {/* Cells flash briefly when the backend sends a changed value. */}
        <div className="min-w-0" role="cell">
          {price?.label && (
            <ValueFlash value={price.label} className="text-lg font-medium text-vantage-text">
              {price.label}
            </ValueFlash>
          )}
          {price?.otherLabel && (
            <p className="mt-0.5 truncate text-xs text-vantage-textDim">
              {price.otherName ? `${price.otherName} ` : ''}
              {price.otherLabel}
            </p>
          )}
        </div>

        <div role="cell">
          {hitChance && (
            <ValueFlash value={hitChance} className="text-lg font-semibold text-vantage-positive">
              {hitChance}
            </ValueFlash>
          )}
        </div>

        <div role="cell">
          {ev?.label && (
            <ValueFlash value={ev.label} isPositive={ev.isPositive}>
              <PositiveValue value={ev} className="text-lg" />
            </ValueFlash>
          )}
        </div>

        <button
          type="button"
          onClick={() => onToggle(opportunity.id)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse details' : 'Expand details'}
          className="flex h-14 w-14 items-center justify-center rounded-md hover:bg-vantage-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-vantage-accent"
        >
          <Chevron open={expanded} />
        </button>
      </div>

      {/* Mobile card */}
      <button
        type="button"
        onClick={() => onToggle(opportunity.id)}
        aria-expanded={expanded}
        className="flex min-h-[100px] w-full flex-col gap-2.5 px-5 py-5 text-left lg:hidden"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {selection?.title && (
              <p className="truncate text-base font-medium leading-tight text-vantage-text">
                {selection.title}
              </p>
            )}
            {selection?.subtitle && (
              <p className="mt-0.5 truncate text-sm text-vantage-textDim">{selection.subtitle}</p>
            )}
          </div>
          <PositiveValue value={ev} className="text-lg" />
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-vantage-textDim">
          <PlatformBadge platform={platform} />
          {price?.label && <span className="text-lg text-vantage-text">{price.label}</span>}
          {price?.otherLabel && (
            <span>
              {price.otherName ? `${price.otherName} ` : ''}
              {price.otherLabel}
            </span>
          )}
          {hitChance && <span>Est. hit {hitChance}</span>}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="panel"
            // Height only — deliberately no opacity animation. Content visibility
            // must never depend on an animation finishing; if the accelerated
            // opacity path stalls, the panel would render blank.
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: DURATION.expand, ease: EASE.out }}
            className="overflow-hidden"
          >
            {/* Content fade uses a CSS keyframe whose resting state is visible,
                so a skipped animation can never leave the panel blank. */}
            <div className="animate-detail-in">
              <ExpandedPanel detail={detail} status={detailStatus} onMethodology={handleMethodology} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
