import { api } from './api.js'

/**
 * Backend contract for the Watchlist, Parlay Builder, Alerts, Markets, History
 * and Settings features. Backend-driven only — nothing here falls back to
 * sample data, and every field below is optional unless marked required. The UI
 * omits any element whose data is absent rather than substituting a placeholder.
 *
 * ── Watchlist ────────────────────────────────────────────────────────────
 * GET    /api/watchlist        → { items: [ WatchItem ] }
 * DELETE /api/watchlist/{id}
 *   WatchItem {
 *     id (required), title, subtitle,
 *     price:        { label },
 *     movement:     { label, isPositive },   // consensus movement
 *     availability: { label, isPositive },
 *     alerts:       [ { id, label } ]        // matching alert rules
 *   }
 *
 * ── Parlay Builder ───────────────────────────────────────────────────────
 * GET    /api/parlay           → { legs: [ Leg ], combined: Combined | null }
 * DELETE /api/parlay/{id}
 *   Leg      { id (required), title, subtitle, platform:{name}, price:{label},
 *              implied:{label} }
 *   Combined { exposure:{label}, impliedOutcome:{label}, notes:[ string ] }
 *   `combined` is null unless the backend can actually compute it — the UI
 *   never derives a combined figure client-side.
 *
 * ── Alerts ───────────────────────────────────────────────────────────────
 * GET    /api/alerts           → { active:[Alert], paused:[Alert],
 *                                  history:[AlertEvent], delivery:{channels:[Channel]} }
 * GET    /api/alerts/config    → { ruleTypes: [ { id, label, valueLabel, unit } ] }
 * POST   /api/alerts           ← { ruleType, threshold, target }
 * PATCH  /api/alerts/{id}      ← { paused: boolean }
 * DELETE /api/alerts/{id}
 * PATCH  /api/alerts/delivery  ← { channelId, enabled }
 *   Alert      { id (required), title, subtitle, status:{label,isPositive} }
 *   AlertEvent { id (required), at (ISO8601), title, description }
 *   Channel    { id (required), label, description, enabled }
 *
 * ── Markets ──────────────────────────────────────────────────────────────
 * GET /api/markets?search      → { groups: [ { id, label, items:[MarketItem] } ] }
 * GET /api/markets/{id}        → MarketDetail
 *   MarketItem   { id (required), name, subtitle, status:{label,isPositive} }
 *   MarketDetail { title, subtitle, status:{label,isPositive},
 *                  consensus:{label}, liquidity:{label},
 *                  priceHistory:{ points:[{ t: ISO8601, value: number }],
 *                                 consensus: number, valueSuffix: string },
 *                  relatedOpportunities:[ { id, title, subtitle, ev:{label,isPositive} } ] }
 *
 * ── History ──────────────────────────────────────────────────────────────
 * GET /api/history?search&from&to → { events: [ HistoryEvent ] }
 *   HistoryEvent { id (required), at (ISO8601), type, title, description }
 *
 * ── Settings ─────────────────────────────────────────────────────────────
 * GET   /api/settings          → { sections: [ SettingsSection ] }
 * PATCH /api/settings          ← { fieldId, value }
 *   SettingsSection { id, title, description, fields:[ Field ] }
 *   Field { id (required), label, description, type: 'text'|'email'|'toggle'|'select'|'action',
 *           value, options:[{value,label}], actionLabel, readOnly }
 *   Rendering is driven entirely by this response, so new preferences can be
 *   added server-side without a frontend change.
 */

// Watchlist
export const getWatchlist = () => api.get('/watchlist')
export const removeFromWatchlist = (id) => api.delete(`/watchlist/${id}`)

// Parlay Builder
export const getParlay = () => api.get('/parlay')
export const removeParlayLeg = (id) => api.delete(`/parlay/${id}`)

// Alerts
export const getAlerts = () => api.get('/alerts')
export const getAlertConfig = () => api.get('/alerts/config')
export const createAlert = (body) => api.post('/alerts', body)
export const setAlertPaused = (id, paused) => api.patch(`/alerts/${id}`, { paused })
export const deleteAlert = (id) => api.delete(`/alerts/${id}`)
export const setDeliveryChannel = (channelId, enabled) =>
  api.patch('/alerts/delivery', { channelId, enabled })

// Markets
export const getMarkets = (params) => api.get('/markets', params)
export const getMarketDetail = (id) => api.get(`/markets/${id}`)

// History
export const getHistory = (params) => api.get('/history', params)

// Settings
export const getSettings = () => api.get('/settings')
export const updateSetting = (fieldId, value) => api.patch('/settings', { fieldId, value })
