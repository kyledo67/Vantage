import { api } from './api.js'

/**
 * Verification data access.
 *
 * ── What's real ──────────────────────────────────────────────────────────
 * `GET/PATCH /api/profile/` exists today (`CurrentUserProfileView` in
 * market_data/views.py) and returns the fields below on `UserProfile`:
 *
 *   {
 *     "uid": "<uuid>",
 *     "is_age_verified": <boolean>,        // read-only — server/Persona sets this
 *     "verification_status": "not_started" | "pending" | "verified" | "declined",
 *     "markets": "kalshi" | "polymarket" | "both",
 *     "bankroll": "<decimal string>",
 *     "max_position_percent": "<decimal string>",
 *     "created_at": "<ISO8601>",
 *     "updated_at": "<ISO8601>"
 *   }
 *
 * `getVerificationProfile` below calls this real endpoint. A 404 means the
 * signed-in user has no profile row yet (never started verification) — that
 * is treated the same as `verification_status: "not_started"`.
 *
 * ── What's NOT real yet ──────────────────────────────────────────────────
 * There is currently no backend support for:
 *   - a confirmed country on the profile (no `country` field on the model),
 *   - country/region eligibility checks,
 *   - creating a Persona inquiry and handing the frontend a session token.
 *
 * The functions below for those are placeholders only — they call routes
 * that do not exist on the Django backend today, so they will fail with a
 * 404 until a backend engineer implements them. They exist so the UI has
 * one clearly isolated place to wire up once that contract is real, rather
 * than the frontend inventing field names that would silently diverge from
 * whatever the backend actually ships. Do not treat their current failure
 * as a bug — surfacing it as a "couldn't reach the verification service"
 * state is the correct, honest behavior until these are implemented.
 */

const VERIFICATION_STATUS = {
  NOT_STARTED: 'not_started',
  PENDING: 'pending',
  VERIFIED: 'verified',
  DECLINED: 'declined',
}

/** Real: GET /api/profile/. Normalizes "no profile row yet" (404) into the
 *  same shape as a fresh, not-started profile rather than throwing. */
async function getVerificationProfile() {
  try {
    return await api.get('/profile')
  } catch (error) {
    if (error?.status === 404) {
      return {
        uid: null,
        is_age_verified: false,
        verification_status: VERIFICATION_STATUS.NOT_STARTED,
        markets: null,
      }
    }
    throw error
  }
}

/** Real: PATCH /api/profile/ (only fields the serializer allows to be
 *  written — `markets`, `bankroll`, `max_position_percent`). Verification
 *  status and age are read-only from the frontend; only Persona / the
 *  backend can move those. */
function updateVerificationProfile(patch) {
  return api.patch('/profile', patch)
}

/** Real: POST /api/profile/ — used the first time, when no profile row
 *  exists yet, before onboarding can proceed. */
function createVerificationProfile(patch = {}) {
  return api.post('/profile', patch)
}

/**
 * PLACEHOLDER — no backend route exists for this yet. Country isn't part of
 * the UserProfile model. Do not add a fabricated success path here; let the
 * request fail naturally so the UI's real "couldn't confirm availability"
 * state is what a reviewer actually sees.
 */
function checkCountryEligibility(countryCode) {
  return api.post('/verification/country-eligibility', { country: countryCode })
}

/**
 * PLACEHOLDER — no backend route exists for this yet. Once implemented,
 * this should return whatever Persona's hosted-flow or embedded SDK needs
 * to open the widget for this user (e.g. `{ inquiryId, sessionToken }`),
 * created server-side against `PERSONA_INQUIRY_TEMPLATE_ID`.
 */
function createPersonaInquiry() {
  return api.post('/verification/persona-inquiry')
}

/**
 * PLACEHOLDER — no backend route exists for this yet. Intended to let the
 * "Verification in progress" screen ask the backend to re-check Persona's
 * webhook-reported status on demand, independent of the profile poll.
 */
function getPersonaInquiryStatus(inquiryId) {
  return api.get(`/verification/persona-inquiry/${inquiryId}`)
}

export {
  VERIFICATION_STATUS,
  getVerificationProfile,
  updateVerificationProfile,
  createVerificationProfile,
  checkCountryEligibility,
  createPersonaInquiry,
  getPersonaInquiryStatus,
}
