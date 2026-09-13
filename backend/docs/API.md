# Vantage Backend API

This document describes the Django REST API currently implemented in `backend/`.
It also records which upstream services the backend calls and which integrations are
configured but not implemented yet.

## Local base URL

```text
http://127.0.0.1:8000/api
```

React calls only these Django endpoints for application data. API keys for PropLine and ParlayAPI,
Persona, and other private providers remain in `backend/.env`. Supabase's publishable
key is also placed in the ignored `frontend/.env`, because it is designed for browser
clients; Supabase access controls still depend on the user's session and server rules.

All request and response bodies use JSON unless stated otherwise.

## Authentication

`/profile/`, `/settings/`, and `/persona/inquiries/` require a Supabase access token:

```http
Authorization: Bearer <supabase-access-token>
```

Django validates the token by calling Supabase Auth's `/auth/v1/user` endpoint with
the configured Supabase publishable key. The returned Supabase user UUID becomes the
profile `uid`. A client cannot select another user's UID in the request body or URL.
The `user_profiles` table has Postgres row-level security enabled with no direct client
policy; profile access goes through these authenticated Django routes.

React obtains and refreshes this token through Supabase Auth and attaches it to Django
requests automatically. The health, opportunity, opportunity-detail, filter, and
Persona webhook endpoints do not require a user session. Persona webhook requests use
their own HMAC signature instead.

## Health

### `GET /api/health/`

Reports whether the Django process has configuration values for its integrations.
This endpoint does not make a live request to every provider.

#### Inputs

None.

#### Response — `200 OK`

```json
{
  "status": "ok",
  "integrations": {
    "nessie": false,
    "persona": true,
    "persona_webhook": false,
    "parlay_api": true,
    "propline": true,
    "polymarket": true,
    "supabase": true
  }
}
```

| Field | Purpose |
| --- | --- |
| `integrations.nessie` | `true` when `NESSIE_API_KEY` has a value. |
| `integrations.persona` | `true` when both the Persona API key and template ID have values. |
| `integrations.persona_webhook` | `true` when the Persona webhook signing secret has a value. |
| `integrations.parlay_api` | `true` when `PARLAY_API_KEY` has a value. |
| `integrations.propline` | `true` when `PROPLINE_API_KEY` has a value. |
| `integrations.polymarket` | `true` when the Polymarket gateway URL is configured. |
| `integrations.supabase` | `true` when the Supabase project URL has a value. |

## Current user profile

The profile stores user-selected prediction-market preferences and risk settings.
Persona controls age and residence-verification fields. The API does not expose a user's exact age
or date of birth.

### `POST /api/profile/`

Creates a profile for the authenticated Supabase user.

#### Headers

```http
Authorization: Bearer <supabase-access-token>
Content-Type: application/json
```

#### Input

```json
{
  "markets": "both",
  "bankroll": "500.00"
}
```

| Field | Type | Required | Accepted values and purpose |
| --- | --- | --- | --- |
| `markets` | string | No | `kalshi`, `polymarket`, or `both`. Defaults to `both`. |
| `bankroll` | decimal string | Yes for product onboarding | Positive amount the user has allocated to prediction markets. It is required before access to personalized opportunities. |

The API ignores client attempts to set `uid`, `is_age_verified`, or
`verification_status`. Those are server-controlled fields.

#### Response — `201 Created`

```json
{
  "uid": "11111111-1111-1111-1111-111111111111",
  "is_age_verified": false,
  "residence_country_code": "",
  "residence_subdivision": "",
  "eligibility": {
    "is_eligible": false,
    "is_residence_verified": false,
    "eligible_markets": [],
    "platforms": {
      "kalshi": {
        "eligible": false,
        "status": "verification_required",
        "reason": "Complete Persona identity and 18+ verification first."
      },
      "polymarket": {
        "eligible": false,
        "status": "verification_required",
        "reason": "Complete Persona identity and 18+ verification first."
      }
    },
    "policy_checked_on": "2026-09-12"
  },
  "verification_status": "not_started",
  "markets": "both",
  "bankroll": "500.00",
  "created_at": "2026-09-12T05:00:00Z",
  "updated_at": "2026-09-12T05:00:00Z"
}
```

