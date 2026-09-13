// Status badge for a watched opportunity, used on pages/WatchlistPage.jsx.
// Derived only from fields the real /api/opportunities response actually
// has — there's no start-time or settlement field in that contract, so
// unlike an earlier sample-data version of this page, there is no
// "expired"/"settled" state here.

const WATCH_STATUS_COPY = {
  improving: { label: 'Improving', className: 'bg-vantage-positive/15 text-vantage-positive' },
  worsening: { label: 'Worsening', className: 'bg-vantage-danger/15 text-vantage-danger' },
  stable: { label: 'Stable', className: 'bg-vantage-textDim/15 text-vantage-textDim' },
  no_longer_positive_ev: {
    label: 'No longer +EV',
    className: 'bg-vantage-danger/15 text-vantage-danger',
  },
}

export const WATCH_STATUSES = Object.keys(WATCH_STATUS_COPY)

export function WatchStatusBadge({ status }) {
  const copy = WATCH_STATUS_COPY[status] ?? WATCH_STATUS_COPY.stable
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${copy.className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {copy.label}
    </span>
  )
}
