import { api } from './api.js'

/** Authenticated saved-parlay API. Django scopes every request to the bearer
 * token's Supabase user, so the browser never chooses an account id. */
export function getSavedParlays() {
  return api.get('/parlays/')
}

export function createSavedParlay(parlay) {
  return api.post('/parlays/', {
    name: parlay.name,
    selections: parlay.selections,
    estimatedEdge: parlay.estimatedEdge ?? '',
    estimatedChance: parlay.estimatedChance ?? '',
    positionSizing: parlay.positionSizing ?? {},
  })
}

export function updateSavedParlay(id, changes) {
  return api.patch(`/parlays/${id}`, changes)
}

export function deleteSavedParlay(id) {
  return api.delete(`/parlays/${id}`)
}
