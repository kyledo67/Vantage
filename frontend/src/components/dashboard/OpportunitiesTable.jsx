import { Skeleton } from './atoms.jsx'
import OpportunityRow, { COLUMNS } from './OpportunityRow.jsx'

const HEADINGS = ['Event / Selection', 'Market', 'Platform', 'Price', 'Consensus', 'EV']

function TableHeader() {
  return (
    <div
      className={`${COLUMNS} hidden border-b border-vantage-border px-4 py-2.5 md:grid`}
      role="row"
    >
      {HEADINGS.map((heading) => (
        <span
          key={heading}
          role="columnheader"
          className="text-[10px] uppercase tracking-wide text-vantage-textDim"
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
        <div key={i} className="border-b border-vantage-border/60 px-4 py-3 last:border-b-0">
          <div className={`${COLUMNS} hidden md:grid`}>
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-7 w-7 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2.5 w-24" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-2.5 w-16" />
            </div>
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-2.5 w-12" />
            <Skeleton className="h-2.5 w-10" />
            <Skeleton className="h-2.5 w-12" />
            <span />
          </div>
          <div className="flex flex-col gap-2 md:hidden">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-2.5 w-28" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ onRefresh }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <svg width="44" height="44" viewBox="0 0 48 48" fill="none" aria-hidden="true">
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
        <p className="text-sm font-medium text-vantage-text">No opportunities yet</p>
        <p className="mt-1 max-w-sm text-xs text-vantage-textDim">
          New market signals will appear here when they are available.
        </p>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        className="mt-1 rounded-full border border-vantage-border px-4 py-1.5 text-xs font-medium text-vantage-text transition-colors hover:border-vantage-accent hover:text-vantage-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vantage-accent"
      >
        Refresh
      </button>
    </div>
  )
}

function ErrorState({ onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <svg width="44" height="44" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <circle cx="24" cy="24" r="15" stroke="#794BD4" strokeWidth="1.4" opacity="0.55" />
        <path d="M24 17v9" stroke="#AAA1B4" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="24" cy="30.5" r="1.2" fill="#AAA1B4" />
      </svg>
      <div>
        <p className="text-sm font-medium text-vantage-text">Couldn&apos;t load opportunities</p>
        <p className="mt-1 max-w-sm text-xs text-vantage-textDim">
          The market data service didn&apos;t respond. Nothing is shown rather than risk
          displaying stale prices.
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 rounded-full bg-vantage-accent px-4 py-1.5 text-xs font-semibold text-vantage-ctaText transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vantage-accent"
      >
        Try again
      </button>
    </div>
  )
}

export default function OpportunitiesTable({
  status,
  rows,
  onRetry,
  expandedId,
  onToggle,
  detail,
  detailStatus,
  selectedIds,
  onSelect,
}) {
  return (
    <div
      role="table"
      aria-label="Opportunities"
      className="min-w-0 overflow-hidden rounded-xl border border-vantage-border bg-vantage-surface"
    >
      <TableHeader />

      {(status === 'loading' || status === 'idle') && <TableSkeleton />}
      {status === 'error' && <ErrorState onRetry={onRetry} />}
      {status === 'success' && rows.length === 0 && <EmptyState onRefresh={onRetry} />}

      {status === 'success' &&
        rows.length > 0 &&
        rows.map((opportunity) => (
          <OpportunityRow
            key={opportunity.id}
            opportunity={opportunity}
            expanded={expandedId === opportunity.id}
            onToggle={onToggle}
            detail={expandedId === opportunity.id ? detail : null}
            detailStatus={expandedId === opportunity.id ? detailStatus : 'idle'}
            selected={selectedIds.includes(opportunity.id)}
            onSelect={onSelect}
          />
        ))}
    </div>
  )
}
