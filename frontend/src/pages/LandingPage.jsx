import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import LaptopScene from '../components/three/LaptopScene.jsx'
import HeroRotator from '../components/landing/HeroRotator.jsx'
import OpportunityCard from '../components/opportunities/OpportunityCard.jsx'
import HeroGlow from '../components/common/HeroGlow.jsx'
import { mockOpportunities } from '../mocks/mockOpportunities.js'

const heroCard = mockOpportunities[0]

const trustPoints = [
  {
    title: 'Only Kalshi & Polymarket.',
    body: 'Every opportunity is a real, currently tradeable exchange contract.',
  },
  {
    title: 'Market-informed, not predictive.',
    body: 'Built from a no-vig consensus across sharp sportsbooks.',
  },
  {
    title: 'Decision support, not a sportsbook.',
    body: 'No trades are placed on your behalf, ever.',
  },
]

export default function LandingPage() {
  const reduceMotion = useReducedMotion()
  const rise = (delay = 0) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] },
  })

  return (
    <div className="flex flex-col">
      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative pb-[72px] pt-[72px] lg:pb-[104px] lg:pt-[88px]">
        <HeroGlow />

        <div className="grid grid-cols-1 items-center gap-y-4 lg:grid-cols-[45fr_55fr] lg:gap-x-8">
          {/* Left — copy */}
          <div className="relative z-10">
            <motion.h1
              {...rise(0)}
              className="text-[3.25rem] font-semibold leading-[0.95] tracking-[-0.02em] text-vantage-text sm:text-7xl xl:text-[6.25rem]"
            >
              <span className="block">
                Your <span className="text-gradient-lavender">V</span>antage
              </span>
              <span className="mt-1 block font-display font-normal tracking-normal">
                on the Market
              </span>
            </motion.h1>

            <motion.p
              {...rise(0.1)}
              className="mt-7 max-w-[30rem] text-base leading-relaxed text-vantage-textDim sm:text-lg"
            >
              See what the broader market thinks a Kalshi or Polymarket sports contract is
              worth — before you take a position.
            </motion.p>

            <motion.div {...rise(0.18)} className="mt-9 flex flex-wrap items-center gap-3">
              {/* Coverage badge — mirrors the reference's twin-pill rhythm, but states a
                  fact about our data rather than linking to app stores we don't have. */}
              <div className="flex items-center gap-3 rounded-full border border-vantage-border bg-vantage-surface px-5 py-3">
                <span className="text-xs uppercase tracking-wide text-vantage-textDim">Live on</span>
                <span className="text-sm font-medium text-vantage-text">Kalshi</span>
                <span className="h-3 w-px bg-vantage-borderLight" />
                <span className="text-sm font-medium text-vantage-text">Polymarket</span>
              </div>

              <motion.div whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.02 }}>
                <Link
                  to="/ev-finder"
                  className="inline-block rounded-full bg-vantage-accent px-7 py-3 text-sm font-semibold text-vantage-ctaText shadow-[0_10px_40px_-12px_rgba(206,99,233,0.65)] transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vantage-accent"
                >
                  Explore the EV Finder
                </Link>
              </motion.div>
            </motion.div>

            <motion.div {...rise(0.24)} className="mt-5">
              <Link
                to="/about"
                className="text-sm font-medium text-vantage-alert transition-colors hover:text-vantage-accent"
              >
                How it works →
              </Link>
            </motion.div>
          </div>

          {/* Right — interactive laptop + rotating label */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <LaptopScene />

            <div className="mt-2 flex items-end justify-between gap-6">
              <p className="pb-1 text-xs text-vantage-textDim">Drag the laptop to rotate it.</p>
              <HeroRotator />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Trust strip ────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-6 border-t border-vantage-border py-10 sm:grid-cols-3">
        {trustPoints.map((point) => (
          <div key={point.title} className="flex items-start gap-3">
            <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-vantage-accent" />
            <p className="text-sm text-vantage-textDim">
              <span className="block font-medium text-vantage-text">{point.title}</span>
              {point.body}
            </p>
          </div>
        ))}
      </section>

      {/* ── Positive EV feature — the one thing we actually have right now ──── */}
      <section className="flex flex-col gap-6 py-16">
        <div className="max-w-xl">
          <h2 className="text-2xl font-semibold text-vantage-text sm:text-3xl">
            Identify <span className="text-vantage-positive">+EV</span> opportunities
          </h2>
          <p className="mt-3 text-sm text-vantage-textDim sm:text-base">
            The EV Finder scans Kalshi and Polymarket sports contracts against a no-vig
            consensus of major sportsbooks and surfaces the ones that may be priced below their
            estimated market value — with the executable price, confidence, and sources shown
            alongside every card.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <OpportunityCard opportunity={heroCard} />
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-vantage-accent/30 bg-vantage-accent/5 p-6 text-center">
            <p className="text-sm font-medium text-vantage-text">More on the way</p>
            <p className="max-w-xs text-xs text-vantage-textDim">
              Vantage is a hackathon MVP — the EV Finder is live today; parlay analysis,
              watchlists, and more sports are coming next.
            </p>
            <Link
              to="/ev-finder"
              className="mt-1 text-xs font-medium text-vantage-accent hover:underline"
            >
              See all opportunities →
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
