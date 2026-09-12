import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Skeleton } from './atoms.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { DURATION, EASE } from '../../motion/tokens.js'

// Thin line icons, matched in size/stroke to the existing Methodology book
// icon so every primary nav item carries one.
const navIcon = (path) =>
  function NavGlyph() {
    return (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        {path}
      </svg>
    )
  }

const navIconStroke = { stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round', strokeLinejoin: 'round' }

const DiscoverIcon = navIcon(
  <>
    <circle cx="7" cy="7" r="4.4" {...navIconStroke} />
    <path d="M10.8 10.8L14 14" {...navIconStroke} />
  </>
)
const MyPicksIcon = navIcon(<path d="M4 2.5h8v11l-4-2.8-4 2.8v-11z" {...navIconStroke} />)
const MarketsIcon = navIcon(<path d="M2.5 11.5l3.2-3.2 2.4 2 4.4-4.8" {...navIconStroke} />)

function BookIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2 3.5c1.8-.8 3.6-.8 5.5 0v9c-1.9-.8-3.7-.8-5.5 0v-9z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M14 3.5c-1.8-.8-3.6-.8-5.5 0v9c1.9-.8 3.7-.8 5.5 0v-9z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Only destinations that exist are linked; the rest render disabled.
const primaryNav = [
  { label: 'Discover', to: '/ev-finder', Icon: DiscoverIcon },
  { label: 'My Picks', to: '/parlay', Icon: MyPicksIcon },
  { label: 'Markets', to: '/markets', Icon: MarketsIcon },
  { label: 'Methodology', to: '/methodology', Icon: BookIcon },
]

/**
 * The active underline is a single shared element (layoutId) that slides
 * between tabs on navigation, rather than one underline fading out while
 * another fades in — matches the sidebar's active-pill treatment.
 */
function NavItem({ label, to, Icon }) {
  return (
    <NavLink to={to} end className="relative flex min-h-[56px] items-center pb-1.5 text-base">
      {({ isActive }) => (
        <>
          <span
            className={`flex items-center gap-2 transition-colors duration-200 ${
              isActive ? 'text-vantage-text' : 'text-vantage-textDim hover:text-vantage-text'
            }`}
          >
            {Icon && <Icon />}
            {label}
          </span>
          {isActive && (
            <motion.span
              layoutId="header-active-underline"
              transition={{ duration: DURATION.nav, ease: EASE.out }}
              className="absolute inset-x-0 -bottom-[1px] h-[3px] rounded-full bg-vantage-accent"
            />
          )}
        </>
      )}
    </NavLink>
  )
}

/**
 * Account cluster. Renders a neutral skeleton while the backend account request
 * is in flight — never invented initials, names, or avatars.
 */
function AccountArea({ account, status }) {
  const { logout } = useAuth()

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="flex items-center gap-2.5" aria-live="polite" aria-busy="true">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="hidden h-3 w-24 sm:block" />
        <span className="sr-only">Loading account…</span>
      </div>
    )
  }

  if (status === 'error' || !account) {
    return (
      <button
        type="button"
        onClick={logout}
        className="flex min-h-[56px] items-center text-base text-vantage-textDim transition-colors hover:text-vantage-text"
      >
        Sign out
      </button>
    )
  }

  return (
    <div className="flex items-center gap-4">
      {account.avatarUrl ? (
        <img src={account.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
      ) : account.initials ? (
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-vantage-raised text-sm font-semibold text-vantage-alert">
          {account.initials}
        </span>
      ) : null}
      {account.displayName && (
        <span className="hidden max-w-[10rem] truncate text-base text-vantage-text sm:block">
          {account.displayName}
        </span>
      )}
      <button
        type="button"
        onClick={logout}
        className="flex min-h-[56px] items-center text-sm text-vantage-textDim transition-colors hover:text-vantage-text"
      >
        Sign out
      </button>
    </div>
  )
}

export default function DashboardHeader({
  account,
  accountStatus,
  search,
  onSearchChange,
  onOpenSidebar,
}) {
  // Local input state so typing stays responsive; debounced up to the query.
  const [value, setValue] = useState(search ?? '')

  useEffect(() => {
    const id = setTimeout(() => onSearchChange(value.trim()), 250)
    return () => clearTimeout(id)
  }, [value, onSearchChange])

  return (
    <header className="fixed inset-x-0 top-0 z-40 h-[72px] border-b border-vantage-border bg-vantage-nav">
      <div className="mx-auto flex h-full items-center gap-8 px-5 sm:px-8">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open navigation"
          className="-ml-1.5 rounded-md p-2.5 text-vantage-textDim hover:text-vantage-text lg:hidden"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <Link to="/" className="flex-shrink-0" aria-label="Vantage home">
          <span className="text-lg font-semibold tracking-[0.12em] text-vantage-text">
            <span className="text-gradient-lavender">V</span>ANTAGE
          </span>
        </Link>

        <nav className="hidden items-center gap-9 md:flex" aria-label="Primary">
          {primaryNav.map((item) =>
            item.to ? (
              <NavItem key={item.label} {...item} />
            ) : (
              <span
                key={item.label}
                aria-disabled="true"
                title="Not available yet"
                className="flex min-h-[56px] cursor-not-allowed items-center pb-1.5 text-base text-vantage-textDim/45"
              >
                {item.label}
              </span>
            )
          )}
        </nav>

        <div className="ml-auto flex items-center gap-5">
          <label className="relative hidden sm:block">
            <span className="sr-only">Search players, teams, or markets</span>
            <svg
              width="15"
              height="15"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-vantage-textDim"
            >
              <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Search players, teams, markets…"
              className="h-14 w-72 rounded-full border border-vantage-border bg-vantage-surface pl-12 pr-5 text-base text-vantage-text placeholder:text-vantage-textDim focus:border-vantage-accent focus:outline-none focus:ring-1 focus:ring-vantage-accent lg:w-[30rem]"
            />
          </label>

          <AccountArea account={account} status={accountStatus} />
        </div>
      </div>
    </header>
  )
}
