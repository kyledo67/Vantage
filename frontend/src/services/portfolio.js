import { api } from './api.js'

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'

// POST /api/analyze/straight — single-contract EV/ROI restated with current data.
export async function analyzeStraight(contractId) {
  if (USE_MOCKS) {
    return { contractId, note: 'Mock straight analysis — wire up POST /api/analyze/straight.' }
  }
  return api.post('/analyze/straight', { contract_id: contractId })
}

// POST /api/analyze/portfolio — joint probability + EV for 2-4 independent, cross-game legs.
export async function analyzePortfolio(contractIds) {
  if (USE_MOCKS) {
    return {
      contractIds,
      note: 'Mock portfolio analysis — wire up POST /api/analyze/portfolio.',
    }
  }
  return api.post('/analyze/portfolio', { contract_ids: contractIds })
}

export async function addToWatchlist(contractId) {
  if (USE_MOCKS) return { contractId, watchlisted: true }
  return api.post('/watchlist', { contract_id: contractId })
}
