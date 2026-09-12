import time

import requests
from django.conf import settings


class MarketDataError(Exception):
    pass


class PublicMarketClient:
    """Small retrying client for public, unauthenticated market-data APIs."""

    retryable_statuses = {429, 502, 503, 504}
    provider_name = "Market data provider"

    def __init__(self, base_url, session=None, sleep=time.sleep):
        self.base_url = base_url.rstrip("/")
        self.timeout = settings.MARKET_DATA_REQUEST_TIMEOUT_SECONDS
        self.session = session or requests
        self.sleep = sleep

    def _get(self, path, params=None):
        response = None
        for attempt in range(2):
            try:
                response = self.session.get(
                    f"{self.base_url}{path}", params=params, timeout=self.timeout
                )
            except requests.RequestException as exc:
                if attempt == 0:
                    self.sleep(1)
                    continue
                raise MarketDataError(
                    f"{self.provider_name} could not be reached."
                ) from exc

            if response.status_code not in self.retryable_statuses or attempt == 1:
                break
            self.sleep(1)

        if response is None:
            raise MarketDataError(f"{self.provider_name} could not be reached.")
        if response.status_code != 200:
            raise MarketDataError(
                f"{self.provider_name} returned HTTP {response.status_code}."
            )
        try:
            return response.json()
        except ValueError as exc:
            raise MarketDataError(
                f"{self.provider_name} returned invalid JSON."
            ) from exc


class KalshiAPIClient(PublicMarketClient):
    provider_name = "Kalshi"

    def __init__(self, session=None, sleep=time.sleep):
        super().__init__(settings.KALSHI_API_BASE_URL, session=session, sleep=sleep)

    def get_events(self, series_ticker):
        events = []
        cursor = None
        for _ in range(5):
            params = {
                "series_ticker": series_ticker,
                "status": "open",
                "with_nested_markets": "true",
                "limit": 200,
            }
            if cursor:
                params["cursor"] = cursor
            payload = self._get("/events", params=params)
            if not isinstance(payload, dict) or not isinstance(
                payload.get("events"), list
            ):
                raise MarketDataError("Kalshi returned an unexpected events response.")
            events.extend(payload["events"])
            cursor = payload.get("cursor")
            if not cursor:
                break
        return events


class PolymarketAPIClient(PublicMarketClient):
    provider_name = "Polymarket"

    def __init__(self, session=None, sleep=time.sleep):
        super().__init__(
            settings.POLYMARKET_GAMMA_API_BASE_URL,
            session=session,
            sleep=sleep,
        )

    def get_events(self, series_id):
        events = []
        offset = 0
        for _ in range(5):
            payload = self._get(
                "/events",
                params={
                    "series_id": series_id,
                    "active": "true",
                    "closed": "false",
                    "limit": 100,
                    "offset": offset,
                },
            )
            if not isinstance(payload, list):
                raise MarketDataError(
                    "Polymarket returned an unexpected events response."
                )
            events.extend(payload)
            if len(payload) < 100:
                break
            offset += len(payload)
        return events


class ParlayAPIClient:
    """HTTP client for ParlayAPI's normalized live sportsbook feed."""

    retryable_statuses = {429, 502, 503, 504}

    def __init__(self, session=None, sleep=time.sleep):
        self.base_url = settings.PARLAY_API_BASE_URL.rstrip("/")
        self.api_key = settings.PARLAY_API_KEY
        self.timeout = settings.MARKET_DATA_REQUEST_TIMEOUT_SECONDS
        self.session = session or requests
        self.sleep = sleep

    def _get(self, path, params=None):
        if not self.api_key:
            raise MarketDataError("ParlayAPI key is not configured.")

        response = None
        for attempt in range(2):
            try:
                response = self.session.get(
                    f"{self.base_url}{path}",
                    params=params,
                    headers={"X-API-Key": self.api_key},
                    timeout=self.timeout,
                )
            except requests.RequestException as exc:
                if attempt == 0:
                    self.sleep(1)
                    continue
                raise MarketDataError("ParlayAPI could not be reached.") from exc

            if response.status_code not in self.retryable_statuses or attempt == 1:
                break

            retry_after = response.headers.get("Retry-After")
            try:
                delay = max(1, min(int(retry_after), 5))
            except (TypeError, ValueError):
                delay = 1
            self.sleep(delay)

        if response is None:
            raise MarketDataError("ParlayAPI could not be reached.")
        if response.status_code == 401:
            raise MarketDataError("ParlayAPI rejected the configured API key.")
        if response.status_code == 403:
            raise MarketDataError(
                "ParlayAPI credits are exhausted or this endpoint is unavailable on the current plan."
            )
        if response.status_code == 429:
            raise MarketDataError("ParlayAPI rate limit has been reached.")
        if response.status_code != 200:
            request_id = response.headers.get("X-Request-ID")
            suffix = f" Request ID: {request_id}." if request_id else ""
            raise MarketDataError(f"ParlayAPI returned HTTP {response.status_code}.{suffix}")

        try:
            return response.json()
        except ValueError as exc:
            raise MarketDataError("ParlayAPI returned invalid JSON.") from exc

    def get_props(self, sport):
        payload = self._get(
            f"/sports/{sport}/props",
            params={
                "bookmakers": ",".join(settings.MARKET_DATA_BOOKMAKERS),
                "oddsFormat": "american",
                "dfsOdds": "midpoint",
                "include_event_markets": "true",
                "maxAgeSec": settings.MARKET_DATA_MAX_AGE_SECONDS,
                "limit": settings.MARKET_DATA_PROP_LIMIT,
            },
        )

        if isinstance(payload, list):
            return payload
        if isinstance(payload, dict):
            for key in ("props", "results", "data"):
                if isinstance(payload.get(key), list):
                    return payload[key]
        raise MarketDataError(
            "ParlayAPI returned an unexpected player-props response."
        )

    def get_game_odds(self, sport):
        payload = self._get(
            f"/sports/{sport}/odds",
            params={
                "regions": "us",
                "markets": "h2h,spreads,totals",
                "bookmakers": ",".join(settings.MARKET_DATA_BOOKMAKERS),
                "oddsFormat": "american",
                "dateFormat": "iso",
                "include": "verification",
            },
        )

        if isinstance(payload, list):
            return payload
        if isinstance(payload, dict):
            for key in ("events", "results", "data"):
                if isinstance(payload.get(key), list):
                    return payload[key]
        raise MarketDataError(
            "ParlayAPI returned an unexpected game-odds response."
        )
