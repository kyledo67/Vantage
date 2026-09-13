import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useParlays } from '../context/ParlayContext.jsx'
import { getHomeClv, CLV_PERIODS } from '../services/home.js'
import { ProgressRing, Sparkline, BreakdownRow } from '../components/dashboard/HomeWidgets.jsx'

const s = { stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' }

function glyph(path, viewBox = '0 0 24 24') {
  return function Glyph({ className = 'h-6 w-6' }) {
    return (
      <svg viewBox={viewBox} fill="none" aria-hidden="true" className={className}>
        {path}
      </svg>
    )
  }
}

// Original line-icon marks — a radical/formula mark for EV math, a scoped
// eye for tracked wallets, and a pulse line for sharp-money flow.
const PositiveEvIcon = glyph(
  <>
    <path d="M3 13l3.5-8L10 13M4.2 10h4.6" {...s} />
    <path d="M13 17l3-10 3 10M13 6h6" {...s} />
  </>
)
const InsiderIcon = glyph(
  <>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" {...s} />
    <circle cx="12" cy="12" r="3" {...s} />
  </>
)
const SmartMoneyIcon = glyph(
  <>
    <path d="M3 14l4-3 3 2.5 4-5 4 3 3-4" {...s} />
    <circle cx="19" cy="6.5" r="1.4" fill="currentColor" stroke="none" />
  </>
)

const GET_STARTED_ITEMS = [
  {
    id: 'positive-ev',
    label: 'Positive EV',
    description:
      'Identify bets priced below Vantage’s sharp-market benchmark, ranked by expected value.',
    Icon: PositiveEvIcon,
    to: '/ev-finder',
    accent: 'bg-vantage-positive/15 text-vantage-positive',
  },
  {
    id: 'insider-activity',
    label: 'Insider Activity',
    description: 'Track qualified prediction-market wallets and the positions they’re taking.',
    Icon: InsiderIcon,
    to: null,
    accent: 'bg-vantage-alert/15 text-vantage-alert',
  },
  {
    id: 'smart-money',
    label: 'Smart Money',
    description: 'Follow sharp bettors and see where informed money is moving right now.',
    Icon: SmartMoneyIcon,
    to: null,
    accent: 'bg-vantage-accent/15 text-vantage-accent',
  },
]

function GetStartedCard({ item }) {
  const content = (
    <div className="flex min-h-[96px] items-start gap-4 rounded-xl border border-vantage-border bg-vantage-surface p-5 transition-colors group-hover:border-vantage-accent/50">
      <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg ${item.accent}`}>
        <item.Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-base font-medium text-vantage-text">{item.label}</p>
          {!item.to && (
            <span className="rounded-full border border-vantage-border px-2 py-0.5 text-xs text-vantage-textDim">
              Coming soon
            </span>
          )}
        </div>
        <p className="mt-1 text-sm leading-relaxed text-vantage-textDim">{item.description}</p>
      </div>
    </div>
  )

  if (!item.to) {
    return (
      <div className="group" aria-disabled="true">
        {content}
      </div>
    )
  }

  return (
    <Link to={item.to} className="group block focus-visible:outline-none">
      {content}
    </Link>
  )
}

/**
 * There's no real bet-placement backend. This reads the authenticated user's
 * saved-parlay analysis from the same source as History instead of the
 * unimplemented /home/overview endpoint, which always came back zeroed.
 * The ring shows the average *estimated* chance of hitting across saved
 * parlays (each parlay already carries one, from BuildParlayModal's
 * computeEstimatedChance) rather than a win *rate* — a hypothetical parlay
 * has a probability estimate captured at save time.
 */
function BetOverviewWidget() {
  const { savedParlays } = useParlays()

  const { totalBets, risked, potential, avgChance } = useMemo(() => {
    let riskedTotal = 0
    let potentialTotal = 0
    let chanceSum = 0
    let chanceCount = 0
    for (const parlay of savedParlays) {
      const sizing = parlay.positionSizing
      const stake = Number(sizing?.selectedAmount ?? sizing?.recommendedAmount) || 0
      const payout = Number.isFinite(Number(sizing?.totalPayout))
        ? Number(sizing.totalPayout)
        : stake + (Number(sizing?.profitIfWin) || 0)
      riskedTotal += stake
      potentialTotal += payout

      const chance = parseFloat(parlay.estimatedChance)
      if (Number.isFinite(chance)) {
        chanceSum += chance
        chanceCount += 1
      }
    }
    return {
      totalBets: savedParlays.length,
      risked: riskedTotal,
      potential: potentialTotal,
      avgChance: chanceCount > 0 ? chanceSum / chanceCount / 100 : null,
    }
  }, [savedParlays])

  const hasBets = totalBets > 0
  const riskedLabel = risked.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
  const potentialLabel = potential.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-vantage-border bg-vantage-surface p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-vantage-text">Bet overview</h2>
        <Link to="/history" className="text-sm text-vantage-alert transition-colors hover:text-vantage-accent">
          View all
        </Link>
      </div>

      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <ProgressRing value={avgChance} label="chance of hitting" />
        <div className="flex flex-1 flex-col gap-4">
          {!hasBets && (
            <p className="flex items-center gap-2 text-sm text-vantage-textDim">
              <span className="h-1.5 w-1.5 rounded-full bg-vantage-textDim" aria-hidden="true" />
              No parlays saved yet — build one in the EV Finder and it’ll show up here.
            </p>
          )}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xl font-semibold text-vantage-text">{riskedLabel}</p>
              <p className="text-xs text-vantage-textDim">risked</p>
            </div>
            <div>
              <p className="text-xl font-semibold text-vantage-text">{potentialLabel}</p>
              <p className="text-xs text-vantage-textDim">potential</p>
            </div>
            <div>
              <p className="text-xl font-semibold text-vantage-text">{totalBets}</p>
              <p className="text-xs text-vantage-textDim">total bets</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ClvWidget() {
  const [period, setPeriod] = useState('7d')
  const { savedParlays } = useParlays()
  const data = useMemo(() => getHomeClv(savedParlays, period), [savedParlays, period])
  const hasSettledParlays = data.settledCount > 0
  const netProfitLabel = data.netProfit.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  })

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-vantage-border bg-gradient-to-b from-vantage-surface to-vantage-surfaceAlt p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-vantage-text">Closing line value</h2>
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full border border-vantage-border text-xs text-vantage-textDim"
            title="This app does not receive final closing prices, so this is an estimated CLV proxy from the saved sharp-market edge. Wins and losses are tracked separately as net profit."
          >
            ?
          </span>
        </div>
        <div className="flex gap-1 rounded-full border border-vantage-border bg-vantage-surface p-1">
          {CLV_PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={`min-h-[32px] rounded-full px-3 text-xs font-medium transition-colors ${
                period === p.id
                  ? 'bg-vantage-raised text-vantage-alert'
                  : 'text-vantage-textDim hover:text-vantage-text'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {!hasSettledParlays ? (
        <div className="flex min-h-[128px] flex-col justify-center gap-2 rounded-lg border border-dashed border-vantage-border px-5">
          <p className="text-sm text-vantage-textDim">No marked results in this period yet.</p>
          <Link to="/history" className="w-fit text-sm text-vantage-alert transition-colors hover:text-vantage-accent">
            Mark a parlay won or lost in History
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="flex flex-shrink-0 flex-col items-center gap-1 lg:items-start">
            <p className="text-3xl font-semibold text-vantage-positive sm:text-4xl">
              {data.estimatedEdgePct > 0 ? '+' : ''}
              {data.estimatedEdgePct.toFixed(2)}%
            </p>
            <p className="text-xs text-vantage-textDim">estimated CLV proxy · {data.settledCount} settled</p>
            <p className={`text-xs ${data.netProfit >= 0 ? 'text-vantage-positive' : 'text-vantage-danger'}`}>
              net profit: {data.netProfit > 0 ? '+' : ''}{netProfitLabel}
            </p>
          </div>

          <div className="min-w-0 flex-1">
            <Sparkline series={data.series} positive={data.netProfit >= 0} />
          </div>

          <div className="flex w-full flex-col gap-2.5 lg:w-56">
            <BreakdownRow label="Won" pct={data.breakdown.winningPct} colorClass="bg-vantage-positive text-vantage-positive" />
            <BreakdownRow label="Lost" pct={data.breakdown.losingPct} colorClass="bg-vantage-danger text-vantage-danger" />
          </div>
        </div>
      )}
    </div>
  )
}

export default function HomePage() {
  const { user } = useAuth()
  const firstName = user?.email ? user.email.split('@')[0] : null

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1440px] flex-col gap-8 pb-24">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-vantage-textDim">Welcome{firstName ? `, ${firstName}` : ''}</p>
          <h1 className="mt-1 text-4xl font-semibold tracking-tight text-vantage-text sm:text-5xl">
            Your Vantage home
          </h1>
          <p className="mt-2.5 max-w-xl text-base leading-relaxed text-vantage-textDim">
            A quick read on today’s activity and where to look next — start with the tools below.
          </p>
        </div>
        <div className="flex flex-shrink-0 gap-3">
          <Link
            to="/ev-finder"
            className="flex min-h-[52px] items-center rounded-full bg-vantage-accent px-6 text-base font-semibold text-vantage-ctaText transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vantage-accent"
          >
            Find EV bets
          </Link>
          <Link
            to="/parlay"
            className="flex min-h-[52px] items-center rounded-full border border-vantage-border px-6 text-base font-medium text-vantage-text transition-colors hover:border-vantage-accent hover:text-vantage-accent"
          >
            My Parlays
          </Link>
        </div>
      </header>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-vantage-text">Get started</h2>
          <Link to="/methodology" className="text-sm text-vantage-alert transition-colors hover:text-vantage-accent">
            Learn more
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GET_STARTED_ITEMS.map((item) => (
            <GetStartedCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <BetOverviewWidget />
        <ClvWidget />
      </section>
    </div>
  )
}
