from unittest.mock import Mock, patch
from uuid import UUID
from datetime import datetime

from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APITestCase

from .models import UserProfile
from .clients import KalshiAPIClient, ParlayAPIClient, PolymarketAPIClient
from .opportunities import (
    OpportunityService,
    build_game_opportunities,
    build_prop_opportunities,
)
from .target_markets import (
    merge_direct_targets,
    normalize_kalshi_events,
    normalize_polymarket_events,
)


@override_settings(
    SUPABASE_URL="https://example.supabase.co",
    SUPABASE_PUBLISHABLE_KEY="test-publishable-key",
)
class CurrentUserProfileTests(APITestCase):
    uid = UUID("11111111-1111-1111-1111-111111111111")
    url = "/api/profile/"

    def setUp(self):
        response = Mock(status_code=200)
        response.json.return_value = {"id": str(self.uid), "email": "user@example.com"}
        self.auth_request = patch(
            "market_data.authentication.requests.get", return_value=response
        )
        self.auth_request.start()
        self.addCleanup(self.auth_request.stop)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer valid-access-token")

    def test_authentication_is_required(self):
        self.client.credentials()
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 401)

    def test_create_and_get_current_user_profile(self):
        create_response = self.client.post(
            self.url,
            {
                "markets": "both",
                "bankroll": "500.00",
                "max_position_percent": "5.00",
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(create_response.data["uid"], str(self.uid))
        self.assertFalse(create_response.data["is_age_verified"])

        get_response = self.client.get(self.url)
        self.assertEqual(get_response.status_code, 200)
        self.assertEqual(get_response.data["bankroll"], "500.00")

    def test_patch_updates_only_user_editable_fields(self):
        UserProfile.objects.create(uid=self.uid, bankroll="100.00")

        response = self.client.patch(
            self.url,
            {
                "markets": "kalshi",
                "bankroll": "250.00",
                "is_age_verified": True,
                "verification_status": "verified",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        profile = UserProfile.objects.get(uid=self.uid)
        self.assertEqual(profile.markets, "kalshi")
        self.assertEqual(str(profile.bankroll), "250.00")
        self.assertFalse(profile.is_age_verified)
        self.assertEqual(profile.verification_status, "not_started")

    def test_rejects_invalid_market_and_position_percent(self):
        response = self.client.post(
            self.url,
            {"markets": "sportsbook", "max_position_percent": "101.00"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("markets", response.data)
        self.assertIn("max_position_percent", response.data)


@override_settings(
    MARKET_DATA_COST_ALLOWANCE_PERCENT=1.0,
    MARKET_DATA_MAX_AGE_SECONDS=180,
)
class OpportunityCalculationTests(TestCase):
    def row(self, source, line=8.5, over_price=120, under_price=-130):
        source_titles = {"fanduel": "FanDuel", "pinnacle": "Pinnacle"}
        return {
            "event_id": "event-1",
            "sport_key": "americanfootball_nfl",
            "away_team": "Away Team",
            "home_team": "Home Team",
            "commence_time": "2026-09-13T01:00:00Z",
            "source": source,
            "source_title": source_titles.get(source, source.title()),
            "player_name": "Test Player",
            "market_key": "player_receptions",
            "market_label": "Receptions",
            "line": line,
            "over_price": over_price,
            "under_price": under_price,
            "snapshot_time": "2026-09-12T01:00:00Z",
            "age_seconds": 10,
        }

    def test_calculates_net_ev_from_matching_no_vig_sharp_line(self):
        results = build_prop_opportunities(
            [
                self.row("kalshi"),
                self.row("pinnacle", over_price=-150, under_price=130),
                self.row("fanduel", over_price=-145, under_price=125),
            ]
        )

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["platform"]["name"], "Kalshi")
        self.assertGreater(results[0]["ev"]["value"], 0)
        self.assertEqual(results[0]["_detail"]["sources"][0]["name"], "Kalshi")
        self.assertTrue(results[0]["_detail"]["sources"][0]["isTarget"])
        self.assertEqual(results[0]["_detail"]["sources"][1]["name"], "Pinnacle")
        self.assertEqual(results[0]["price"]["oddsLabel"], "+120")

    def test_does_not_match_different_prop_line(self):
        rows = [
            self.row("kalshi", line=8.5),
            self.row("pinnacle", line=9.5, over_price=-150, under_price=130),
        ]

        self.assertEqual(build_prop_opportunities(rows), [])

    def test_rejects_worse_target_price_even_if_reference_normalization_is_odd(self):
        rows = [
            self.row("kalshi", over_price=317, under_price=-400),
            self.row("pinnacle", over_price=400, under_price=-500),
            self.row("fanduel", over_price=400, under_price=-500),
        ]

        self.assertEqual(build_prop_opportunities(rows), [])

    def test_rejects_malformed_two_sided_reference_underround(self):
        rows = [
            self.row("kalshi", over_price=317, under_price=-400),
            self.row("pinnacle", over_price=400, under_price=400),
        ]

        self.assertEqual(build_prop_opportunities(rows), [])

    def test_builds_weighted_consensus_and_exposes_source_odds(self):
        result = build_prop_opportunities(
            [
                self.row("kalshi"),
                self.row("pinnacle", over_price=-150, under_price=130),
                self.row("fanduel", over_price=-140, under_price=120),
            ]
        )[0]

        self.assertEqual(result["price"]["source"], "Kalshi")
        self.assertEqual(result["price"]["oddsLabel"], "+120")
        self.assertEqual(result["consensus"]["sourceCount"], 2)
        self.assertEqual(
            [source["name"] for source in result["_detail"]["sources"]],
            ["Kalshi", "Pinnacle", "FanDuel"],
        )
        self.assertEqual(result["_detail"]["sources"][1]["priceLabel"], "-150")

    def test_target_is_first_and_other_prediction_market_is_shown_when_matched(self):
        results = build_prop_opportunities(
            [
                self.row("kalshi"),
                self.row("polymarket", over_price=115, under_price=-125),
                self.row("pinnacle", over_price=-150, under_price=130),
                self.row("fanduel", over_price=-140, under_price=120),
            ]
        )
        kalshi_result = next(
            result for result in results if result["platform"]["name"] == "Kalshi"
        )
        polymarket_result = next(
            result
            for result in results
            if result["platform"]["name"] == "Polymarket"
        )

        source_names = [
            source["name"] for source in kalshi_result["_detail"]["sources"]
        ]
        self.assertEqual(source_names[0], "Kalshi")
        self.assertIn("Polymarket", source_names)
        polymarket_sources = [
            source["name"]
            for source in polymarket_result["_detail"]["sources"]
        ]
        self.assertEqual(polymarket_sources[0], "Polymarket")
        self.assertIn("Kalshi", polymarket_sources)

    def test_prophetx_outlier_does_not_create_false_value(self):
        rows = [
            self.row("kalshi", over_price=203, under_price=-230),
            self.row("pinnacle", over_price=200, under_price=-230),
            self.row("unibet", over_price=200, under_price=-230),
            self.row("prophetx", over_price=-148, under_price=125),
        ]

        self.assertEqual(build_prop_opportunities(rows), [])

    def test_prophetx_outlier_is_visible_but_excluded_from_valid_consensus(self):
        rows = [
            self.row("kalshi", over_price=-105, under_price=-110),
            self.row("pinnacle", over_price=-150, under_price=130),
            self.row("unibet", over_price=-145, under_price=125),
            self.row("prophetx", over_price=200, under_price=-230),
        ]

        result = build_prop_opportunities(rows)[0]
        prophetx = next(
            source
            for source in result["_detail"]["sources"]
            if source["id"] == "prophetx"
        )

        self.assertEqual(result["consensus"]["sourceCount"], 2)
        self.assertFalse(prophetx["includedInConsensus"])
        self.assertEqual(prophetx["weight"], 0)
        self.assertEqual(result["_detail"]["sources"][0]["id"], "kalshi")

    def test_allows_pinnacle_as_the_only_reference_for_niche_market_coverage(self):
        results = build_prop_opportunities(
            [
                self.row("kalshi"),
                self.row("pinnacle", over_price=-150, under_price=130),
            ]
        )

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["consensus"]["sources"], ["Pinnacle"])

    def test_rejects_high_ev_longshot_below_probability_floor(self):
        longshot = build_prop_opportunities(
            [
                self.row("kalshi", over_price=600, under_price=-700),
                self.row("pinnacle", over_price=400, under_price=-500),
                self.row("fanduel", over_price=390, under_price=-490),
            ]
        )
        balanced_target = self.row("kalshi", over_price=110, under_price=-125)
        balanced_target["event_id"] = "event-2"
        balanced_sharp = self.row("pinnacle", over_price=-125, under_price=105)
        balanced_sharp["event_id"] = "event-2"
        balanced_secondary = self.row("fanduel", over_price=-120, under_price=100)
        balanced_secondary["event_id"] = "event-2"
        balanced = build_prop_opportunities(
            [balanced_target, balanced_sharp, balanced_secondary]
        )[0]

        self.assertEqual(longshot, [])
        self.assertGreaterEqual(balanced["evaluation"]["hitProbability"], 50)

    def test_allows_positive_ev_selection_between_thirty_and_fifty_percent(self):
        result = build_prop_opportunities(
            [
                self.row("kalshi", over_price=220, under_price=-250),
                self.row("pinnacle", over_price=180, under_price=-210),
                self.row("fanduel", over_price=175, under_price=-205),
            ]
        )[0]

        self.assertGreaterEqual(result["evaluation"]["hitProbability"], 30)
        self.assertLess(result["evaluation"]["hitProbability"], 50)
        self.assertGreater(result["ev"]["value"], 0)

    def test_rejects_target_plus_130_when_sharps_offer_plus_160(self):
        results = build_prop_opportunities(
            [
                self.row("kalshi", over_price=130, under_price=-200),
                self.row("pinnacle", over_price=160, under_price=-180),
                self.row("fanduel", over_price=155, under_price=-175),
            ]
        )

        self.assertEqual(results, [])

    def test_rejects_explicitly_stale_target_row(self):
        target = self.row("kalshi")
        target["age_seconds"] = 181
        sharp = self.row("pinnacle", over_price=-150, under_price=130)

        self.assertEqual(build_prop_opportunities([target, sharp]), [])


@override_settings(
    MARKET_DATA_COST_ALLOWANCE_PERCENT=1.0,
    MARKET_DATA_MAX_AGE_SECONDS=180,
)
class GameOpportunityCalculationTests(TestCase):
    def event(self, target_point=None, sharp_point=None):
        market_key = "h2h" if target_point is None else "spreads"
        return {
            "id": "event-1",
            "canonical_event_id": "canonical-1",
            "sport_key": "americanfootball_nfl",
            "away_team": "Away Team",
            "home_team": "Home Team",
            "commence_time": "2026-09-13T01:00:00Z",
            "bookmakers": [
                {
                    "key": "kalshi",
                    "title": "Kalshi",
                    "stale_seconds": 10,
                    "markets": [
                        {
                            "key": market_key,
                            "last_update": "2026-09-12T01:00:00Z",
                            "outcomes": [
                                {"name": "Home Team", "point": target_point, "price": 200},
                                {"name": "Away Team", "point": -target_point if target_point else None, "price": -250},
                            ],
                        }
                    ],
                },
                {
                    "key": "pinnacle",
                    "title": "Pinnacle",
                    "stale_seconds": 10,
                    "markets": [
                        {
                            "key": market_key,
                            "last_update": "2026-09-12T01:00:00Z",
                            "outcomes": [
                                {"name": "Home Team", "point": sharp_point, "price": -150},
                                {"name": "Away Team", "point": -sharp_point if sharp_point else None, "price": 130},
                            ],
                        }
                    ],
                },
                {
                    "key": "fanduel",
                    "title": "FanDuel",
                    "stale_seconds": 10,
                    "markets": [
                        {
                            "key": market_key,
                            "last_update": "2026-09-12T01:00:00Z",
                            "outcomes": [
                                {"name": "Home Team", "point": sharp_point, "price": -145},
                                {"name": "Away Team", "point": -sharp_point if sharp_point else None, "price": 125},
                            ],
                        }
                    ],
                },
            ],
        }

    def test_calculates_game_market_ev_and_exposes_target_odds(self):
        result = build_game_opportunities([self.event()])[0]

        self.assertEqual(result["_meta"]["market_type"], "game_market")
        self.assertEqual(result["market"]["title"], "Moneyline")
        self.assertEqual(result["price"]["oddsLabel"], "+200")
        self.assertEqual(result["_detail"]["sources"][0]["priceLabel"], "+200")
        self.assertEqual(result["_detail"]["sources"][1]["priceLabel"], "-150")

    def test_does_not_compare_different_spread_lines(self):
        self.assertEqual(
            build_game_opportunities([self.event(target_point=-2.5, sharp_point=-3.5)]),
            [],
        )

    def test_rejects_malformed_game_reference_underround(self):
        event = self.event()
        event["bookmakers"][1]["markets"][0]["outcomes"] = [
            {"name": "Home Team", "price": 400},
            {"name": "Away Team", "price": 400},
        ]

        self.assertEqual(build_game_opportunities([event]), [])

    def test_drops_game_target_older_than_configured_max_age(self):
        event = self.event()
        event["bookmakers"][0]["stale_seconds"] = 181

        self.assertEqual(build_game_opportunities([event]), [])

    def test_rejects_one_sided_target_attached_to_game(self):
        event = self.event()
        event["bookmakers"][0]["markets"][0]["outcomes"] = [
            {"name": "Home Team", "price": 2400}
        ]

        self.assertEqual(build_game_opportunities([event]), [])

    def test_rejects_game_that_already_started(self):
        event = self.event()
        event["commence_time"] = "2020-01-01T00:00:00Z"

        self.assertEqual(build_game_opportunities([event]), [])


class DirectTargetNormalizationTests(TestCase):
    def test_kalshi_total_corner_contract_uses_executable_asks(self):
        events = [
            {
                "series_ticker": "KXEPLCORNERS",
                "title": "Aston Villa vs Nottingham Forest: Total Corners",
                "sub_title": "AVL vs NFO (Sep 12)",
                "markets": [
                    {
                        "status": "active",
                        "floor_strike": 10,
                        "yes_ask_dollars": "0.54",
                        "no_ask_dollars": "0.47",
                    }
                ],
            }
        ]

        games, props = normalize_kalshi_events(
            "soccer_epl", "total_corners", events
        )

        self.assertEqual(props, [])
        self.assertEqual(games[0]["kind"], "corners")
        market = games[0]["book"]["markets"][0]
        self.assertEqual(market["description"], "Total Corners")
        self.assertEqual(market["outcomes"][0]["point"], 10.0)
        self.assertEqual(market["outcomes"][1]["price"], 113)

    def test_polymarket_team_total_selects_team_after_colon(self):
        events = [
            {
                "title": "Chelsea FC vs. Hull City AFC - More Markets",
                "slug": "chelsea-hull-more-markets",
                "endDate": "2026-09-12T14:00:00Z",
                "markets": [
                    {
                        "active": True,
                        "closed": False,
                        "question": "Chelsea FC vs. Hull City AFC: Hull City AFC O/U 2.5",
                        "sportsMarketType": "soccer_team_totals",
                        "line": 2.5,
                        "outcomes": '["Over", "Under"]',
                        "bestAsk": 0.045,
                        "bestBid": 0.04,
                    }
                ],
            }
        ]

        _, props = normalize_polymarket_events("soccer_epl", events)

        self.assertEqual(len(props), 1)
        self.assertEqual(props[0]["player_name"], "Hull City AFC")
        self.assertEqual(props[0]["over_price"], 2122)

    def test_direct_corner_target_only_merges_into_corner_reference_event(self):
        reference_events = [
            {
                "id": "normal",
                "sport_key": "soccer_epl",
                "commence_time": "2026-09-12T14:00:00Z",
                "home_team": "Aston Villa FC",
                "away_team": "Nottingham Forest FC",
                "bookmakers": [],
            },
            {
                "id": "corners",
                "sport_key": "soccer_epl",
                "commence_time": "2026-09-12T14:00:00Z",
                "home_team": "Aston Villa (Corners)",
                "away_team": "Nottingham Forest (Corners)",
                "bookmakers": [],
            },
        ]
        target = {
            "sport_key": "soccer_epl",
            "teams": ("Aston Villa", "Nottingham Forest"),
            "event_date": datetime(2026, 9, 12).date(),
            "kind": "corners",
            "platform": "kalshi",
            "book": {"key": "kalshi", "markets": []},
        }

        merged, _ = merge_direct_targets(reference_events, [], [target], [])

        self.assertEqual(merged[0]["bookmakers"], [])
        self.assertEqual(merged[1]["bookmakers"][0]["key"], "kalshi")

    def test_direct_prop_replaces_older_copy_from_same_target_platform(self):
        reference = {
            "event_id": "event-1",
            "sport_key": "soccer_epl",
            "commence_time": "2026-09-12T14:00:00Z",
            "home_team": "Chelsea FC",
            "away_team": "Hull City AFC",
            "source": "polymarket",
            "player_name": "Hull City",
            "market_key": "soccer_team_totals",
            "line": 2.5,
            "over_price": 900,
            "under_price": -1000,
        }
        sharp = {**reference, "source": "pinnacle"}
        target = {
            "sport_key": "soccer_epl",
            "teams": ("Chelsea", "Hull City"),
            "event_date": datetime(2026, 9, 12).date(),
            "source": "polymarket",
            "source_title": "Polymarket",
            "player_name": "Hull City AFC",
            "market_key": "team_totals",
            "line": 2.5,
            "over_price": 1200,
            "under_price": -1300,
        }

        _, merged = merge_direct_targets([], [reference, sharp], [], [target])

        polymarket_rows = [row for row in merged if row["source"] == "polymarket"]
        self.assertEqual(len(polymarket_rows), 1)
        self.assertEqual(polymarket_rows[0]["over_price"], 1200)
        self.assertIn(sharp, merged)

@override_settings(
    PARLAY_API_KEY="test-key",
    PARLAY_API_BASE_URL="https://parlay-api.test/v1",
    MARKET_DATA_REQUEST_TIMEOUT_SECONDS=15,
    MARKET_DATA_MAX_AGE_SECONDS=180,
    MARKET_DATA_PROP_LIMIT=10000,
    MARKET_DATA_BOOKMAKERS=["kalshi", "pinnacle"],
)
class ParlayAPIClientTests(TestCase):
    def test_get_props_uses_live_flat_props_endpoint_and_unwraps_payload(self):
        response = Mock(status_code=200, headers={})
        response.json.return_value = {"props": [{"source": "kalshi"}]}
        session = Mock()
        session.get.return_value = response
        client = ParlayAPIClient(session=session, sleep=Mock())

        result = client.get_props("baseball_mlb")

        self.assertEqual(result, [{"source": "kalshi"}])
        _, kwargs = session.get.call_args
        self.assertEqual(
            session.get.call_args.args[0],
            "https://parlay-api.test/v1/sports/baseball_mlb/props",
        )
        self.assertEqual(kwargs["headers"], {"X-API-Key": "test-key"})
        self.assertEqual(kwargs["params"]["oddsFormat"], "american")
        self.assertEqual(kwargs["params"]["maxAgeSec"], 180)

    def test_get_game_odds_requests_target_and_reference_books(self):
        response = Mock(status_code=200, headers={})
        response.json.return_value = {"events": [{"id": "event-1"}]}
        session = Mock()
        session.get.return_value = response
        client = ParlayAPIClient(session=session, sleep=Mock())

        result = client.get_game_odds("baseball_mlb")

        self.assertEqual(result, [{"id": "event-1"}])
        _, kwargs = session.get.call_args
        self.assertEqual(
            session.get.call_args.args[0],
            "https://parlay-api.test/v1/sports/baseball_mlb/odds",
        )
        self.assertEqual(kwargs["params"]["markets"], "h2h,spreads,totals")
        self.assertIn("kalshi", kwargs["params"]["bookmakers"])


@override_settings(
    KALSHI_API_BASE_URL="https://kalshi.test/trade-api/v2",
    POLYMARKET_GAMMA_API_BASE_URL="https://gamma.test",
    MARKET_DATA_REQUEST_TIMEOUT_SECONDS=15,
)
class DirectMarketClientTests(TestCase):
    def test_kalshi_requests_open_nested_series_events(self):
        response = Mock(status_code=200)
        response.json.return_value = {"events": [{"event_ticker": "event-1"}], "cursor": ""}
        session = Mock()
        session.get.return_value = response

        result = KalshiAPIClient(session=session, sleep=Mock()).get_events(
            "KXEPLCORNERS"
        )

        self.assertEqual(result, [{"event_ticker": "event-1"}])
        _, kwargs = session.get.call_args
        self.assertEqual(kwargs["params"]["series_ticker"], "KXEPLCORNERS")
        self.assertEqual(kwargs["params"]["status"], "open")
        self.assertEqual(kwargs["params"]["with_nested_markets"], "true")

    def test_polymarket_requests_active_open_series_events(self):
        response = Mock(status_code=200)
        response.json.return_value = [{"id": "event-1"}]
        session = Mock()
        session.get.return_value = response

        result = PolymarketAPIClient(session=session, sleep=Mock()).get_events(
            "10188"
        )

        self.assertEqual(result, [{"id": "event-1"}])
        _, kwargs = session.get.call_args
        self.assertEqual(kwargs["params"]["series_id"], "10188")
        self.assertEqual(kwargs["params"]["active"], "true")
        self.assertEqual(kwargs["params"]["closed"], "false")


@override_settings(
    MARKET_DATA_SPORTS=["americanfootball_nfl"],
    MARKET_DATA_COST_ALLOWANCE_PERCENT=1.0,
    MARKET_DATA_MAX_AGE_SECONDS=180,
)
class OpportunityRefreshTests(TestCase):
    def setUp(self):
        cache.clear()
        self.target = OpportunityCalculationTests().row("kalshi")
        self.sharp = OpportunityCalculationTests().row(
            "pinnacle", over_price=-150, under_price=130
        )
        self.secondary = OpportunityCalculationTests().row(
            "fanduel", over_price=-145, under_price=125
        )

    def tearDown(self):
        cache.clear()

    def test_explicit_refresh_replaces_removed_or_changed_target(self):
        client = Mock()
        client.get_props.side_effect = [
            [self.target, self.sharp, self.secondary],
            [self.sharp, self.secondary],
        ]
        client.get_game_odds.return_value = []
        service = OpportunityService(client=client)

        first = service.list({}, force_refresh=True)
        old_id = first["results"][0]["id"]
        second = service.list({}, force_refresh=True)

        self.assertEqual(len(first["results"]), 1)
        self.assertEqual(second["results"], [])
        self.assertIsNone(service.detail(old_id))
        self.assertEqual(client.get_props.call_count, 2)

    def test_filtering_reuses_snapshot_without_polling_upstream(self):
        client = Mock()
        client.get_props.return_value = [self.target, self.sharp, self.secondary]
        client.get_game_odds.return_value = []
        service = OpportunityService(client=client)

        service.list({}, force_refresh=True)
        service.list({"platform": "kalshi"})

        self.assertEqual(client.get_props.call_count, 1)

    def test_minimum_probability_filter_hides_lower_hit_chances(self):
        client = Mock()
        client.get_props.return_value = [self.target, self.sharp, self.secondary]
        client.get_game_odds.return_value = []
        service = OpportunityService(client=client)

        visible = service.list({"min_probability": "50"}, force_refresh=True)
        hidden = service.list({"min_probability": "60"})

        self.assertEqual(len(visible["results"]), 1)
        self.assertEqual(hidden["results"], [])

    def test_default_feed_orders_eligible_results_by_ev_descending(self):
        low_target = OpportunityCalculationTests().row(
            "kalshi", over_price=-105, under_price=-110
        )
        low_target["event_id"] = "low-event"
        low_sharp = OpportunityCalculationTests().row(
            "pinnacle", over_price=-150, under_price=130
        )
        low_sharp["event_id"] = "low-event"
        low_secondary = OpportunityCalculationTests().row(
            "fanduel", over_price=-145, under_price=125
        )
        low_secondary["event_id"] = "low-event"

        high_target = OpportunityCalculationTests().row("kalshi")
        high_target["event_id"] = "high-event"
        high_sharp = OpportunityCalculationTests().row(
            "pinnacle", over_price=-150, under_price=130
        )
        high_sharp["event_id"] = "high-event"
        high_secondary = OpportunityCalculationTests().row(
            "fanduel", over_price=-145, under_price=125
        )
        high_secondary["event_id"] = "high-event"

        client = Mock()
        client.get_props.return_value = [
            low_target,
            low_sharp,
            low_secondary,
            high_target,
            high_sharp,
            high_secondary,
        ]
        client.get_game_odds.return_value = []

        results = OpportunityService(client=client).list(
            {}, force_refresh=True
        )["results"]

        self.assertGreater(results[0]["ev"]["value"], results[1]["ev"]["value"])


class OpportunityEndpointTests(APITestCase):
    @patch("market_data.views.opportunity_service.list")
    def test_opportunity_list_returns_frontend_contract(self, mock_list):
        mock_list.return_value = {
            "live": {"isLive": True, "updatedAt": "2026-09-12T01:00:00Z"},
            "results": [{"id": "kalshi-test"}],
        }

        response = self.client.get("/api/opportunities/")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["live"]["isLive"])
        self.assertEqual(response.data["results"][0]["id"], "kalshi-test")
        mock_list.assert_called_once_with(response.wsgi_request.GET, force_refresh=False)

    @patch("market_data.views.opportunity_service.list")
    def test_refresh_query_forces_new_upstream_snapshot(self, mock_list):
        mock_list.return_value = {"live": {"isLive": True}, "results": []}

        response = self.client.get("/api/opportunities/?refresh=true")

        self.assertEqual(response.status_code, 200)
        mock_list.assert_called_once_with(response.wsgi_request.GET, force_refresh=True)

    @patch("market_data.views.opportunity_service.detail")
    def test_opportunity_detail(self, mock_detail):
        mock_detail.return_value = {"sources": [], "stats": []}

        response = self.client.get("/api/opportunities/kalshi-test/detail/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["sources"], [])

    def test_filters(self):
        response = self.client.get("/api/filters/")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["categories"])
        self.assertEqual(response.data["filters"][0]["id"], "platform")
