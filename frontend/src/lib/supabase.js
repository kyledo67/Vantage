import { createClient } from '@supabase/supabase-js'

// Reconstructed: this file was referenced by AuthContext.jsx/api.js but never
// committed — a bare `lib/` entry in the root .gitignore (meant for Python
// build artifacts) was silently matching frontend/src/lib/ too. Fixed
// alongside this file; see .gitignore.

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

const isConfigured = Boolean(url && key && !url.includes('project-ref') && key !== 'replace-me')

/** `null` until real Supabase credentials are set — every caller here
 *  (AuthContext, api.js) already handles that by skipping auth rather than
 *  crashing, so a missing/placeholder .env degrades gracefully instead of
 *  throwing on load. */
export const supabase = isConfigured ? createClient(url, key) : null

/** For actions that only make sense once Supabase is configured (signing in,
 *  signing up, etc.) — throws a clear error instead of a confusing "cannot
 *  read property of null" deeper in the auth SDK. */
export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase isn’t configured yet. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.'
    )
  }
  return supabase
}