#### Errors

| Status | Meaning |
| --- | --- |
| `400 Bad Request` | A field is invalid, negative, or outside its allowed choices. |
| `401 Unauthorized` | The Supabase token is missing, invalid, or expired. |
| `409 Conflict` | A profile already exists for this user. Use `PATCH` instead. |

### `GET /api/profile/`

Returns the authenticated user's profile. If this is the user's first authenticated
request, Django creates the profile with safe defaults before returning it.

#### Inputs

No query or body input. Requires the Supabase access-token header.

#### Response — `200 OK`

The response has the same shape as the `POST /api/profile/` response.

#### Errors

| Status | Meaning |
| --- | --- |
| `401 Unauthorized` | The Supabase token is missing, invalid, or expired. |

### `PATCH /api/profile/`

Updates selected fields on the authenticated user's profile.

#### Input

Send any subset of the editable fields:

```json
{
  "markets": "kalshi",
  "bankroll": "650.00"
}
```

Editable fields are `markets` and `bankroll`.

#### Response — `200 OK`

Returns the complete updated profile.

#### Errors

| Status | Meaning |
| --- | --- |
| `400 Bad Request` | An editable field contains an invalid value. |
| `401 Unauthorized` | The Supabase token is missing, invalid, or expired. |

## Saved parlays and history

Saved parlays are stored in the `saved_parlays` table in Supabase Postgres. Each
request is authenticated with Supabase Auth, and Django always scopes queries to
the authenticated user's profile. A user cannot read, change, or delete another
user's parlay. These records are hypothetical analyses only; they do not place
orders or store platform credentials.

### `GET /api/parlays/`

Returns the authenticated user's saved parlays, newest first.

### `POST /api/parlays/`

Creates a saved parlay for the authenticated user.

```json
{
  "name": "Saturday picks",
  "selections": [{ "id": "opportunity-123" }],
  "estimatedEdge": "+4.2%",
  "estimatedChance": "51.0%",
  "positionSizing": { "selectedAmount": 25, "profitIfWin": 30 }
}
```

`selections` must contain at least one selection. The server creates the ID,
timestamps, and an initial `pending` outcome.

### `PATCH /api/parlays/{id}/`

Updates a saved parlay owned by the authenticated user. The frontend uses this
route to rename it and set `outcome` to `pending`, `won`, or `lost`. Setting a
won or lost outcome records `settledAt`; returning to pending clears it.

### `DELETE /api/parlays/{id}/`

Removes a saved parlay owned by the authenticated user. All saved-parlay routes
return `401` without a valid Supabase token and `404` for a parlay outside that
user's account.

## Settings

### `GET /api/settings/`

Returns the authenticated user's account, verification state, prediction-market
selection and bankroll in the section/field structure
consumed by the React Settings page. The profile is created automatically when absent.

The email comes from the verified Supabase session. Persona controls
`verification_status`, `is_age_verified`, `residence_country_code`, and
`residence_subdivision`; all are read-only. The response also gives separate Kalshi
and Polymarket eligibility pre-screens. These combine Persona approval with the
current platform residence rules and do not replace either platform's own onboarding
or live physical-location checks.

### `PATCH /api/settings/`

Updates one editable setting.

```json
{
  "fieldId": "bankroll",
  "value": "750.00"
}
```

Accepted `fieldId` values are `markets` and `bankroll`. The response contains the
complete updated `sections` object.
Attempts to update email or verification fields return `400 Bad Request`.

## Persona verification

### `POST /api/persona/inquiries/`

Gets or creates an inquiry for the authenticated Supabase UUID. If an existing inquiry
is pending, Django asks Persona for a short-lived resume token. The React app passes the
returned values into Persona's embedded web SDK.

