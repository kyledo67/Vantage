import { Skeleton } from './atoms.jsx'

/**
 * Shared loading / empty / error scaffolding used by every dashboard page.
 * Content renders only on a successful response with data — there is no
 * fallback copy standing in for market values.
 */

export function SectionHeader({ title, description, actions }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-vantage-text sm:text-3xl">
          {title}
        </h1>
        {description && <p className="mt-1 text-sm text-vantage-textDim">{description}</p>}
      </div>
      {actions}
    </header>
  )
}

export function PanelError({
  title = "Couldn't load this data",
  description = "The service didn't respond. Nothing is shown rather than risk displaying stale values.",
  onRetry,
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <svg width="40" height="40" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <circle cx="24" cy="24" r="15" stroke="#794BD4" strokeWidth="1.4" opacity="0.55" />
        <path d="M24 17v9" stroke="#AAA1B4" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="24" cy="30.5" r="1.2" fill="#AAA1B4" />
      </svg>
      <div>
        <p className="text-sm font-medium text-vantage-text">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-xs text-vantage-textDim">{description}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 rounded-full bg-vantage-accent px-4 py-1.5 text-xs font-semibold text-vantage-ctaText transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vantage-accent"
        >
          Try again
        </button>
      )}
    </div>
  )
}

export function PanelEmpty({ title, description, action, icon }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      {icon ?? (
        <svg width="40" height="40" viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <rect
            x="9"
            y="12"
            width="30"
            height="24"
            rx="4"
            stroke="#794BD4"
            strokeWidth="1.4"
            opacity="0.55"
          />
          <path
            d="M15 28l6-6 4.5 4L33 18"
            stroke="#794BD4"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.75"
          />
        </svg>
      )}
      <div>
        <p className="text-sm font-medium text-vantage-text">{title}</p>
        {description && (
          <p className="mx-auto mt-1 max-w-sm text-xs text-vantage-textDim">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}

export function RowsSkeleton({ rows = 5 }) {
  return (
    <div aria-busy="true">
      <span className="sr-only" aria-live="polite">
        Loading…
      </span>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-4 border-b border-vantage-border/60 px-4 py-3.5 last:border-b-0"
        >
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3 w-44" />
            <Skeleton className="h-2.5 w-28" />
          </div>
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-2.5 w-12" />
        </div>
      ))}
    </div>
  )
}

/** Bordered surface that every list/table on the dashboard sits inside. */
export function Panel({ children, className = '' }) {
  return (
    <div
      className={`min-w-0 overflow-hidden rounded-xl border border-vantage-border bg-vantage-surface ${className}`}
    >
      {children}
    </div>
  )
}

/**
 * Resolves an async state into exactly one of: skeleton, error, empty, content.
 * `isEmpty` is evaluated only on success.
 */
export function DataPanel({ status, isEmpty, onRetry, empty, skeleton, children }) {
  if (status === 'loading' || status === 'idle') return skeleton ?? <RowsSkeleton />
  if (status === 'error') return <PanelError onRetry={onRetry} />
  if (isEmpty) return empty ?? <PanelEmpty title="Nothing here yet" />
  return children
}
