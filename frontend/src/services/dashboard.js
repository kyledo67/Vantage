import { api } from './api.js'

/**
 * Backend contract for the Parlay Builder, Alerts, History and Settings
 * features. Backend-driven only — nothing here falls back to sample data,
 * and every field below is optional unless marked required. The UI omits
 * any element whose data is absent rather than substituting a placeholder.
 *
 * (Watchlist used to be documented here too, but GET/POST /api/watchlist was
 * never actually implemented server-side — confirmed against
 * market_data/urls.py. pages/WatchlistPage.jsx now sources real data from
 * services/opportunities.js instead of this never-built endpoint.)
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

// History
export const getHistory = (params) => api.get('/history', params)

// Settings
export const getSettings = () => api.get('/settings')
export const updateSetting = (fieldId, value) => api.patch('/settings', { fieldId, value })
