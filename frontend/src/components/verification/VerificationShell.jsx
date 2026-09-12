import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import GlowField from '../common/GlowField.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-vantage-hero text-xs font-bold text-vantage-ctaText">
        V
      </span>
      <span className="text-lg font-semibold tracking-tight text-vantage-text">Vantage</span>
    </span>
  )
}

/**
 * Full-page, Vantage-branded frame every verification screen sits inside —
 * deliberately not a modal, so it reads as a required step in the product
 * rather than an interruption. Centered card on desktop; on narrow screens
 * the card becomes the whole screen, stacked top to bottom.
 */
export default function VerificationShell({ children, showSignOut = true }) {
  const { logout } = useAuth()
  const reduceMotion = useReducedMotion()

  return (
    <div className="relative flex min-h-screen flex-col bg-vantage-bg">
      <GlowField variant="wide" />

      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10">
        <Link to="/" aria-label="Vantage home">
          <Wordmark />
        </Link>
        {showSignOut && (
          <button
            type="button"
            onClick={logout}
            className="flex min-h-[48px] items-center text-sm font-medium text-vantage-textDim transition-colors hover:text-vantage-text"
          >
            Sign out
          </button>
        )}
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-5 pb-10 sm:px-8">
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
          className="w-full max-w-lg rounded-2xl border border-vantage-border bg-vantage-surface/70 p-8 shadow-[0_20px_60px_-20px_rgba(121,75,212,0.35)] backdrop-blur sm:p-12"
        >
          {children}
        </motion.div>
      </main>
    </div>
  )
}