```json
{
  "inquiryId": "inq_example",
  "sessionToken": null,
  "environmentId": "env_example",
  "status": "created",
  "verified": false,
  "launchable": true
}
```

The API never accepts a user ID or Persona inquiry ID from the browser. It derives the
user from the Supabase bearer token and stores the inquiry association server side.

### `POST /api/persona/webhook/`

Receives Persona inquiry lifecycle events. This route does not use Supabase Auth. It
requires a valid `Persona-Signature` HMAC computed with `PERSONA_WEBHOOK_SECRET`, rejects
signatures older than five minutes, ignores duplicate/out-of-order events, and accepts
verification only for the configured inquiry template.

Only an `approved` Persona inquiry sets `is_age_verified=true`. Market eligibility also
requires the approved inquiry to contain `fields.address-country-code`.
Completed and review states remain pending; declined, failed, and expired states remain
unverified. The backend stores only the normalized residence country/region needed for
the pre-screen, not the user's birthdate, street address, or identity document.

The residence rules are checked in `market_data/eligibility.py`. They reflect Kalshi's
June 17, 2026 Member Agreement and Polymarket's current U.S.-resident positioning as
of September 12, 2026. They must be reviewed when either platform changes its rules.

## +EV opportunity finder

The finder reads real Kalshi target prices from PropLine and real Polymarket target prices from the Polymarket gateway. ParlayAPI supplies independent sportsbook and exchange reference prices, including Pinnacle and FanDuel when those books quote the same market. Django removes each two-sided reference market's margin, builds a weighted fair probability, and calculates EV against the actual target price. Target rows are labeled with their real platform.


Only opportunities with estimated net EV greater than `0%` and a consensus hit
probability of at least `30%` are returned. The EV floor remains `0%`, so smaller
positive edges are still eligible when their hit probability clears the hard floor.

### `GET /api/opportunities/`

Returns the current ranked opportunity feed.

The feed remains readable without authentication. When a valid
`Authorization: Bearer <supabase-access-token>` header is present, Django reads the
user's saved bankroll and adds personalized
`positionSizing` values to every result.

#### Query inputs

```text
GET /api/opportunities/?category=americanfootball_nfl&platform=kalshi&market_type=player_prop&min_ev=1&min_probability=30&search=mahomes&refresh=true
```

| Parameter | Required | Example | Purpose |
| --- | --- | --- | --- |
| `category` | No | `americanfootball_nfl` | Restricts results to one configured sport. |
| `platform` | No | `kalshi` | `kalshi` or `polymarket`. |
| `market_type` | No | `player_prop` | `player_prop`, `game_prop`, or `game_market`. |
| `min_ev` | No | `1` | Minimum net EV percentage. Defaults to `0`. Negative-EV results are never returned. |
| `min_probability` | No | `30` | Minimum estimated hit probability from `30` through `100`. Values below `30` are raised to the hard `30%` floor. |
| `search` | No | `mahomes` | Case-insensitive search across event, selection, market, and platform names. |
| `refresh` | No | `true` | Fetches fresh PropLine Kalshi prices, ParlayAPI reference prices, and Polymarket gateway target prices. Omit it when changing filters so no credits are spent. |

Configured category values are currently:

```text
baseball_mlb
americanfootball_nfl
americanfootball_ncaaf
basketball_wnba
icehockey_nhl
soccer_epl
```

#### Response — `200 OK`

