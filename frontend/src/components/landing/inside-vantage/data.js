// Sample data for the "Inside Vantage" landing-page preview only — this is a
// marketing snippet shown to signed-out visitors, not a live data pull.
// Every number here is illustrative; none of it should be mistaken for a
// real quote (see the disclaimer text rendered alongside it in the section).

export const previewOpportunity = {
  event: 'Mavericks @ Nuggets',
  selection: { title: 'L. Doncic', subtitle: 'Over 29.5 Points' },
  sources: [
    { name: 'FanDuel', type: 'offered', odds: -108, impliedProb: 51.9 },
    { name: 'Kalshi', type: 'exchange', odds: -102, impliedProb: 50.5 },
    { name: 'Polymarket', type: 'exchange', odds: +101, impliedProb: 49.8 },
    { name: 'Pinnacle', type: 'sharp', odds: -128, impliedProb: 56.1 },
    { name: 'Consensus fair value', type: 'fair', odds: -124, impliedProb: 55.4 },
  ],
  impliedProb: 51.9,
  fairProb: 55.4,
  edgePct: 3.5,
  estEvPct: 4.2,
  confidence: 'High',
  kelly: { fraction: 'Quarter Kelly', stakePct: 1.8, stakeDollar: 45 },
  priceHistory: [
    { t: 0, label: '6h ago', offered: -114, sharp: -118 },
    { t: 1, label: '5h ago', offered: -112, sharp: -121 },
    { t: 2, label: '4h ago', offered: -110, sharp: -123 },
    { t: 3, label: '3h ago', offered: -109, sharp: -125 },
    { t: 4, label: '2h ago', offered: -108, sharp: -127 },
    { t: 5, label: '1h ago', offered: -108, sharp: -128 },
    { t: 6, label: 'Now', offered: -108, sharp: -128 },
  ],
}

const CLV_TREND_BY_RANGE = {
  '7d': [1.8, 2.4, 2.1, 3.0, 2.7, 3.4, 3.1],
  '30d': [1.2, 1.6, 1.9, 1.7, 2.2, 2.6, 2.4, 2.9, 3.1, 2.8, 3.3, 3.6],
  all: [0.6, 1.0, 1.4, 1.3, 1.8, 2.1, 2.0, 2.5, 2.7, 2.4, 2.9, 3.1, 3.4, 3.2, 3.6],
}

export const CLV_RANGES = [
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: 'all', label: 'All Time' },
]

export function getClvPreview(range) {
  const series = (CLV_TREND_BY_RANGE[range] ?? CLV_TREND_BY_RANGE['30d']).map((value, i) => ({
    t: i,
    value,
  }))
  return {
    avgClvPct: 3.1,
    betOdds: -110,
    closingOdds: -128,
    pctBeatingClose: 64,
    series,
  }
}

export const memberBenefits = [
  {
    id: 'positive-ev',
    title: 'Positive EV opportunities',
    description: 'Bets priced below the sharp-market consensus, ranked by estimated value after fees.',
  },
  {
    id: 'comparisons',
    title: 'Sharp & prediction-market comparisons',
    description: 'See sportsbook prices side by side with Kalshi, Polymarket, and Pinnacle in one view.',
  },
  {
    id: 'clv',
    title: 'CLV tracking',
    description: 'Track how your bet prices compare to the closing line, the strongest long-run signal there is.',
  },
  {
    id: 'performance',
    title: 'Bet & bankroll performance',
    description: 'Monitor risked, potential return, and realized results against your configured bankroll.',
  },
  {
    id: 'watchlists',
    title: 'Watchlists & line-movement alerts',
    description: 'Bookmark opportunities and get a clear signal when the price moves or the edge disappears.',
  },
  {
    id: 'parlay',
    title: 'Parlay & multi-leg analysis',
    description: 'Combine selections into a hypothetical parlay and see the estimated combined edge and chance.',
  },
]

export const sourceCoverage = [
  'FanDuel',
  'DraftKings',
  'Pinnacle',
  'BetMGM',
  'Caesars',
  'Fanatics',
  'PrizePicks',
  'Underdog',
  'Kalshi',
  'Polymarket',
]
