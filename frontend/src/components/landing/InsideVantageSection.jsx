import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext.jsx'
import MarketCoverage from './inside-vantage/MarketCoverage.jsx'
import OddsPreviewCard from './inside-vantage/OddsPreviewCard.jsx'
import ClvPreviewCard from './inside-vantage/ClvPreviewCard.jsx'
import MemberBenefits from './inside-vantage/MemberBenefits.jsx'
import SourceCoverageStrip from './inside-vantage/SourceCoverageStrip.jsx'

function Reveal({ children, className = '', delay = 0 }) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * "Inside Vantage" — a member-focused preview appended below the existing
 * landing page content. Everything shown is sample data (see
 * inside-vantage/data.js); it exists to demonstrate what the real product
 * looks like once signed in, not to serve as a live quote.
 */
export default function InsideVantageSection() {
  const { isAuthenticated } = useAuth()

  return (
    <section id="inside-vantage" className="border-t border-vantage-border py-20 sm:py-28">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center rounded-full border border-vantage-accent/30 bg-vantage-accent/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-vantage-accent">
          Inside Vantage
        </span>
        <h2 className="mt-5 text-3xl font-semibold text-vantage-text sm:text-4xl">
          A closer look at the member dashboard
        </h2>
        <p className="mt-4 text-base leading-relaxed text-vantage-textDim">
          Every bet is checked against Kalshi, Polymarket, and sharp sportsbook prices before you
          take a position. Below is a sample of what that looks like.
        </p>
        <p className="mt-2 text-xs text-vantage-textDim">
          Sample data shown for illustration — not a live quote or a guarantee of results.
        </p>
      </Reveal>

      <Reveal className="mt-10" delay={0.05}>
        <p className="mb-6 text-center text-xs uppercase tracking-wide text-vantage-textDim">
          Odds and consensus data drawn from
        </p>
        <SourceCoverageStrip />
      </Reveal>

      <div className="mt-16">
        <MarketCoverage />
      </div>

      <Reveal className="mx-auto mt-16 max-w-2xl text-center" delay={0}>
        <h3 className="text-xl font-semibold text-vantage-text sm:text-2xl">A sample +EV opportunity</h3>
        <p className="mt-2 text-sm leading-relaxed text-vantage-textDim">
          What the dashboard surfaces when one of those markets prices below sharp consensus.
        </p>
      </Reveal>

      <Reveal className="mx-auto mt-6 max-w-2xl" delay={0.05}>
        <OddsPreviewCard />
      </Reveal>

      <Reveal className="mx-auto mt-8 max-w-2xl" delay={0.05}>
        <ClvPreviewCard />
      </Reveal>

      <Reveal className="mx-auto mt-24 max-w-2xl text-center" delay={0}>
        <h2 className="text-2xl font-semibold text-vantage-text sm:text-3xl">What members get</h2>
        <p className="mt-3 text-base leading-relaxed text-vantage-textDim">
          Everything above is one piece of the dashboard — here&apos;s the full toolkit.
        </p>
      </Reveal>

      <Reveal className="mt-8" delay={0.05}>
        <MemberBenefits />
      </Reveal>

      <Reveal className="mx-auto mt-24 flex max-w-xl flex-col items-center gap-6 text-center" delay={0}>
        <h2 className="font-display text-4xl font-normal text-vantage-text sm:text-5xl">
          Start your analytical edge.
        </h2>
        <motion.div whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.02 }}>
          <Link
            to={isAuthenticated ? '/home' : '/login'}
            className="flex min-h-[62px] items-center rounded-full bg-vantage-accent px-9 text-base font-semibold text-vantage-ctaText shadow-[0_10px_40px_-12px_rgba(206,99,233,0.65)] transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vantage-accent"
          >
            Get Started
          </Link>
        </motion.div>
      </Reveal>
    </section>
  )
}