```json
{
  "live": {
    "isLive": true,
    "updatedAt": "2026-09-12T05:00:00+00:00",
    "source": "PropLine Kalshi + ParlayAPI reference consensus + Polymarket",
    "sportsLoaded": ["baseball_mlb", "americanfootball_nfl"],
    "sportsFailed": []
  },
  "results": [
    {
      "id": "kalshi-1234567890abcdef1234",
      "selection": {
        "title": "Josh Allen — Over",
        "subtitle": "Buffalo Bills @ Houston Texans",
        "tags": ["NFL"]
      },
      "market": {
        "title": "Passing Yards",
        "subtitle": "Over 265.5"
      },
      "platform": {
        "name": "Kalshi"
      },
      "action": {
        "platform": "kalshi",
        "marketUrl": "https://kalshi.com/markets/kxnflgame",
        "comboPrefillSupported": false
      },
      "price": {
        "label": "27.0¢ · +270",
        "odds": 270,
        "oddsLabel": "+270",
        "source": "Kalshi"
      },
      "consensus": {
        "label": "28.8%",
        "probability": 0.288,
        "sourceCount": 4,
        "sources": ["Pinnacle", "FanDuel", "Novig", "Bovada"]
      },
      "ev": {
        "label": "+5.5%",
        "value": 5.5,
        "isPositive": true
      },
      "evaluation": {
        "hitProbability": 28.8,
        "hitProbabilityLabel": "28.8%",
        "missProbability": 71.2,
        "tier": "lower",
        "tierLabel": "Lower hit chance",
        "kellyPercent": 2.04,
        "halfKellyPercent": 1.02,
        "quarterKellyPercent": 0.51,
        "rankScore": 2.04
      },
      "positionSizing": {
        "method": "Quarter Kelly",
        "kellyFraction": 0.25,
        "recommendedPercent": 0.51,
        "maxPositionPercent": 5.0,
        "isCapped": false,
        "isMinimumApplied": false,
        "isConfigured": true,
        "bankroll": 500.0,
        "recommendedAmount": 2.55,
        "recommendedAmountLabel": "$2.55",
        "expectedProfit": 0.14,
        "expectedProfitLabel": "+$0.14",
        "profitIfWin": 6.88,
        "profitIfWinLabel": "+$6.88",
        "maximumAmount": 25.0,
        "maximumAmountLabel": "$25.00"
      },
      "hasDetail": true
    }
  ]
}
```

| Response field | Purpose |
| --- | --- |
| `live` | Reports when the current snapshot was fetched. `isLive` is false when one or more configured sports failed to refresh. |
| `id` | Stable hash of the platform, event, market, line, and selection. Use it for the detail route. |
| `action.marketUrl` | Public URL returned by PropLine for the actual target market. It is an external URL and does not place an order. |
| `action.comboPrefillSupported` | Always `false` while neither platform has a documented public Combo-prefill URL or API. |
| `price.label` | Frontend-ready target price with probability-style cents and American odds. |
| `price.odds` | Numeric American odds from the target platform. |
| `price.source` | Identifies whether the target odds came from Kalshi or Polymarket. |
| `consensus.label` | Weighted, no-vig probability across matched reference books. |
| `consensus.sources` | Names of the books that contributed to this result. |
| `ev.value` | Estimated net expected return percentage after the configured cost allowance. |
| `evaluation.hitProbability` | Consensus estimate of how often the selection wins, expressed from `0` through `100`. |
| `evaluation.tier` | Plain-language hit-chance band: `longshot`, `lower`, `moderate`, or `higher`. |
| `evaluation.kellyPercent` | Full Kelly fraction expressed as a bankroll percentage and used for default ranking. |
| `evaluation.halfKellyPercent` | Half of full Kelly, shown for comparison. |
| `positionSizing` | Personalized recommendation calculated when the request includes a valid Supabase session and the profile has a bankroll. |
| `positionSizing.recommendedAmount` | Quarter-Kelly amount constrained to the 0.5%–2.5% recommendation range. |
| `positionSizing.expectedProfit` | Probability-weighted net profit estimate: recommended amount × net EV. It is a long-run average, so it can be small even when a single win pays more. |
| `positionSizing.profitIfWin` | Profit if the selected outcome wins at the current target odds using the complete recommended stake, before platform fees. |

#### Errors

| Status | Meaning |
| --- | --- |
| `503 Service Unavailable` | PropLine is unavailable, rejects the key, reaches its rate limit, or no configured sport can be refreshed. |

## Opportunity details

### `GET /api/opportunities/{id}/detail/`

Returns the book-by-book evidence behind one opportunity. Use the `id` returned by
`GET /api/opportunities/`.

