// Small building blocks shared across the EV Finder dashboard.
// Every one of these renders nothing when its backend data is absent —
// no fallback labels, no placeholder values.

export function Skeleton({ className = '', ...rest }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" {...rest} />
}

/**
 * Deterministic placeholder avatar — a colored initial — shown wherever the
 * backend hasn't supplied a real logo yet, so platform/book chips never sit
 * with a blank slot.
 */
export function PlaceholderIcon({ name, className = 'h-4 w-4' }) {
  const label = (name ?? '').trim()
  const hue = Array.from(label).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360
  return (
    <span
      aria-hidden="true"
      className={`inline-flex flex-shrink-0 items-center justify-center rounded-sm text-[9px] font-semibold text-white ${className}`}
      style={{ backgroundColor: `hsl(${hue}, 45%, 38%)` }}
    >
      {label.charAt(0).toUpperCase() || '?'}
    </span>
  )
}

/** Platform chip. Uses a backend icon when supplied, otherwise a placeholder. */
export function PlatformBadge({ platform }) {
  if (!platform?.name) return null
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-vantage-text">
      {platform.iconUrl ? (
        <img src={platform.iconUrl} alt="" className="h-4 w-4 rounded-sm object-cover" />
      ) : (
        <PlaceholderIcon name={platform.name} />
      )}
      <span className="truncate">{platform.name}</span>
    </span>
  )
}

/** Live/status dot. Green only when the backend marks the state positive/live. */
export function StatusIndicator({ status }) {
  if (!status?.label) return null
  const positive = status.isPositive === true
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs ${
        positive ? 'text-vantage-positive' : 'text-vantage-textDim'
      }`}
    >
      {/* The dot only pulses when the backend actually confirms a live/positive
          state — it's never decorative motion. Pauses when the tab is hidden. */}
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          positive ? 'animate-live-dot bg-vantage-positive' : 'bg-vantage-borderLight'
        }`}
      />
      {status.label}
    </span>
  )
}

/**
 * EV / value cell. Green is reserved for values the backend explicitly marks
 * positive (or that are numerically > 0); anything else stays neutral so green
 * never implies a favourable signal the data didn't assert.
 */
export function PositiveValue({ value, className = '' }) {
  if (!value?.label) return null
  const positive =
    value.isPositive === true || (value.isPositive === undefined && Number(value.value) > 0)
  return (
    <span className={`inline-flex items-baseline gap-1.5 ${className}`}>
      <span className={`font-semibold ${positive ? 'text-vantage-positive' : 'text-vantage-text'}`}>
        {value.label}
      </span>
      {value.probabilityLabel && (
        <span className="text-[10px] font-medium text-vantage-positive">
          {value.probabilityLabel}
        </span>
      )}
    </span>
  )
}

export function Chevron({ open }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      aria-hidden="true"
      className={`text-vantage-textDim transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
    >
      <path
        d="M4 2.5L8 6l-4 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
