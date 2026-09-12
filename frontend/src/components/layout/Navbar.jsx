import { useState, useRef, useEffect } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../context/AuthContext.jsx'

function LockIcon() {
  return (
    <svg width="9" height="11" viewBox="0 0 10 12" aria-hidden="true" className="opacity-70">
      <path
        d="M2.5 5V3.5a2.5 2.5 0 015 0V5"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
      <rect x="1" y="5" width="8" height="6" rx="1.5" fill="currentColor" />
    </svg>
  )
}

// Product dropdown — only routes that actually exist.
const productLinks = [
  { to: '/ev-finder', label: 'EV Finder', blurb: 'Contracts priced below market' },
  { to: '/markets', label: 'Markets', blurb: 'Browse sports, events, and contracts' },
  { to: '/parlay', label: 'My Parlays', blurb: 'Review selections together' },
]

function centerLinkClass({ isActive }) {
  return `border-b-[3px] pb-1 text-sm transition-colors ${
    isActive
      ? 'border-vantage-accent text-vantage-text'
      : 'border-transparent text-vantage-textDim hover:text-vantage-text'
  }`
}

function ProductMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    function onClickAway(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickAway)
    return () => document.removeEventListener('mousedown', onClickAway)
  }, [])

  return (
    <div ref={ref} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm text-vantage-textDim transition-colors hover:text-vantage-text"
      >
        Product
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          aria-hidden="true"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute left-1/2 top-full z-20 w-64 -translate-x-1/2 pt-3"
          >
            <div className="overflow-hidden rounded-xl border border-vantage-border bg-vantage-surface p-1.5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)]">
              {productLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2.5 transition-colors hover:bg-vantage-raised"
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium text-vantage-text">
                    {item.label}
                    {!isAuthenticated && <LockIcon />}
                  </span>
                  <span className="block text-xs text-vantage-textDim">{item.blurb}</span>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 border-b border-vantage-border bg-vantage-nav/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-4 py-4 sm:px-6 lg:px-16">
        <Link to="/" className="flex items-center gap-2" aria-label="Vantage home">
          <span className="text-xl font-semibold tracking-tight text-vantage-text">
            <span className="text-gradient-lavender">V</span>antage
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
          <ProductMenu />
          <NavLink to="/methodology" className={centerLinkClass}>
            <span className="flex items-center gap-1.5">
              Methodology
              {!isAuthenticated && <LockIcon />}
            </span>
          </NavLink>
          <NavLink to="/ev-finder" className={centerLinkClass}>
            <span className="flex items-center gap-1.5">
              Markets
              {!isAuthenticated && <LockIcon />}
            </span>
          </NavLink>
        </nav>

        <div className="flex items-center gap-5">
          {isAuthenticated ? (
            <>
              <span
                className="hidden max-w-[14rem] truncate text-sm text-vantage-textDim sm:block"
                title={user.email}
              >
                {user.email}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-vantage-border px-4 py-1.5 text-sm font-medium text-vantage-text transition-colors hover:border-vantage-accent hover:text-vantage-accent"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm text-vantage-textDim transition-colors hover:text-vantage-text"
              >
                Log in
              </Link>

              <motion.div whileTap={{ scale: 0.96 }}>
                <Link
                  to="/login"
                  className="inline-block rounded-full bg-vantage-accent px-5 py-2 text-sm font-medium text-vantage-ctaText transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vantage-accent"
                >
                  Get started
                </Link>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
