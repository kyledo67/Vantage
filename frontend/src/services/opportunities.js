import { api } from './api.js'
import { mockOpportunities } from '../mocks/mockOpportunities.js'

// While the Django backend isn't wired up yet, the frontend can run standalone
// against mock data. Set VITE_USE_MOCKS=false once GET /api/opportunities is live.
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'

export async function getOpportunities(filters = {}) {
  if (USE_MOCKS) {
    return applyMockFilters(mockOpportunities, filters)
  }
  return api.get('/opportunities', filters)
}

export async function getOpportunityById(id) {
  if (USE_MOCKS) {
    const found = mockOpportunities.find((o) => String(o.id) === String(id))
    if (!found) throw new Error(`Opportunity ${id} not found`)
    return found
  }
  return api.get(`/opportunities/${id}`)
}

function applyMockFilters(opportunities, filters) {
  const { platform, sport, marketType, minEv, confidence } = filters
  return opportunities.filter((o) => {
    if (platform && o.platform !== platform) return false
    if (sport && o.sport !== sport) return false
    if (marketType && o.marketType !== marketType) return false
    if (minEv && o.estimatedRoi < Number(minEv)) return false
    if (confidence && o.confidence !== confidence) return false
    return true
  })
}
