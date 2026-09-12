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

/** Sum of each selection's net EV% — the same figure already in its EV column. */
export function computeEstimatedEdge(selections) {
  if (!selections?.length) return null
  let total = 0
  for (const opportunity of selections) {
    const value = opportunity.ev?.value
    if (typeof value !== 'number' || !Number.isFinite(value)) return null
    total += value
  }
  return `${total > 0 ? '+' : ''}${total.toFixed(1)}%`
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
    const percent = parsePercentLabel(opportunity.consensus?.label)
    if (percent === null) return null
    product *= percent / 100
  }
  const percent = product * 100
  return `${percent.toFixed(percent < 1 ? 2 : 1)}%`
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
