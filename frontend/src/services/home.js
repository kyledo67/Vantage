import { api } from './api.js'

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'

const CLV_PERIODS = [
  { id: 'today', label: 'TDAY' },
  { id: 'yday', label: 'YDAY' },
  { id: '7d', label: '1W' },
  { id: '1m', label: '1M' },
  { id: '1y', label: '1Y' },
  { id: 'all', label: 'ALL' },
]

const SERIES_LENGTH = { today: 6, yday: 6, '7d': 7, '1m': 30, '1y': 12, all: 12 }

// A brand-new (or mock) account has no settled bet history — every point is
// zero rather than an invented trend, matching the "No bets today yet"
// empty state in the Bet overview widget below.
function emptySeries(period) {
  const length = SERIES_LENGTH[period] ?? 7
  return Array.from({ length }, (_, i) => ({ t: i, value: 0 }))
}

/**
 * GET /api/home/overview — today's bet activity for the Home dashboard's
 * "Bet overview" widget.
 *   { riskedCents, potentialCents, totalBets, winRate: <0-1 or null> }
 * `winRate` is `null` (never `0`) when nothing has settled yet — the widget
 * treats that as "no data" rather than a real 0% result.
 */
export async function getHomeOverview() {
  if (USE_MOCKS) {
    return { riskedCents: 0, potentialCents: 0, totalBets: 0, winRate: null }
  }
  return api.get('/home/overview')
}

/**
 * GET /api/home/clv?period=<today|yday|7d|1m|1y|all> — Closing Line Value
 * summary for the CLV widget.
 *   { period, currentClvPct, series: [{ t, value }], breakdown: { beatingPct, evenPct, missingPct } }
 */
export async function getHomeClv(period = '7d') {
  if (USE_MOCKS) {
    return {
      period,
      currentClvPct: 0,
      series: emptySeries(period),
      breakdown: { beatingPct: 0, evenPct: 0, missingPct: 0 },
    }
  }
  return api.get('/home/clv', { period })
}

export { CLV_PERIODS }
