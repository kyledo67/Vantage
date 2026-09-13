import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { SPRING_PILL } from '../../motion/tokens.js'

// Thin line icons, 23px, stroke-based (scaled +30% from the original 18px).
const icon = (path) =>
  function Icon() {
    return (
      <svg width="23" height="23" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        {path}
      </svg>
    )
  }

const s = { stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' }

const HomeIcon = icon(<path d="M3.5 9.5L10 4l6.5 5.5M5.5 8.5V16h9V8.5" {...s} />)
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
  { label: 'Home', to: '/home', Icon: HomeIcon },
  { label: 'Opportunities', to: '/ev-finder', Icon: DiscoverIcon },
  { label: 'Watchlist', to: '/watchlist', Icon: WatchlistIcon },
  { label: 'My Parlays', to: '/parlay', Icon: ParlayIcon },
  { label: 'Alerts', to: '/alerts', Icon: AlertsIcon },
  { label: 'History', to: '/history', Icon: HistoryIcon },
  { label: 'Settings', to: '/settings', Icon: SettingsIcon },
]

/**
 * The active background is a single shared element (layoutId) that springs
 * between items on navigation, rather than one box fading out while another
 * fades in. Label colour eases from muted lavender to #DF78FF alongside it.
 */
function NavItem({ label, to, Icon, onNavigate }) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className="relative flex min-h-[64px] items-center gap-4 rounded-lg px-6 py-5 text-base"
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="sidebar-active-pill"
              transition={SPRING_PILL}
              className="absolute inset-0 -z-10 rounded-lg bg-vantage-raised"
            />
          )}
          <span
            className={`flex items-center gap-4 transition-colors duration-200 ${
              isActive
                ? 'font-medium text-vantage-alert'
                : 'text-vantage-textDim hover:text-vantage-text'
            }`}
          >
            {/* Fixed-size icon slot — keeps every label's start position
                identical regardless of how each icon's own artwork is
                positioned within its viewBox. */}
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center">
              <Icon />
            </span>
            <span>{label}</span>
          </span>
        </>
      )}
    </NavLink>
  )
}

export default function DashboardSidebar({ onNavigate }) {
  return (
    <div className="flex h-full flex-col justify-between gap-4 overflow-y-auto bg-vantage-nav p-6">
      <nav className="flex flex-col gap-2" aria-label="Dashboard">
        {navItems.map((item) => (
          <NavItem key={item.label} {...item} onNavigate={onNavigate} />
        ))}
      </nav>

      {/* Product information only — never market data. */}
      <div className="rounded-lg border border-vantage-border bg-vantage-surface p-5">
        <p className="text-xs font-medium text-vantage-alert">Vantage signal</p>
        <p className="mt-2 text-xs leading-relaxed text-vantage-textDim">
          Every contract is benchmarked against current sharp-book prices. Estimates only —
          Vantage does not place trades.
        </p>
      </div>
    </div>
  )
}
