import { api } from './api.js'

/**
 * EV Finder data access. Backend-driven only — there is deliberately no mock,
 * seeded, or fallback data here. If the API is unavailable the UI shows its
 * error state rather than inventing market values.
 *
 * ── Expected response shapes ──────────────────────────────────────────────
 *
 * GET /api/opportunities?category&search&{filterId}=value&refresh=true
 *   {
 *     "live":    { "isLive": true, "updatedAt": "<ISO8601>", "source": "ParlayAPI" } | null,
 *     "results": [ Opportunity ]
 *   }
 *
 * Opportunity — every field except `id` is optional; the UI omits any visual
 * element whose data is missing rather than substituting a placeholder.
 *   {
 *     "id": "<string>",
 *     "selection": { "title", "subtitle", "avatarUrl", "tags": ["<string>"] },
 *     "market":    { "title", "subtitle" },
 *     "platform":  { "name", "iconUrl" },
 *     "action":    { "platform", "marketUrl", "comboPrefillSupported" },
 *     "price":     { "label", "odds", "oddsLabel", "source" },
 *     "consensus": { "label", "probability" },
 *     "ev":        { "label", "value": <number>, "isPositive": <boolean> },
 *     "evaluation": {
 *       "hitProbability", "hitProbabilityLabel", "missProbability",
 *       "tier", "tierLabel", "kellyPercent", "quarterKellyPercent", "rankScore"
 *     },
 *     "hasDetail": <boolean>
 *   }
 *
 * GET /api/opportunities/{id}  → detail panel content
 *   {
 *     "sources": [ { "id", "name", "iconUrl", "priceLabel", "subLabel" } ],
 *     "signal":  { "label", "percent": <0-100>, "leftLabel", "rightLabel" },
 *     "stats":   [ { "label", "value", "isPositive": <boolean> } ]
 *   }
 *
 * GET /api/filters → drives the tab + filter rows; no option is hardcoded here
 *   {
 *     "categories": [ { "id", "label" } ],
 *     "filters":    [ { "id", "label", "options": [ { "value", "label" } ] } ]
 *   }
 */

export function getOpportunities(params = {}) {
  return api.get('/opportunities', params)
}

export function getOpportunityById(id) {
  return api.get(`/opportunities/${id}`)
}

export function getOpportunityDetail(id) {
  return api.get(`/opportunities/${id}/detail`)
}

export function getFilterConfig() {
  return api.get('/filters')
}

export function getAccount() {
  return api.get('/account')
}
