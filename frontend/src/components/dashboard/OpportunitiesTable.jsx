import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Skeleton } from './atoms.jsx'
import OpportunityRow, { COLUMNS } from './OpportunityRow.jsx'
import { DURATION, EASE, PRESS_BUTTON } from '../../motion/tokens.js'

/** Above this many rows the list is windowed; below it the DOM cost is trivial
 *  and plain rendering keeps expansion/measurement simpler. */
const VIRTUALIZE_THRESHOLD = 30
const ESTIMATED_ROW_HEIGHT = 116

const HEADINGS = ['Event / Selection', 'Market', 'Platform', 'Price', 'Est. hit', 'EV']

function TableHeader() {
  return (
    <div
      className={`${COLUMNS} hidden min-h-[56px] items-center border-b border-vantage-border px-5 py-4 lg:grid`}
      role="row"
    >
      {HEADINGS.map((heading) => (
        <span
          key={heading}
          role="columnheader"
          className="text-sm font-medium uppercase tracking-wide text-vantage-textDim"
        >
          {heading}
        </span>
      ))}
      <span />
    </div>
  )
}

/** Row-shaped skeletons; dimensions match real rows so nothing shifts on load. */
function TableSkeleton({ rows = 6 }) {
  return (
    <div aria-busy="true">
      <span className="sr-only" aria-live="polite">
        Loading opportunities…
      </span>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="min-h-[100px] border-b border-vantage-border/60 px-5 py-5 last:border-b-0"
        >
          <div className={`${COLUMNS} hidden lg:grid`}>
            <div className="flex items-center gap-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex flex-1 flex-col gap-2.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3 w-16" />
            <span />
          </div>
          <div className="flex flex-col gap-2.5 lg:hidden">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ onRefresh }) {
  return (
    <div className="flex flex-col items-center gap-4 px-8 py-20 text-center">
      <svg className="animate-icon-in" width="44" height="44" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <rect
          x="7"
          y="11"
          width="34"
          height="26"
          rx="4"
          stroke="#794BD4"
          strokeWidth="1.4"
          opacity="0.55"
        />
        <path
          d="M13 29l7-7 5 4.5L35 18"
          stroke="#794BD4"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.75"
        />
      </svg>
      <div>
        <p className="text-base font-medium text-vantage-text">No opportunities yet</p>
        <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-vantage-textDim">
          New market signals will appear here when they are available.
        </p>
      </div>
      <motion.button
        type="button"
        whileTap={PRESS_BUTTON}
        onClick={onRefresh}
        className="mt-1.5 flex min-h-[56px] items-center rounded-full border border-vantage-border px-6 text-base font-medium text-vantage-text transition-colors hover:border-vantage-accent hover:text-vantage-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vantage-accent"
      >
        Refresh
      </motion.button>
    </div>
  )
}

function ErrorState({ onRetry, message }) {
  return (
    <div className="flex flex-col items-center gap-4 px-8 py-20 text-center">
      {/* One gentle pulse on entry, then still — error states never loop. */}
      <svg className="animate-pulse-once" width="44" height="44" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <circle cx="24" cy="24" r="15" stroke="#794BD4" strokeWidth="1.4" opacity="0.55" />
        <path d="M24 17v9" stroke="#AAA1B4" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="24" cy="30.5" r="1.2" fill="#AAA1B4" />
      </svg>
      <div>
        <p className="text-base font-medium text-vantage-text">Couldn&apos;t load opportunities</p>
        <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-vantage-textDim">
          {message ||
            'The market data service did not respond. Refresh to request current prices.'}
        </p>
      </div>
      <motion.button
        type="button"
        whileTap={PRESS_BUTTON}
        onClick={onRetry}
        className="mt-1.5 flex min-h-[56px] items-center rounded-full bg-vantage-accent px-6 text-base font-semibold text-vantage-ctaText transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vantage-accent"
      >
        Try again
      </motion.button>
    </div>
  )
}

/** Windowed list for large result sets — only visible rows stay in the DOM.
 *  Heights are measured dynamically so expanded rows are handled correctly. */
function VirtualRows({ rows, renderRow }) {
  const scrollRef = useRef(null)
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 8,
  })

  return (
    <div ref={scrollRef} className="max-h-[70vh] overflow-y-auto">
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((item) => (
          <div
            key={rows[item.index].id}
            ref={virtualizer.measureElement}
            data-index={item.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${item.start}px)`,
            }}
          >
            {renderRow(rows[item.index])}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function OpportunitiesTable({
  status,
  rows,
  error,
  onRetry,
  expandedId,
  onToggle,
  detail,
  detailStatus,
  selectedIds,
  onSelect,
}) {
  // Entrance plays once, when valid backend data first arrives — not on every
  // refetch, and never while loading.
  const [hasEntered, setHasEntered] = useState(false)
  useEffect(() => {
    if (status === 'success' && rows.length > 0 && !hasEntered) setHasEntered(true)
  }, [status, rows.length, hasEntered])

  const renderRow = (opportunity) => (
    <OpportunityRow
      opportunity={opportunity}
      expanded={expandedId === opportunity.id}
      onToggle={onToggle}
      detail={expandedId === opportunity.id ? detail : null}
      detailStatus={expandedId === opportunity.id ? detailStatus : 'idle'}
      selected={selectedIds.includes(opportunity.id)}
      onSelect={onSelect}
    />
  )

  const showRows = status === 'success' && rows.length > 0

  return (
    <div
      role="table"
      aria-label="Opportunities"
      className="min-w-0 overflow-hidden rounded-xl border border-vantage-border bg-vantage-surface"
    >
      <TableHeader />

      {(status === 'loading' || status === 'idle') && <TableSkeleton />}
      {status === 'error' && <ErrorState onRetry={onRetry} message={error?.message} />}
      {status === 'success' && rows.length === 0 && <EmptyState onRefresh={onRetry} />}

      {showRows && (
        <motion.div
          initial={hasEntered ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION.expand, ease: EASE.out }}
        >
          {rows.length > VIRTUALIZE_THRESHOLD ? (
            <VirtualRows rows={rows} renderRow={renderRow} />
          ) : (
            rows.map((opportunity) => (
              <div key={opportunity.id}>{renderRow(opportunity)}</div>
            ))
          )}
        </motion.div>
      )}
    </div>
  )
}
