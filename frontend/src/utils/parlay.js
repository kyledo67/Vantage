/**
 * Derived, local-only helpers for the hypothetical parlay builder.
 *
 * Every value here is computed strictly from fields already present on the
 * opportunity objects the Opportunities table already rendered — the same
 * `ev.value` and `consensus.label` shown in its columns. Nothing here
 * invents odds, prices, or probabilities; a missing input means the
 * corresponding function returns `null` so the UI can show "Unavailable".
 */

function parsePercentLabel(label) {
  if (typeof label !== 'string') return null
  const match = label.match(/-?\d+(\.\d+)?/)
  if (!match) return null
  const value = Number(match[0])
  return Number.isFinite(value) ? value : null
}

function opportunityProbability(opportunity) {
  const direct = opportunity?.consensus?.probability
  if (typeof direct === 'number' && direct > 0 && direct < 1) return direct
  const percent = parsePercentLabel(opportunity?.consensus?.label)
  return percent === null ? null : percent / 100
}

function americanToDecimal(odds) {
  const numeric = Number(odds)
  if (!Number.isFinite(numeric) || numeric === 0) return null
  return numeric > 0 ? 1 + numeric / 100 : 1 + 100 / Math.abs(numeric)
}

function formatAmericanFromDecimal(decimalOdds) {
  if (!Number.isFinite(decimalOdds) || decimalOdds <= 1) return null
  const american = decimalOdds >= 2
    ? Math.round((decimalOdds - 1) * 100)
    : -Math.round(100 / (decimalOdds - 1))
  return american > 0 ? `+${american}` : String(american)
}

function floorMoney(value) {
  return Math.floor(Math.max(0, value) * 100 + Number.EPSILON) / 100
}

