import { useEffect, useRef, useState } from 'react'

/**
 * Flashes a cell when a *backend-provided* value actually changes.
 *
 * Tint semantics come from the data, never from the animation: `isPositive`
 * must be explicitly true for the mint tint; everything else gets a neutral
 * lavender tint. The value itself crossfades — no counting/slot-machine effect.
 *
 * Renders nothing special on first paint; only real subsequent changes flash.
 */
export default function ValueFlash({ value, isPositive, className = '', children }) {
  const previous = useRef(value)
  const [flash, setFlash] = useState(null)
  const [visibleKey, setVisibleKey] = useState(0)

  useEffect(() => {
    if (previous.current === value) return
    // Skip the initial population — that's arrival, not a change.
    const isFirstValue = previous.current === undefined || previous.current === null
    previous.current = value
    setVisibleKey((k) => k + 1)
    if (isFirstValue) return

    setFlash(isPositive === true ? 'positive' : 'neutral')
    const id = setTimeout(() => setFlash(null), 700)
    return () => clearTimeout(id)
  }, [value, isPositive])

  const flashClass =
    flash === 'positive'
      ? 'animate-flash-positive'
      : flash === 'neutral'
        ? 'animate-flash-neutral'
        : ''

  return (
    <span className={`rounded px-1.5 ${flashClass} ${className}`}>
      <span key={visibleKey} className="animate-detail-in inline-block">
        {children}
      </span>
    </span>
  )
}