A valid Supabase bearer token adds the same personalized sizing calculation to the
detail response and its stats.

#### Inputs

| Input | Location | Purpose |
| --- | --- | --- |
| `id` | URL path | Identifies the opportunity in the current cached snapshot. |

#### Response — `200 OK`

```json
{
  "sources": [
    {
      "id": "kalshi",
      "name": "Kalshi",
      "priceLabel": "+100",
      "odds": 100,
      "impliedProbability": 0.5,
      "isTarget": true,
      "includedInConsensus": false,
      "subLabel": "Target · 50.0% implied"
    },
    {
      "id": "pinnacle",
      "name": "Pinnacle",
      "priceLabel": "-150",
      "odds": -150,
      "fairProbability": 0.582,
      "weight": 5.0,
      "isTarget": false,
      "includedInConsensus": true,
      "subLabel": "58.2% no-vig · 5× weight"
    },
    {
      "id": "fanduel",
      "name": "FanDuel",
      "priceLabel": "-140",
      "odds": -140,
      "fairProbability": 0.568,
      "weight": 4.0,
      "subLabel": "56.8% no-vig · 4× weight"
    }
  ],
  "target": {
    "name": "Kalshi",
    "priceCents": 50.0,
    "odds": 100,
    "oddsLabel": "+100"
  },
  "signal": {
    "label": "Estimated value gap",
    "percent": 57.6,
    "leftLabel": "Market 50.0%",
    "rightLabel": "Fair 57.6%"
  },
  "stats": [
    {
      "label": "Price advantage",
      "value": "+7.6 pts",
      "isPositive": true
    },
    {
      "label": "Estimated EV after costs",
      "value": "+14.2%",
      "isPositive": true
    },
    {
      "label": "Consensus sources",
      "value": "2",
      "isPositive": false
    }
  ],
  "updatedAt": "2026-09-12T05:00:00Z",
  "sourceUrl": "https://kalshi.com/events/example",
  "disclaimer": "Informational estimate. Prices change and results are not guaranteed."
}
```

The target platform is always the first item in `sources`. If the other prediction
platform has the exact same event, market, side, and line, its price is included too.
Every other item identifies the sportsbook, its American odds, individual no-vig
probability, consensus weight, and whether it survived the outlier check. An excluded
price remains visible for transparency but has `includedInConsensus: false` and zero
weight.

#### Errors

| Status | Meaning |
| --- | --- |
| `404 Not Found` | The ID is not present in the current cached snapshot. Refresh the opportunity list. |
| `503 Service Unavailable` | Live market data could not be loaded. |

## Filter configuration

### `GET /api/filters/`

Returns the categories and dropdown options used by the EV Finder. The frontend uses
this route instead of hardcoding the controls.

#### Inputs

None.

#### Response — `200 OK`

```json
{
  "categories": [
    {"id": "", "label": "All"},
    {"id": "baseball_mlb", "label": "MLB"},
    {"id": "americanfootball_nfl", "label": "NFL"}
  ],
  "filters": [
    {
      "id": "platform",
      "label": "All platforms",
      "options": [
        {"value": "kalshi", "label": "Kalshi"},
        {"value": "polymarket", "label": "Polymarket"}
      ]
    },
    {
      "id": "market_type",
      "label": "All market types",
      "options": [
        {"value": "player_prop", "label": "Player props"},
        {"value": "game_prop", "label": "Game props"},
        {"value": "game_market", "label": "Game markets"}
      ]
    },
    {
      "id": "min_ev",
      "label": "Minimum EV",
      "options": [
        {"value": "0", "label": "All +EV"},
        {"value": "1", "label": "+1% or better"},
        {"value": "3", "label": "+3% or better"},
        {"value": "5", "label": "+5% or better"},
        {"value": "10", "label": "+10% or better"}
      ]
    }
  ]
}
```

## EV calculation

For every Kalshi or Polymarket outcome, the backend:

1. Matches the same sport, event, market, exact line, and side. Player props also
   require the same player and statistic.