function money(value, positive = false) {
  if (!Number.isFinite(value)) return null
  return `${positive ? '+' : ''}$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/** Compound the net EV of independent legs rather than adding percentages. */
export function computeEstimatedEdge(selections) {
  if (!selections?.length) return null
  let growthMultiple = 1
  for (const opportunity of selections) {
    const value = opportunity.ev?.value
    if (typeof value !== 'number' || !Number.isFinite(value)) return null
    growthMultiple *= 1 + value / 100
  }
  const percent = (growthMultiple - 1) * 100
  return `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`
}

/**
 * Product of each selection's consensus (fair) probability — the same
 * percentage already shown in its Consensus column — assuming independence
 * across selections.
 */
export function computeEstimatedChance(selections) {
  if (!selections?.length) return null
  let product = 1
  for (const opportunity of selections) {
    const probability = opportunityProbability(opportunity)
    if (probability === null) return null
    product *= probability
  }
  const percent = product * 100
  return `${percent.toFixed(percent < 1 ? 2 : 1)}%`
}

/**
 * Combine independent legs and apply the same capped fractional-Kelly policy
 * used by the backend for straight positions. The calculation uses the
 * bankroll, a 2.5% minimum stake, and a 5% maximum slider range.
 */
export function computeParlaySizing(selections) {
  if (!selections?.length) return null
  const accountSizing = selections[0]?.positionSizing
  const bankroll = Number(accountSizing?.bankroll)
  if (!accountSizing?.isConfigured || !Number.isFinite(bankroll) || bankroll <= 0) {
    return null
  }

  let combinedProbability = 1
  let combinedDecimalOdds = 1
  let netGrowthMultiple = 1
  for (const opportunity of selections) {
    const probability = opportunityProbability(opportunity)
    const decimalOdds = americanToDecimal(opportunity?.price?.odds)
    const evPercent = opportunity?.ev?.value
    if (
      probability === null ||
      decimalOdds === null ||
      typeof evPercent !== 'number' ||
      !Number.isFinite(evPercent)
    ) {
      return null
    }
    combinedProbability *= probability
    combinedDecimalOdds *= decimalOdds
    netGrowthMultiple *= 1 + evPercent / 100
  }

  const netEdge = Math.max(0, netGrowthMultiple - 1)
  const profitMultiple = combinedDecimalOdds - 1
  const fullKellyFraction = profitMultiple > 0 ? netEdge / profitMultiple : 0
  const kellyFraction = Math.max(0, Math.min(Number(accountSizing.kellyFraction) || 0.5, 1))
  const minimumPercent = 2.5
  const maximumPercent = 5
  const uncappedPercent = fullKellyFraction * kellyFraction * 100
  const recommendedPercent = Math.min(maximumPercent, Math.max(minimumPercent, uncappedPercent))
  const recommendedAmount = floorMoney(bankroll * recommendedPercent / 100)
  const expectedProfit = floorMoney(recommendedAmount * netEdge)
  const profitIfWin = floorMoney(recommendedAmount * profitMultiple)
  const totalPayout = floorMoney(recommendedAmount * combinedDecimalOdds)

  return {
    method: 'Half Kelly',
    bankroll,
    combinedProbability,
    combinedProbabilityLabel: `${(combinedProbability * 100).toFixed(combinedProbability < 0.01 ? 2 : 1)}%`,
    combinedDecimalOdds,
    combinedOddsLabel: formatAmericanFromDecimal(combinedDecimalOdds),
    netEvPercent: netEdge * 100,
    netEvLabel: `+${(netEdge * 100).toFixed(1)}%`,
    fullKellyPercent: fullKellyFraction * 100,
    recommendedPercent,
    recommendedUnits: recommendedPercent,
    recommendedAmount,
    recommendedAmountLabel: money(recommendedAmount),
    expectedProfit,
    expectedProfitLabel: money(expectedProfit, true),
    profitIfWin,
    profitIfWinLabel: money(profitIfWin, true),
    totalPayout,
    totalPayoutLabel: money(totalPayout),
    maxPositionPercent: maximumPercent,
    maximumAmount: floorMoney(bankroll * maximumPercent / 100),
    maximumAmountLabel: money(floorMoney(bankroll * maximumPercent / 100)),
    isCapped: uncappedPercent > maximumPercent + 1e-9,
    isMinimumApplied: recommendedPercent > uncappedPercent + 1e-9,
  }
}

/**
 * The event a selection belongs to, taken from the subtitle already shown
 * under its title (e.g. "Arsenal FC @ Sunderland AFC"). Normalized only for
 * comparison — never displayed directly.
 */
export function getEventKey(opportunity) {
  const subtitle = opportunity?.selection?.subtitle
  if (!subtitle || typeof subtitle !== 'string') return null
  return subtitle.trim().toLowerCase()
}

/**
 * Groups of selections that share an event, for the same-game correlation
 * guard. A selection with no event subtitle is never flagged as a conflict.
 */
export function findDuplicateEventGroups(selections) {
  const byEvent = new Map()
  for (const opportunity of selections ?? []) {
    const key = getEventKey(opportunity)
    if (!key) continue
    const list = byEvent.get(key) ?? []
    list.push(opportunity)
    byEvent.set(key, list)
  }
  return Array.from(byEvent.values())
    .filter((items) => items.length > 1)
    .map((items) => ({ eventName: items[0].selection.subtitle, opportunities: items }))
}

export function getMarketHandoffUrl(opportunity) {
  const platform = opportunity?.action?.platform || opportunity?.platform?.name
  const platformKey = String(platform || '').trim().toLowerCase()
  if (platformKey === 'kalshi') return 'https://kalshi.com/markets'
  if (platformKey === 'polymarket' || platformKey === 'polymarket us') {
    const directUrl = opportunity?.action?.marketUrl
    if (typeof directUrl === 'string' && directUrl.includes('polymarket.us')) {
      return directUrl
    }
    return 'https://polymarket.us/sports'
  }
  if (opportunity?.action?.marketUrl) return opportunity.action.marketUrl
  return null
}
