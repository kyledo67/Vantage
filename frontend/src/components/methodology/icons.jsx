// Thin line icons, 18px, stroke-based — matches the rest of the dashboard's icon style.
const s = { stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' }

export function SearchCardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="10.5" height="12" rx="1.5" {...s} />
      <circle cx="14.5" cy="14" r="2.5" {...s} />
      <path d="M16.5 16l1.5 1.5" {...s} />
      <path d="M5.5 7.5h5.5M5.5 10h4" {...s} />
    </svg>
  )
}

export function CompareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 15V8M10 15V4M16 15v-6" {...s} />
    </svg>
  )
}

export function FormulaIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="6" cy="6" r="2" {...s} />
      <circle cx="14" cy="14" r="2" {...s} />
      <path d="M15 5L5 15" {...s} />
    </svg>
  )
}

export function AdvantageIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="6.5" {...s} />
      <path d="M10 6.5v7M6.5 10h7" {...s} />
    </svg>
  )
}

export function MetaIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="6.5" {...s} />
      <path d="M10 6.8v3.6l2.4 1.4" {...s} />
    </svg>
  )
}

export function TermIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6.2 6.3a1.8 1.8 0 013.5.6c0 1.2-1.5 1.4-1.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="8.1" cy="11.2" r="0.6" fill="currentColor" />
    </svg>
  )
}

export function SearchIcon({ className = '' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function ChevronIcon({ open }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      aria-hidden="true"
      className={`mt-0.5 flex-shrink-0 text-vantage-textDim transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    >
      <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="flex-shrink-0 text-vantage-alert">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.3 8.2l1.8 1.8 3.6-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="flex-shrink-0 text-vantage-danger">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.8 5.8l4.4 4.4M10.2 5.8l-4.4 4.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}