2. Requires a complete two-sided reference market so its margin can be removed.
3. Converts each American price into implied probability.
4. Divides the selected probability by the sum of all probabilities in that book's
   matched market to create a no-vig probability.
5. Requires at least two usable reference sources, including a sportsbook baseline
   led by Pinnacle, then FanDuel and the remaining primary sportsbooks. A sole
   Pinnacle reference is allowed when no second book covers that exact market.
6. Rejects incomplete or malformed reference markets when the combined implied
   probability is below `90%` or above `130%`. For example, a two-sided `+400/+400`
   feed is not treated as a 50/50 market.
7. Requires the target payout to be better than the median matched sharp-book payout.
   A Kalshi `+317` target is therefore rejected when its sharp references are around
   `+400`.
8. Removes reference outliers that differ from the highest-priority available
   sportsbook baseline by more than 12 probability points or by more than a 2×
   probability-odds ratio. Excluded prices remain visible in opportunity details.
9. Calculates gross EV as `fair_probability × target_decimal_odds - 1`.
10. Subtracts `MARKET_DATA_COST_ALLOWANCE_PERCENT`, currently `1` percentage point.
11. Rejects the opportunity when consensus hit probability is below the configured
    hard floor, currently `30%`.
12. Returns the opportunity only when the resulting net EV is greater than zero.
13. Calculates `Kelly % = net edge ÷ (target decimal odds - 1)` for the detail view.
    Because every eligible result already clears the `30%` hit-probability floor, the
    feed ranks by net EV first, then hit probability and Kelly score as tie-breakers.

EV already includes win probability, but the product applies a separate minimum
hit-rate policy. A mathematically positive-EV longshot is omitted whenever its
consensus probability is below `30%`.

## Position sizing

Vantage uses fractional Kelly rather than a fixed one-percent unit for every pick. For
a binary position with fair win probability `p`, loss probability `q = 1 - p`, and net
profit multiple `b = decimal odds - 1`, full Kelly is:

```text
full Kelly fraction = (b × p - q) / b
                    = net EV / b
```

Because `p` is an estimate rather than a known probability, the product recommends
half Kelly by default:

```text
recommended fraction = min(max(0.5 × full Kelly, 2.5%), 5%)
recommended range     = 0.5% to 2.5%
maximum slider range  = 5%
recommended amount   = bankroll × recommended fraction
expected profit      = recommended amount × net EV
profit if win        = recommended amount × b
```

Dollar amounts are rounded down to cents. One unit is still defined as one percent of
bankroll for display. Vantage uses quarter Kelly, raises a smaller result to a 0.5%
minimum, and caps the recommendation at 2.5% of bankroll. The parlay slider may go to
5% when the user deliberately chooses a larger amount.

For a multi-leg build, the frontend multiplies independent leg probabilities and target
decimal odds, compounds the legs' net EV values, then applies the same 0.5%–2.5%
recommendation range with a separate 5% slider ceiling. Same-event builds remain blocked because their correlation is not
modeled.

### Consensus weights

| Source | Weight |
| --- | ---: |
| Pinnacle | 5.0 |
| FanDuel | 4.0 |
| Bookmaker.eu | 3.0 |
| Bet365 | 2.5 |
| Bovada | 2.5 |
| BetOnline | 2.5 |
| DraftKings | 2.0 |
| BetMGM | 2.0 |
| Caesars | 2.0 |
| BetRivers / Fanatics | 2.0 |
| Novig | 2.0 |
| ProphetX | 1.5 |
| Fliff / Hard Rock / Parx / Unibet / 10bet | 1.5 |
| Underdog | 1.0 |
| PrizePicks | 1.0 |
| Other prediction market | 0.75 |

A source is omitted when it has no exact equivalent prop or no usable two-sided
price. PropLine supplies the normalized live prices before the backend removes the
displayed two-sided margin.

## Live-data behavior

