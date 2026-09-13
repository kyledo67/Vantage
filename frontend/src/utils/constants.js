export const PLATFORMS = [
  { value: 'kalshi', label: 'Kalshi' },
  { value: 'polymarket', label: 'Polymarket US' },
]

export const SPORTS = [
  { value: 'mlb', label: 'MLB' },
  { value: 'nfl', label: 'NFL' },
  { value: 'nba', label: 'NBA' },
  { value: 'nhl', label: 'NHL' },
  { value: 'wnba', label: 'WNBA' },
  { value: 'tennis', label: 'Tennis' },
  { value: 'soccer', label: 'Soccer' },
]

export const MARKET_TYPES = [
  { value: 'player_prop', label: 'Player Prop' },
  { value: 'game_market', label: 'Game Market' },
]

export const CONFIDENCE_LEVELS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

// Minimum estimated EV (after cost allowance) required to surface an opportunity.
export const DEFAULT_EV_THRESHOLD = 0.03

// Max number of independent, cross-game legs supported in the MVP portfolio builder.
export const MAX_PORTFOLIO_LEGS = 4
export const MIN_PORTFOLIO_LEGS = 2
