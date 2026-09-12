// Thin authenticated fetch wrapper around the Django REST API.
// Provider credentials remain on Django; only the current Supabase access token
// is sent from the browser.

import { supabase } from '../lib/supabase.js'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

class ApiError extends Error {
  constructor(message, status, body) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

function normalizedPath(path) {
  const [pathname, query] = path.split('?', 2)
  const withSlash = pathname.endsWith('/') ? pathname : `${pathname}/`
  return query ? `${withSlash}?${query}` : withSlash
}

async function accessToken() {
  if (!supabase) return null
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

async function send(url, method, body, token) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  return fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

async function request(path, { method = 'GET', body, params } = {}) {
  const url = new URL(`${BASE_URL}${normalizedPath(path)}`, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value)
      }
    })
  }

  let token = await accessToken()
  let response = await send(url, method, body, token)

  // Handle the small expiry race between reading a session and reaching Django.
  if (response.status === 401 && token && supabase) {
    const { data, error } = await supabase.auth.refreshSession()
    if (!error && data.session?.access_token) {
      token = data.session.access_token
      response = await send(url, method, body, token)
    }
  }

  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await response.json() : null

  if (!response.ok) {
    const fieldError =
      data && typeof data === 'object'
        ? Object.values(data)
            .flat()
            .find((value) => typeof value === 'string')
        : null
    throw new ApiError(data?.detail || fieldError || response.statusText, response.status, data)
  }

  return data
}

export const api = {
  get: (path, params) => request(path, { method: 'GET', params }),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
}

export { ApiError }
