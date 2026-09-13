import { api } from './api.js'

// The backend retains the upstream snapshot until an explicit refresh. These
// small per-account caches avoid even repeating the Django request while the
// user moves between dashboard pages. They deliberately live only for the
// current browser session: the Refresh odds button is the single way to ask
// for new upstream prices.
const feedCache = new Map()
const detailCache = new Map()
let filterConfigRequest = null

function stableKey(params) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join('&')
}

function accountKey(scope, params) {
  return `${scope || 'anonymous'}:${stableKey(params)}`
}

function cachedRequest(cache, key, request) {
  if (cache.has(key)) return cache.get(key)
  const pending = request().catch((error) => {
    cache.delete(key)
    throw error
  })
  cache.set(key, pending)
  return pending
}

function clearAccountCache(scope) {
  const prefix = `${scope || 'anonymous'}:`
  for (const key of feedCache.keys()) {
    if (key.startsWith(prefix)) feedCache.delete(key)
  }
  for (const key of detailCache.keys()) {
    if (key.startsWith(prefix)) detailCache.delete(key)
  }
}

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
 *       "tier", "tierLabel", "kellyPercent", "halfKellyPercent", "rankScore"
 *     },
 *     "positionSizing": {
 *       "method", "recommendedPercent", "recommendedAmountLabel",
 *       "expectedProfitLabel", "profitIfWinLabel", "maximumAmountLabel"
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

export function getOpportunities(params = {}, cacheScope) {
  const { refresh, ...query } = params
  const scope = cacheScope || 'anonymous'
  if (refresh === true || refresh === 'true') clearAccountCache(scope)
  const key = accountKey(scope, query)
  return cachedRequest(feedCache, key, () =>
    api.get('/opportunities', { ...query, refresh: refresh ? 'true' : undefined })
  )
}

export function getOpportunityById(id) {
  return api.get(`/opportunities/${id}`)
}

export function getOpportunityDetail(id, cacheScope) {
  const scope = cacheScope || 'anonymous'
  return cachedRequest(detailCache, `${scope}:${id}`, () => api.get(`/opportunities/${id}/detail`))
}

export function getFilterConfig() {
  if (!filterConfigRequest) {
    filterConfigRequest = api.get('/filters').catch((error) => {
      filterConfigRequest = null
      throw error
    })
  }
  return filterConfigRequest
}

export function getAccount() {
  return api.get('/account')
}
