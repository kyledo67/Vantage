import { Link, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import LaptopScene from '../components/three/LaptopScene.jsx'
import HeroRotator from '../components/landing/HeroRotator.jsx'
import OpportunityCard from '../components/opportunities/OpportunityCard.jsx'
import InsideVantageSection from '../components/landing/InsideVantageSection.jsx'
import HeroGlow from '../components/common/HeroGlow.jsx'
import { mockOpportunities } from '../mocks/mockOpportunities.js'

const heroCard = mockOpportunities[0]

const trustPoints = [
  {
    title: 'Only Kalshi & Polymarket US.',
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
  const location = useLocation()
  const rise = (delay = 0) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] },
  })

  return (
    // Keyed on the navigation entry (not just the path) so clicking back to
    // "/" while already there — the logo, say — remounts this and replays
    // every entrance animation (and the laptop's auto-flip below) exactly
    // like a hard refresh does, instead of silently no-op'ing because the
    // route didn't change.
    <div key={location.key} className="flex flex-col">
      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative pb-[72px] pt-[72px] lg:pb-[104px] lg:pt-[88px]">
        <HeroGlow />

        <div className="grid grid-cols-1 items-center gap-y-5 lg:grid-cols-[45fr_55fr] lg:gap-x-10">
          {/* Left — copy */}
          <div className="relative z-10">
            <motion.h1
              {...rise(0)}
              className="text-5xl font-semibold leading-[1.05] tracking-[-0.02em] text-vantage-text sm:text-6xl lg:text-8xl"
            >
              {/* em-based, not a fixed px/rem offset — scales with the
                  responsive 5xl→6xl→8xl type size instead of under-correcting
                  at the largest breakpoint like a flat -ml-1.5 did. */}
              <span className="-ml-[0.06em] block">Your</span>
              <span className="-ml-[0.06em] block whitespace-nowrap">
                <span className="text-gradient-lavender">V</span>antage Point
              </span>
              <span className="-ml-[0.06em] mt-1.5 block font-display font-normal tracking-normal">
                on the Market
              </span>
            </motion.h1>

            <motion.p
              {...rise(0.1)}
              className="mt-9 max-w-[30rem] text-base leading-relaxed text-vantage-textDim sm:text-lg"
            >
              See what the broader market thinks a Kalshi or Polymarket US sports contract is
              worth — before you take a position.
            </motion.p>

            <motion.div {...rise(0.18)} className="mt-12 flex flex-wrap items-center gap-4">
              {/* Coverage badge — mirrors the reference's twin-pill rhythm, but states a
                  fact about our data rather than linking to app stores we don't have. */}
              <div className="flex items-center gap-4 rounded-full border border-vantage-border bg-vantage-surface px-6 py-4">
                <span className="text-sm uppercase tracking-wide text-vantage-textDim">Live on</span>
                <span className="text-sm font-medium text-vantage-text">Kalshi</span>
                <span className="h-3 w-px bg-vantage-borderLight" />
                <span className="text-sm font-medium text-vantage-text">Polymarket US</span>
              </div>

              <motion.div whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.02 }}>
                <Link
                  to="/ev-finder"
                  className="flex min-h-[62px] items-center rounded-full bg-vantage-accent px-9 text-base font-semibold text-vantage-ctaText shadow-[0_10px_40px_-12px_rgba(206,99,233,0.65)] transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vantage-accent"
                >
                  Explore the EV Finder
                </Link>
              </motion.div>
            </motion.div>

            <motion.div {...rise(0.24)} className="mt-6">
              <Link
                to="/methodology"
                className="flex min-h-[56px] items-center text-base font-medium text-vantage-alert transition-colors hover:text-vantage-accent"
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

            <div className="mt-2.5 flex items-end justify-between gap-8">
              <p className="pb-1.5 text-xs text-vantage-textDim">Drag the laptop to rotate it.</p>
              <HeroRotator />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Trust strip ────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-8 border-t border-vantage-border py-12 sm:grid-cols-3">
        {trustPoints.map((point) => (
          <div key={point.title} className="flex items-start gap-4">
            <span className="mt-2.5 h-2 w-2 flex-shrink-0 rounded-full bg-vantage-accent" />
            <p className="text-base leading-relaxed text-vantage-textDim">
              <span className="block font-medium text-vantage-text">{point.title}</span>
              {point.body}
            </p>
          </div>
        ))}
      </section>

      {/* ── Positive EV feature — the one thing we actually have right now ──── */}
      <section className="flex flex-col gap-8 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold text-vantage-text sm:text-3xl">
            Identify <span className="text-vantage-positive">+EV</span> opportunities
          </h2>
          <p className="mt-4 text-base leading-relaxed text-vantage-textDim">
            The EV Finder scans Kalshi and Polymarket US sports contracts against a no-vig
            consensus of major sportsbooks and surfaces the ones that may be priced below their
            estimated market value — with the executable price, confidence, and sources shown
            alongside every card.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <OpportunityCard opportunity={heroCard} />
          <div className="flex flex-col items-center justify-center gap-2.5 rounded-lg border border-dashed border-vantage-positive/30 bg-vantage-positive/5 p-8 text-center">
            <p className="text-base font-medium text-vantage-text">More on the way</p>
            <p className="max-w-xs text-sm leading-relaxed text-vantage-textDim">
              The EV Finder is live today; parlay analysis, watchlists, insider activity,
              smart money tracking, and more sports are coming next.
            </p>
            <Link
              to="/ev-finder"
              className="mt-1.5 flex min-h-[56px] items-center text-sm font-medium text-vantage-positive hover:underline"
            >
              See all opportunities →
            </Link>
          </div>
        </div>
      </section>

      <InsideVantageSection />
    </div>
  )
}
