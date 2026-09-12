import { motion } from 'framer-motion'
import { Skeleton } from './atoms.jsx'
import { PRESS_BUTTON } from '../../motion/tokens.js'

/**
 * Shared loading / empty / error scaffolding used by every dashboard page.
 * Content renders only on a successful response with data — there is no
 * fallback copy standing in for market values.
 */

export function SectionHeader({ title, description, actions }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-5">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight text-vantage-text sm:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2.5 text-base leading-relaxed text-vantage-textDim">{description}</p>
        )}
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
    <div className="flex flex-col items-center gap-4 px-8 py-20 text-center">
      <svg className="animate-pulse-once" width="40" height="40" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <circle cx="24" cy="24" r="15" stroke="#794BD4" strokeWidth="1.4" opacity="0.55" />
        <path d="M24 17v9" stroke="#AAA1B4" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="24" cy="30.5" r="1.2" fill="#AAA1B4" />
      </svg>
      <div>
        <p className="text-base font-medium text-vantage-text">{title}</p>
        <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-vantage-textDim">
          {description}
        </p>
      </div>
      {onRetry && (
        <motion.button
          type="button"
          whileTap={PRESS_BUTTON}
          onClick={onRetry}
          className="mt-1.5 flex min-h-[56px] items-center rounded-full bg-vantage-accent px-6 text-base font-semibold text-vantage-ctaText transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vantage-accent"
        >
          Try again
        </motion.button>
      )}
    </div>
  )
}

export function PanelEmpty({ title, description, action, icon }) {
  return (
    <div className="flex flex-col items-center gap-4 px-8 py-20 text-center">
      {icon ?? (
        <svg className="animate-icon-in" width="40" height="40" viewBox="0 0 48 48" fill="none" aria-hidden="true">
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
        <p className="text-base font-medium text-vantage-text">{title}</p>
        {description && (
          <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-vantage-textDim">
            {description}
          </p>
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
          className="flex min-h-[100px] items-center justify-between gap-5 border-b border-vantage-border/60 px-5 py-5 last:border-b-0"
        >
          <div className="flex flex-1 flex-col gap-2.5">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
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
