# Vantage frontend

React + Vite + Tailwind frontend for Vantage — a market-analysis tool that surfaces
Kalshi and Polymarket sports contracts that may be priced below their estimated market value.

## Getting started

```bash
npm install
npm run dev
```

The app runs standalone against mock data (`src/mocks/`) by default, so it's fully demoable
without the Django backend. Set `VITE_USE_MOCKS=false` in `.env` once the backend endpoints
below are live.

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

## Backend contract (not yet implemented)

The frontend expects a Django REST API at `/api` (proxied in dev via `vite.config.js`):

- `GET /api/opportunities`
- `GET /api/opportunities/{id}`
- `GET /api/sports`
- `POST /api/analyze/straight`
- `POST /api/analyze/portfolio`
- `POST /api/watchlist`
- `GET /api/market-health`
- `GET /api/data-freshness`

The frontend never calls ParlayAPI, Kalshi, Polymarket, or Gemini directly — only our own
backend, which serves cached/normalized data.

## Product constraints reflected in the UI

- Only Kalshi and Polymarket contracts are ever shown as "opportunities."
- Portfolio building rejects same-game combinations (correlation isn't modeled in the MVP).
- Language avoids "guaranteed profit" — cards use "price advantage," "estimated market value,"
  and "confidence" instead of raw EV/no-vig jargon.
