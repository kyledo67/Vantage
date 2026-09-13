import { api } from './api.js'

/**
 * Backend contract for the Parlay Builder and Settings features.
 * Backend-driven only — nothing here falls back to sample data, and every
 * field below is optional unless marked required. The UI omits any element
 * whose data is absent rather than substituting a placeholder.
 *
 * (Watchlist used to be documented here too, but GET/POST /api/watchlist was
 * never actually implemented server-side — confirmed against
 * market_data/urls.py. pages/WatchlistPage.jsx now sources real data from
 * services/opportunities.js instead of this never-built endpoint. History
 * likewise reads the saved-parlay data via ParlayContext.jsx rather than a
 * /api/history endpoint that was never built, and there's no Alerts feature
 * at all — its unimplemented /api/alerts contract and nav entry were removed.)
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

// Settings
export const getSettings = () => api.get('/settings')
export const updateSetting = (fieldId, value) => api.patch('/settings', { fieldId, value })
