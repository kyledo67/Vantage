# Vantage frontend

React + Vite + Tailwind frontend for Vantage — a market-analysis tool that surfaces
Kalshi and Polymarket sports contracts that may be priced below their estimated market value.

## Getting started

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env`. Set `VITE_USE_MOCKS=false`, and provide the Supabase
project URL and publishable key. Vite proxies `/api` to Django at
`http://localhost:8000` during local development.

Set `VITE_SUPABASE_GOOGLE_ENABLED=true` or
`VITE_SUPABASE_APPLE_ENABLED=true` only after enabling that provider and its redirect
URLs in Supabase. Disabled providers are hidden from the login form.

Supabase Auth handles password sign-in, signup, recovery, OAuth, persisted sessions,
and token refresh. The shared API client attaches the current access token to Django
requests. Private provider keys remain in `backend/.env`.

## Structure

```
src/
  pages/            Route-level pages (landing, feed, contract detail, portfolio, about)
  components/
    layout/         Navbar, footer
    opportunities/  Feed card, filters, confidence/price-advantage/freshness badges
    contract/       Contract detail panels (order book, benchmarks, explanation)
    portfolio/      Hypothetical portfolio builder pieces
    common/         Loading/error/empty states
  context/          PortfolioContext — shared "selected contracts" state
  hooks/            Data-fetching hooks (useOpportunities, useOpportunityDetail)
  services/         API client + per-resource calls to the Django REST backend
  mocks/            Placeholder data shaped like the real API responses
  utils/            Formatting helpers and shared constants
```

## Implemented backend contract

The frontend expects a Django REST API at `/api` (proxied in dev via `vite.config.js`):

- `GET /api/opportunities/`
- `GET /api/opportunities/{id}/detail/`
- `GET /api/filters/`
- `GET`, `POST`, `PATCH /api/profile/`
- `GET`, `PATCH /api/settings/`
- `POST /api/persona/inquiries/`

The remaining service modules contain placeholders for later watchlist, alert,
history, parlay, and general-market endpoints. See `backend/docs/API.md` for the
current request and response schemas.

The frontend never calls ParlayAPI, Kalshi, Polymarket, or Gemini directly — only our own
backend, which serves cached/normalized data.

## Product constraints reflected in the UI

- Only Kalshi and Polymarket contracts are ever shown as "opportunities."
- Portfolio building rejects same-game combinations (correlation isn't modeled in the MVP).
- Language avoids "guaranteed profit" — cards use "price advantage," "estimated market value,"
  and "confidence" instead of raw EV/no-vig jargon.
