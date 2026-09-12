import { motion, AnimatePresence } from 'framer-motion'
import { Chevron, PlaceholderIcon, PlatformBadge, PositiveValue, Skeleton } from './atoms.jsx'

// Column template shared by the header and every row so they stay aligned.
export const COLUMNS =
  'grid grid-cols-[1.9fr_1.1fr_0.85fr_0.7fr_0.8fr_0.7fr_28px] items-center gap-3'

/** Detail panel — each block is skipped entirely when its data is absent. */
function ExpandedPanel({ detail, status }) {
  if (status === 'loading' || status === 'idle') {
    return (
      <div className="flex flex-col gap-3 px-4 pb-4" aria-busy="true">
        <Skeleton className="h-3 w-40" />
        <div className="flex gap-2">
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
      <p className="px-4 pb-4 text-xs text-vantage-textDim">
        Couldn&apos;t load the details for this market.
      </p>
    )
  }

  if (!detail) return null

  const { sources, signal, stats } = detail
  const hasAnything = sources?.length || signal || stats?.length
  if (!hasAnything) return null

  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      {sources?.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] uppercase tracking-wide text-vantage-alert">
            Market prices
          </p>
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {sources.map((source) => (
              <div
                key={source.id ?? source.name}
                className="min-w-[8.5rem] flex-shrink-0 rounded-lg border border-vantage-border bg-vantage-surface p-3"
              >
                <div className="flex items-center gap-1.5">
                  {source.iconUrl ? (
                    <img src={source.iconUrl} alt="" className="h-3.5 w-3.5 rounded-sm object-cover" />
                  ) : (
                    <PlaceholderIcon name={source.name} className="h-3.5 w-3.5" />
                  )}
                  {source.name && (
                    <span className="truncate text-[11px] text-vantage-textDim">{source.name}</span>
                  )}
                </div>
                {source.priceLabel && (
                  <p className="mt-1.5 text-lg font-semibold leading-none text-vantage-text">
                    {source.priceLabel}
                  </p>
                )}
                {source.otherPriceLabel && (
                  <p className="mt-1 text-[11px] text-vantage-textDim">
                    {source.otherName && <span className="truncate">{source.otherName} </span>}
                    <span className="font-medium text-vantage-text">{source.otherPriceLabel}</span>
                  </p>
                )}
                {source.subLabel && (
                  <p className="mt-1 text-[10px] text-vantage-textDim">{source.subLabel}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {signal && (
        <div>
          <div className="flex items-center justify-between text-[11px] text-vantage-textDim">
            {signal.leftLabel && <span>{signal.leftLabel}</span>}
            {signal.rightLabel && (
              <span className="text-vantage-alert">{signal.rightLabel}</span>
            )}
          </div>
          {typeof signal.percent === 'number' && (
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-vantage-raised">
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
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {stats.map((stat) => (
            <span key={stat.label} className="text-[11px] text-vantage-textDim">
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
  const { selection, market, platform, price, consensus, ev, evaluation } = opportunity
  const hitChance = evaluation?.hitProbabilityLabel || consensus?.label

  return (
    <div
      className={`border-b border-vantage-border/60 transition-colors duration-200 last:border-b-0 ${
        expanded
          ? 'bg-vantage-raised'
          : selected
            ? 'bg-vantage-accent/10 hover:bg-vantage-accent/15'
            : 'hover:bg-vantage-surfaceAlt/60'
      }`}
    >
      {/* Desktop row */}
      <div className={`${COLUMNS} hidden px-4 py-3 md:grid`} role="row">
        <div className="flex min-w-0 items-center gap-2.5" role="cell">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(opportunity.id)}
            aria-label={selection?.title ? `Select ${selection.title}` : 'Select opportunity'}
            className="h-3.5 w-3.5 flex-shrink-0 accent-[#CE63E9]"
          />
          {selection?.avatarUrl && (
            <img
              src={selection.avatarUrl}
              alt=""
              className="h-7 w-7 flex-shrink-0 rounded-full object-cover"
            />
          )}
          <div className="min-w-0">
            {selection?.title && (
              <p className="truncate text-sm font-medium text-vantage-text">{selection.title}</p>
            )}
            <div className="flex items-center gap-1.5">
              {selection?.subtitle && (
                <p className="truncate text-xs text-vantage-textDim">{selection.subtitle}</p>
              )}
              {selection?.tags?.map((tag) => (
                <span
                  key={tag}
                  className="flex-shrink-0 rounded bg-vantage-surfaceAlt px-1.5 py-0.5 text-[9px] uppercase text-vantage-textDim"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="min-w-0" role="cell">
          {market?.title && <p className="truncate text-xs text-vantage-text">{market.title}</p>}
          {market?.subtitle && (
            <p className="truncate text-[11px] text-vantage-textDim">{market.subtitle}</p>
          )}
        </div>

        <div className="min-w-0" role="cell">
          <PlatformBadge platform={platform} />
        </div>

        <div className="min-w-0" role="cell">
          {price?.label && (
            <span className="text-xs font-medium text-vantage-text">{price.label}</span>
          )}
          {price?.otherLabel && (
            <p className="truncate text-[11px] text-vantage-textDim">
              {price.otherName ? `${price.otherName} ` : ''}
              {price.otherLabel}
            </p>
          )}
        </div>

        <div role="cell">
          {hitChance && (
            <span className="text-xs text-vantage-text">{hitChance}</span>
          )}
        </div>

        <div role="cell">
          <PositiveValue value={ev} className="text-xs" />
        </div>

        <button
          type="button"
          onClick={() => onToggle(opportunity.id)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse details' : 'Expand details'}
          className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-vantage-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-vantage-accent"
        >
          <Chevron open={expanded} />
        </button>
      </div>

      {/* Mobile card */}
      <button
        type="button"
        onClick={() => onToggle(opportunity.id)}
        aria-expanded={expanded}
        className="flex w-full flex-col gap-2 px-4 py-3 text-left md:hidden"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {selection?.title && (
              <p className="truncate text-sm font-medium text-vantage-text">{selection.title}</p>
            )}
            {selection?.subtitle && (
              <p className="truncate text-xs text-vantage-textDim">{selection.subtitle}</p>
            )}
          </div>
          <PositiveValue value={ev} className="text-sm" />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-vantage-textDim">
          <PlatformBadge platform={platform} />
          {price?.label && <span>{price.label}</span>}
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
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <ExpandedPanel detail={detail} status={detailStatus} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
