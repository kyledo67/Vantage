import { motion, useReducedMotion } from 'framer-motion'
import kalshiLogo from '../../../assets/logos/kalshi.png'
import robinhoodLogo from '../../../assets/logos/robinhood.png'
import polymarketLogo from '../../../assets/logos/polymarket.png'

// Each card's accent is the brand's own logo color, not a generic app tone —
// green (Kalshi), lime (Robinhood), blue (Polymarket) — sampled from the
// logo files themselves (market-source-logos/logos/*.png).
const MARKETS = [
  {
    name: 'Kalshi',
    logo: kalshiLogo,
    color: '#00D992',
    blurb: 'CFTC-regulated event contracts',
    rotateFrom: -10,
  },
  {
    name: 'Robinhood',
    logo: robinhoodLogo,
    color: '#CBFF00',
    blurb: 'Prediction markets on a familiar app',
    rotateFrom: 8,
  },
  {
    name: 'Polymarket',
    logo: polymarketLogo,
    color: '#3B5BFF',
    blurb: 'The largest on-chain prediction market',
    rotateFrom: -8,
  },
]

// Tailwind's JIT scanner needs literal class strings, so a per-brand hex
// can't drive arbitrary-value classes here — these go through inline
// style instead (borderColor/boxShadow/background).
function hexToRgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function MarketCard({ market, index }) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, scale: 0.55, y: 80, rotate: market.rotateFrom }}
      whileInView={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{
        type: 'spring',
        stiffness: 220,
        damping: 17,
        mass: 0.8,
        delay: reduceMotion ? 0 : index * 0.13,
      }}
      whileHover={reduceMotion ? undefined : { scale: 1.05, y: -8 }}
      className="relative"
      style={{ perspective: 800 }}
    >
      {/* Soft brand-colored glow that pops in behind the card */}
      {!reduceMotion && (
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          whileInView={{ opacity: 0.55, scale: 1.15 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, delay: index * 0.13 + 0.1 }}
          className="absolute inset-4 -z-10 rounded-full blur-3xl"
          style={{ background: hexToRgba(market.color, 0.35) }}
          aria-hidden="true"
        />
      )}

      {/* Continuous idle float — independent of the entrance transform above,
          composited on top of it since it's a nested motion element. */}
      <motion.div
        animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
        transition={{ duration: 4.5 + index * 0.4, repeat: Infinity, ease: 'easeInOut', delay: index * 0.3 }}
        className="flex w-full flex-col gap-4 rounded-2xl border bg-vantage-surface p-6 sm:w-56"
        style={{
          borderColor: hexToRgba(market.color, 0.5),
          boxShadow: `0 0 0 1px ${hexToRgba(market.color, 0.12)}, 0 30px 70px -25px ${hexToRgba(market.color, 0.4)}`,
        }}
      >
        <img src={market.logo} alt={market.name} className="h-14 w-14 flex-shrink-0 rounded-2xl object-cover" />
        <div>
          <p className="text-lg font-semibold text-vantage-text">{market.name}</p>
          <p className="mt-1 text-sm leading-relaxed text-vantage-textDim">{market.blurb}</p>
        </div>
      </motion.div>
    </motion.div>
  )
}

/**
 * A prominent standalone showcase of the exchanges Vantage cross-references
 * against sportsbook consensus to find +EV. Each card pops in with a
 * spring-driven scale/rotate/opacity entrance (staggered, once per view),
 * then idles with a slow independent float and lifts on hover — visually
 * the centerpiece of the "Inside Vantage" section, not a transient intro.
 * Reduced-motion visitors get the settled, static layout with no motion.
 */
export default function MarketCoverage() {
  const reduceMotion = useReducedMotion()

  return (
    <div className="relative py-4">
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute left-1/2 top-1/2 h-[30rem] w-[60rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-vantage-accent/10 blur-[160px]" />
      </div>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto max-w-xl text-center"
      >
        <span className="inline-flex items-center rounded-full border border-vantage-border px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-vantage-textDim">
          Markets we analyze
        </span>
        <h3 className="mt-5 text-3xl font-semibold text-vantage-text sm:text-4xl">
          Where Vantage finds your edge
        </h3>
        <p className="mt-4 text-base leading-relaxed text-vantage-textDim">
          Every price on Kalshi, Robinhood, and Polymarket is cross-referenced against sharp
          sportsbook consensus — the gaps between them are where positive EV lives.
        </p>
      </motion.div>

      <div className="mt-14 flex flex-wrap items-center justify-center gap-8 sm:gap-10">
        {MARKETS.map((market, i) => (
          <MarketCard key={market.name} market={market} index={i} />
        ))}
      </div>
    </div>
  )
}
