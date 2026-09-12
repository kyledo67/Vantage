import { api } from './api.js'

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'

export async function getSports() {
  if (USE_MOCKS) {
    const { SPORTS } = await import('../utils/constants.js')
    return SPORTS
  }
  return api.get('/sports')
}

export async function getMarketHealth() {
  if (USE_MOCKS) {
    return { status: 'ok', kalshi: 'ok', polymarket: 'ok', parlayApi: 'ok' }
  }
  return api.get('/market-health')
}

export async function getDataFreshness() {
  if (USE_MOCKS) {
    return { lastRefreshedAt: new Date().toISOString(), refreshMode: 'manual' }
  }
  return api.get('/data-freshness')
}
