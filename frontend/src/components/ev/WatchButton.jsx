import { motion } from 'framer-motion'
import { useEvWatchlist } from '../../context/EvWatchlistContext.jsx'
import { PRESS_BUTTON } from '../../motion/tokens.js'

/**
 * Bookmark toggle for a Positive EV opportunity. Filled purple + pressed
 * state when watched; the accessible name (and native tooltip, via `title`)
 * flips between "Add to" / "Remove from Watchlist" so it's announced
 * correctly either way.
 */
export default function WatchButton({ opportunity, size = 'md', className = '' }) {
  const { isWatched, toggleWatch } = useEvWatchlist()
  const watched = isWatched(opportunity.id)
  const label = watched ? 'Remove from Watchlist' : 'Add to Watchlist'
  const dimensions = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9'

  return (
    <motion.button
      type="button"
      whileTap={PRESS_BUTTON}
      onClick={(e) => {
        e.stopPropagation()
        toggleWatch(opportunity)
      }}
      aria-pressed={watched}
      aria-label={label}
      title={label}
      className={`flex flex-shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vantage-accent ${dimensions} ${
        watched
          ? 'border-vantage-accent bg-vantage-accent/15 text-vantage-accent'
          : 'border-vantage-border text-vantage-textDim hover:border-vantage-accent/50 hover:text-vantage-text'
      } ${className}`}
    >
      <svg width="13" height="15" viewBox="0 0 14 16" aria-hidden="true">
        <path
          d="M2.5 1.5h9a.5.5 0 01.5.5v12.15a.5.5 0 01-.78.42L7 11.35l-4.22 3.22a.5.5 0 01-.78-.42V2a.5.5 0 01.5-.5z"
          fill={watched ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      </svg>
    </motion.button>
  )
}
