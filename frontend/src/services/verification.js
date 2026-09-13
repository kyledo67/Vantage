import { api } from './api.js'

/**
 * Verification data access — now backed entirely by real endpoints
 * (backend/market_data/views.py: CurrentUserProfileView, PersonaInquiryView).
 *
 *   GET /api/profile/
 *     {
 *       "uid", "is_age_verified",
 *       "residence_country_code": "<ISO 3166-1 alpha-2, or "">",  // set by Persona, not chosen up front
 *       "residence_subdivision": "<state/province, or "">",
 *       "eligibility": {
 *         "is_eligible": <bool>,
 *         "is_residence_verified": <bool>,
 *         "eligible_markets": ["kalshi" | "polymarket", ...],
 *         "platforms": { "kalshi": {eligible, status, reason}, "polymarket": {...} },
 *         "policy_checked_on", "disclaimer"
 *       },
 *       "verification_status": "not_started" | "pending" | "verified" | "declined",
 *       "markets", "bankroll", "created_at", "updated_at"
 *     }
 *   Auto-creates the profile row on first GET — no separate "create" call needed.
 *
 *   POST /api/persona/inquiries/
 *     If already verified: { status: "approved", verified: true, eligibility, launchable: false }
 *     Otherwise:            { inquiryId, sessionToken, environmentId, status, verified: false,
 *                              eligibility, launchable: <bool> }
 */

const VERIFICATION_STATUS = {
  NOT_STARTED: 'not_started',
  PENDING: 'pending',
  VERIFIED: 'verified',
  DECLINED: 'declined',
}

function getVerificationProfile() {
  return api.get('/profile')
}

/** Only the fields the serializer allows the frontend to write
 *  (`markets`, `bankroll`) — verification status,
 *  age, and residence are Persona/backend-owned. */
function updateVerificationProfile(patch) {
  return api.patch('/profile', patch)
}

function createPersonaInquiry() {
  return api.post('/persona/inquiries')
}

export {
  VERIFICATION_STATUS,
  getVerificationProfile,
  updateVerificationProfile,
  createPersonaInquiry,
}