- The first opportunity request after a backend restart fetches Kalshi player props and game markets from PropLine, comparison prices from ParlayAPI, and Polymarket target markets from its gateway.
- Changing filters reads the current Django snapshot and does not spend API credits.
- `refresh=true` fetches fresh target and reference prices, then completely replaces the previous snapshot.
- Because snapshots are replaced rather than merged, a moved or withdrawn target line is updated or removed on refresh.
- The frontend provides a **Refresh odds** button that sends `refresh=true`; there is no timer, cron job, WebSocket, or background polling loop.
- A provider failure returns an error state rather than mock market prices.

## External services

### PropLine — Kalshi targets

```text
GET /sports/{sport}/events
GET /sports/{sport}/odds?markets=h2h,spreads,totals&bookmakers=kalshi&includeLinks=true
GET /sports/{sport}/events/{event_id}/odds?bookmakers=kalshi&includeLinks=true
```

PropLine provides only the actual Kalshi target prices and optional public Kalshi links.

### ParlayAPI — reference consensus

```text
GET /sports/{sport}/props
GET /sports/{sport}/odds
```

The request excludes Kalshi and Polymarket. It provides the independent book prices used to construct the fair-probability and EV estimate; it never creates a target opportunity.

### Polymarket gateway — Polymarket targets

```text
GET /v2/leagues/{slug}/events?active=true&closed=false
```

The gateway provides actual Polymarket target prices and market URLs.


### Supabase Auth — implemented

Current call:

```text
GET {SUPABASE_URL}/auth/v1/user
```

The backend forwards the user's bearer access token and the Supabase publishable key.
The frontend supports password sign-in, account creation, email confirmation, password
recovery, Google/Apple OAuth redirects, persisted sessions, automatic token refresh,
and sign-out. OAuth providers and redirect URLs must be enabled in the Supabase project.

Documentation: <https://supabase.com/docs/guides/auth/jwts>

### Market handoff — implemented

Each opportunity includes an `action.marketUrl` only when PropLine returns a public URL for that opportunity's actual target platform. The parlay builder displays a compact **Open market** link beside each selected leg. The handoff does not place an order or prefill an order on any platform.

No platform account, wallet, or trading credential is collected by Vantage.

### Capital One Nessie — waiting on provider access

The base URL and API-key environment variables exist, but no Nessie route or client is
implemented because the provider API is currently unavailable to the project.

## Environment variables

The following variable names are used by the current API. Do not place their values in
documentation or commit `backend/.env`.

```text
DJANGO_SECRET_KEY
DATABASE_URL
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
PARLAY_API_KEY
PARLAY_API_BASE_URL
POLYMARKET_US_API_BASE_URL
PERSONA_API_KEY
PERSONA_INQUIRY_TEMPLATE_ID
PERSONA_API_BASE_URL
PERSONA_API_VERSION
PERSONA_ENVIRONMENT_ID
PERSONA_WEBHOOK_SECRET
PERSONA_REQUEST_TIMEOUT_SECONDS
NESSIE_API_KEY
NESSIE_API_BASE_URL
CORS_ALLOWED_ORIGINS
```

Optional market-data settings:

```text
MARKET_DATA_SPORTS
MARKET_DATA_BOOKMAKERS
MARKET_DATA_MAX_AGE_SECONDS
MARKET_DATA_PROP_LIMIT
MARKET_DATA_REQUEST_TIMEOUT_SECONDS
MARKET_DATA_MIN_EV_PERCENT
MARKET_DATA_MIN_HIT_PROBABILITY_PERCENT
MARKET_DATA_COST_ALLOWANCE_PERCENT
MARKET_DATA_KELLY_FRACTION
```

## Routes not implemented yet

The frontend contains service placeholders for additional routes, but the backend does
not currently provide them:

```text
GET /api/opportunities/{id}/
GET /api/account/
GET /api/sports/
GET /api/market-health/
GET /api/data-freshness/
GET /api/markets/
GET /api/markets/{id}/
```

Watchlists, alerts, history, parlays, and Gemini explanations also do not have backend
endpoints yet.
