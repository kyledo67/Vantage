// Formatting helpers. These only display values computed by the backend EV engine —
// the frontend never re-derives probability/EV from a midpoint.

export function formatCents(decimalPrice) {
  if (decimalPrice == null) return '—'
  return `${Math.round(decimalPrice * 100)}¢`
}

export function formatPercent(fraction, { signed = false, digits = 1 } = {}) {
  if (fraction == null) return '—'
  const value = (fraction * 100).toFixed(digits)
  const sign = signed && fraction > 0 ? '+' : ''
  return `${sign}${value}%`
}

export function formatSignedCents(deltaDecimal) {
  if (deltaDecimal == null) return '—'
  const cents = Math.round(deltaDecimal * 100)
  const sign = cents > 0 ? '+' : ''
  return `${sign}${cents}¢`
}

export function formatFreshness(updatedAtIso) {
  if (!updatedAtIso) return 'unknown'
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(updatedAtIso).getTime()) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

export function confidenceTone(level) {
  switch (level) {
    case 'high':
      return 'text-vantage-positive'
    case 'medium':
      return 'text-vantage-alert'
    default:
      return 'text-vantage-danger'
  }
}
