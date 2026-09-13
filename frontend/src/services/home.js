const CLV_PERIODS = [
  { id: 'today', label: 'TDAY' },
  { id: 'yday', label: 'YDAY' },
  { id: '7d', label: '1W' },
  { id: '1m', label: '1M' },
  { id: '1y', label: '1Y' },
  { id: 'all', label: 'ALL' },
]

const SERIES_LENGTH = { today: 6, yday: 6, '7d': 7, '1m': 30, '1y': 12, all: 12 }

// A brand-new account has no settled bet history — every point is zero rather
// than an invented trend.
function emptySeries(period) {
  const length = SERIES_LENGTH[period] ?? 7
  return Array.from({ length }, (_, i) => ({ t: i, value: 0 }))
}

// The Home dashboard's "Bet overview" widget used to read a /home/overview
// endpoint here, but there's no real bet-placement/settlement backend to
// back it — it always came back zeroed. It now reads the saved-parlay data
// directly (see HomePage.jsx's BetOverviewWidget / ParlayContext.jsx), the
// same source HistoryPage.jsx uses, since that's the only activity record
// that actually exists.

function valueFromLabel(value) {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function periodStart(period, now) {
  if (period === 'all') return 0
  const start = new Date(now)
  if (period === 'today') start.setHours(0, 0, 0, 0)
  if (period === 'yday') {
    start.setDate(start.getDate() - 1)
    start.setHours(0, 0, 0, 0)
  }
  if (period === '7d') start.setDate(start.getDate() - 7)
  if (period === '1m') start.setMonth(start.getMonth() - 1)
  if (period === '1y') start.setFullYear(start.getFullYear() - 1)
  return start.getTime()
}

/**
 * Build the home performance summary directly from parlay-builder state.
 * A true CLV calculation needs the book's final closing price, which this
 * hackathon app does not receive. `estimatedEdgePct` is therefore the saved
 * sharp-market edge. Result tracking produces a separate net-profit figure;
 * it must never be presented as CLV.
 */
export function getHomeClv(parlays = [], period = '7d') {
  const now = Date.now()
  const cutoff = periodStart(period, now)
  const settled = parlays
    .filter((parlay) => ['won', 'lost'].includes(parlay.outcome))
    .filter((parlay) => new Date(parlay.settledAt ?? parlay.createdAt).getTime() >= cutoff)
    .sort((a, b) => new Date(a.settledAt ?? a.createdAt) - new Date(b.settledAt ?? b.createdAt))

  if (settled.length === 0) {
    return {
      period,
      estimatedEdgePct: 0,
      netProfit: 0,
      series: emptySeries(period),
      breakdown: { winningPct: 0, pendingPct: 0, losingPct: 0 },
      settledCount: 0,
    }
  }

  let netProfit = 0
  let edgeTotal = 0
  let wins = 0
  const series = settled.map((parlay, index) => {
    const sizing = parlay.positionSizing ?? {}
    const stake = Number(sizing.selectedAmount ?? sizing.recommendedAmount) || 0
    const savedProfit = Number(sizing.profitIfWin)
    const payout = Number(sizing.totalPayout)
    const profitIfWon = Number.isFinite(savedProfit) && savedProfit >= 0
      ? savedProfit
      : Number.isFinite(payout)
        ? Math.max(0, payout - stake)
        : 0
    netProfit += parlay.outcome === 'won' ? profitIfWon : -stake
    edgeTotal += valueFromLabel(parlay.estimatedEdge)
    if (parlay.outcome === 'won') wins += 1
    return { t: index, value: netProfit }
  })

  return {
    period,
    estimatedEdgePct: edgeTotal / settled.length,
    netProfit,
    series,
    breakdown: {
      winningPct: (wins / settled.length) * 100,
      pendingPct: 0,
      losingPct: ((settled.length - wins) / settled.length) * 100,
    },
    settledCount: settled.length,
  }
}

export { CLV_PERIODS }
