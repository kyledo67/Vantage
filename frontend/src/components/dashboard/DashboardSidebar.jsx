import { NavLink } from 'react-router-dom'

// Thin line icons, 18px, stroke-based.
const icon = (path) =>
  function Icon() {
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        {path}
      </svg>
    )
  }

const s = { stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' }

const DiscoverIcon = icon(
  <>
    <circle cx="9" cy="9" r="5.5" {...s} />
    <path d="M13.5 13.5L17 17" {...s} />
  </>
)
const WatchlistIcon = icon(<path d="M5 3.5h10v13l-5-3.5-5 3.5z" {...s} />)
const ParlayIcon = icon(
  <>
    <path d="M3 6.5l7-3 7 3-7 3-7-3z" {...s} />
    <path d="M3 10l7 3 7-3M3 13.5l7 3 7-3" {...s} />
  </>
)
const AlertsIcon = icon(
  <>
    <path d="M6 8a4 4 0 118 0c0 3 1.5 4.5 1.5 4.5h-11S6 11 6 8z" {...s} />
    <path d="M8.5 15a1.5 1.5 0 003 0" {...s} />
  </>
)
const MarketsIcon = icon(<path d="M3 14l4-4 3 2.5L17 5" {...s} />)
const HistoryIcon = icon(
  <>
    <circle cx="10" cy="10" r="6.5" {...s} />
    <path d="M10 6.5V10l2.5 1.5" {...s} />
  </>
)
const SettingsIcon = icon(
  <>
    <circle cx="10" cy="10" r="2.5" {...s} />
    <path d="M10 3v2M10 15v2M3 10h2M15 10h2M5.4 5.4l1.4 1.4M13.2 13.2l1.4 1.4M14.6 5.4l-1.4 1.4M6.8 13.2l-1.4 1.4" {...s} />
  </>
)

/**
 * `to` is set only for destinations that actually exist. Items without a route
 * render as disabled rather than as links to nowhere.
 */
const navItems = [
  { label: 'Opportunities', to: '/ev-finder', Icon: DiscoverIcon },
  { label: 'Watchlist', to: '/watchlist', Icon: WatchlistIcon },
  { label: 'My Parlays', to: '/parlay', Icon: ParlayIcon },
  { label: 'Alerts', to: '/alerts', Icon: AlertsIcon },
  { label: 'Markets', to: '/markets', Icon: MarketsIcon },
  { label: 'History', to: '/history', Icon: HistoryIcon },
  { label: 'Settings', to: '/settings', Icon: SettingsIcon },
]

function itemClass({ isActive }) {
  return `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
    isActive
      ? 'bg-vantage-raised font-medium text-vantage-alert'
      : 'text-vantage-textDim hover:bg-vantage-surface hover:text-vantage-text'
  }`
}

export default function DashboardSidebar({ onNavigate }) {
  return (
    <div className="flex h-full flex-col justify-between bg-vantage-nav p-3">
      <nav className="flex flex-col gap-1" aria-label="Dashboard">
        {navItems.map(({ label, to, Icon }) =>
          to ? (
            // No `end`: /markets/:id should keep "Markets" highlighted.
            <NavLink key={label} to={to} className={itemClass} onClick={onNavigate}>
              <Icon />
              <span>{label}</span>
            </NavLink>
          ) : (
            <span
              key={label}
              aria-disabled="true"
              title="Not available yet"
              className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-vantage-textDim/45"
            >
              <Icon />
              <span>{label}</span>
              <span className="ml-auto text-[9px] uppercase tracking-wide text-vantage-textDim/50">
                Soon
              </span>
            </span>
          )
        )}
      </nav>

      {/* Product information only — never market data. */}
      <div className="rounded-lg border border-vantage-border bg-vantage-surface p-3">
        <p className="text-xs font-medium text-vantage-alert">Vantage signal</p>
        <p className="mt-1 text-[11px] leading-relaxed text-vantage-textDim">
          Every contract is benchmarked against current sharp-book prices. Estimates only —
          Vantage does not place trades.
        </p>
      </div>
    </div>
  )
}
