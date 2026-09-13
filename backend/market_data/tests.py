import hashlib
import hmac
import json
import time
from decimal import Decimal
from unittest.mock import Mock, patch
from uuid import UUID
from datetime import datetime, timedelta, timezone

from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APITestCase

from .eligibility import evaluate_platform_eligibility
from .models import SavedParlay, UserProfile
from .clients import (
    KalshiAPIClient,
    ParlayAPIClient,
    PolymarketAPIClient,
    PropLineAPIClient,
)
from .opportunities import (
    OpportunityService,
    build_game_opportunities,
    build_prop_opportunities,
    personalized_position_sizing,
    probability_aware_evaluation,
)
from .persona import PersonaInquirySession, verify_persona_signature
from .serializers import UserProfileSerializer
from .target_markets import (
    merge_direct_targets,
    normalize_kalshi_events,
    normalize_polymarket_events,
)


TEST_FUTURE_TIME = (
    datetime.now(timezone.utc) + timedelta(days=7)
).replace(microsecond=0).isoformat()


class PlatformEligibilityTests(TestCase):
    def test_us_resident_passes_both_platform_checks(self):
        decisions = evaluate_platform_eligibility(
            is_age_verified=True,
            residence_country_code="US",
        )

        self.assertTrue(decisions["kalshi"].eligible)
        self.assertTrue(decisions["polymarket"].eligible)

    def test_restricted_country_fails_both_platform_checks(self):
        decisions = evaluate_platform_eligibility(
            is_age_verified=True,
            residence_country_code="AU",
        )

        self.assertFalse(decisions["kalshi"].eligible)
        self.assertFalse(decisions["polymarket"].eligible)

    def test_polymarket_us_rejects_non_us_residence(self):
        decisions = evaluate_platform_eligibility(
            is_age_verified=True,
            residence_country_code="CA",
            residence_subdivision="Manitoba",
        )

        self.assertFalse(decisions["polymarket"].eligible)
        self.assertEqual(decisions["polymarket"].status, "residence_restricted")

    def test_age_and_country_are_both_required(self):
        underage = evaluate_platform_eligibility(
            is_age_verified=False,
            residence_country_code="US",
        )
        missing_country = evaluate_platform_eligibility(
            is_age_verified=True,
            residence_country_code="",
        )

        self.assertFalse(underage["kalshi"].eligible)
        self.assertFalse(missing_country["kalshi"].eligible)


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

    def test_rejects_invalid_market(self):
        response = self.client.post(
            self.url,
            {
                "markets": "sportsbook",
                "bankroll": "100.00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("markets", response.data)

    def test_rejects_zero_bankroll(self):
        response = self.client.post(
            self.url,
            {"bankroll": "0.00"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("bankroll", response.data)

    def test_profile_setup_requires_bankroll(self):
        response = self.client.post(self.url, {}, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertIn("bankroll", response.data)


@override_settings(
    SUPABASE_URL="https://example.supabase.co",
    SUPABASE_PUBLISHABLE_KEY="test-publishable-key",
)
class SavedParlayApiTests(APITestCase):
    uid = UUID("22222222-2222-2222-2222-222222222222")
    url = "/api/parlays/"

    def setUp(self):
        response = Mock(status_code=200)
        response.json.return_value = {"id": str(self.uid), "email": "parlays@example.com"}
        self.auth_request = patch(
            "market_data.authentication.requests.get", return_value=response
        )
        self.auth_request.start()
        self.addCleanup(self.auth_request.stop)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer valid-access-token")

    def payload(self):
        return {
            "name": "Saturday picks",
            "selections": [{"id": "selection-1", "selection": {"title": "Team A"}}],
            "estimatedEdge": "+4.2%",
            "estimatedChance": "51.0%",
            "positionSizing": {"selectedAmount": 25, "profitIfWin": 30},
        }

    def test_create_list_update_and_delete_own_saved_parlay(self):
        create_response = self.client.post(self.url, self.payload(), format="json")

        self.assertEqual(create_response.status_code, 201)
        parlay_id = create_response.data["id"]
        self.assertEqual(create_response.data["outcome"], "pending")
        self.assertEqual(create_response.data["name"], "Saturday picks")

        list_response = self.client.get(self.url)
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]["id"], parlay_id)

        detail_url = f"{self.url}{parlay_id}/"
        outcome_response = self.client.patch(detail_url, {"outcome": "won"}, format="json")
        self.assertEqual(outcome_response.status_code, 200)
        self.assertEqual(outcome_response.data["outcome"], "won")
        self.assertIsNotNone(outcome_response.data["settledAt"])

        delete_response = self.client.delete(detail_url)
        self.assertEqual(delete_response.status_code, 204)
        self.assertEqual(SavedParlay.objects.count(), 0)

    def test_cannot_read_another_users_saved_parlay(self):
        other_profile = UserProfile.objects.create(
            uid=UUID("33333333-3333-3333-3333-333333333333"), bankroll="100.00"
        )
        SavedParlay.objects.create(
            owner=other_profile,
            name="Other user's parlay",
            selections=[{"id": "other-selection"}],
        )

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])


@override_settings(
    MARKET_DATA_COST_ALLOWANCE_PERCENT=1.0,
    MARKET_DATA_MAX_AGE_SECONDS=180,
)
class OpportunityCalculationTests(TestCase):
    def row(self, source, line=8.5, over_price=120, under_price=-130):
        source_titles = {
            "fanduel": "FanDuel",
            "pinnacle": "Pinnacle",
            "polymarket": "Polymarket",
        }
        return {
            "event_id": "event-1",
            "sport_key": "americanfootball_nfl",
            "away_team": "Away Team",
            "home_team": "Home Team",
            "commence_time": TEST_FUTURE_TIME,
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
            "url": f"https://example.com/{source}/market",
        }

    def test_quarter_kelly_sizing_stays_below_the_user_maximum(self):
        opportunity = {
            "price": {"odds": 100},
            "ev": {"value": 10.0},
            "evaluation": {"kellyPercent": 10.0},
        }

        sizing = personalized_position_sizing(
            opportunity,
            bankroll="1000.00",
        )

        self.assertEqual(sizing["method"], "Quarter Kelly")
        self.assertEqual(sizing["uncappedPercent"], 2.5)
        self.assertEqual(sizing["recommendedPercent"], 2.5)
        self.assertEqual(sizing["maxPositionPercent"], 5.0)
        self.assertEqual(sizing["recommendedAmount"], 25.0)
        self.assertEqual(sizing["maximumAmount"], 50.0)
        self.assertEqual(sizing["expectedProfit"], 2.5)
        self.assertEqual(sizing["profitIfWin"], 25.0)
        self.assertEqual(sizing["unitSize"], 10.0)
        self.assertEqual(sizing["recommendedUnits"], 2.5)
        self.assertFalse(sizing["isCapped"])
        self.assertFalse(sizing["isMinimumApplied"])

    def test_position_sizing_applies_the_half_percent_minimum(self):
        sizing = personalized_position_sizing(
            {
                "price": {"odds": 100},
                "ev": {"value": 2.0},
                "evaluation": {"kellyPercent": 1.0},
            },
            bankroll="1000.00",
        )

        self.assertEqual(sizing["uncappedPercent"], 0.25)
        self.assertEqual(sizing["recommendedPercent"], 0.5)
        self.assertEqual(sizing["maximumAmount"], 50.0)
        self.assertTrue(sizing["isMinimumApplied"])

    def test_profit_if_win_uses_the_entire_recommended_stake(self):
        opportunity = {
            "price": {"odds": 203},
            "ev": {"value": 10.0},
            "evaluation": {"kellyPercent": 10.0},
        }

        sizing = personalized_position_sizing(
            opportunity,
            bankroll="1000.00",
        )

        # $25 at +203 buys the equivalent of about 75.76 33¢ contracts:
        # $75.75 total payout, or $50.75 profit before fees.
        self.assertEqual(sizing["recommendedAmount"], 25.0)
        self.assertEqual(sizing["profitIfWin"], 50.75)

    def test_probability_evaluation_exposes_half_kelly(self):
        evaluation = probability_aware_evaluation(0.60, 2.0, 20.0)

        self.assertEqual(evaluation["kellyPercent"], 20.0)
        self.assertEqual(evaluation["halfKellyPercent"], 10.0)

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
        self.assertEqual(results[0]["action"]["platform"], "kalshi")
        self.assertEqual(
            results[0]["action"]["marketUrl"],
            "https://example.com/kalshi/market",
        )
        self.assertFalse(results[0]["action"]["comboPrefillSupported"])

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

    def test_polymarket_target_never_returns_a_polymarket_dot_com_link(self):
        result = next(
            opportunity
            for opportunity in build_prop_opportunities(
                [
                    self.row("polymarket", over_price=120, under_price=-130),
                    self.row("pinnacle", over_price=-150, under_price=130),
                    self.row("fanduel", over_price=-145, under_price=125),
                ]
            )
            if opportunity["platform"]["name"] == "Polymarket"
        )

        self.assertEqual(
            result["action"]["marketUrl"], "https://polymarket.us/sports"
        )

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
            "commence_time": TEST_FUTURE_TIME,
            "bookmakers": [
                {
                    "key": "kalshi",
                    "title": "Kalshi",
                    "stale_seconds": 10,
                    "link": "https://kalshi.com/markets/kxnflgame",
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
        self.assertEqual(
            result["action"]["marketUrl"],
            "https://kalshi.com/markets/kxnflgame",
        )
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
                "event_ticker": "KXEPLCORNERS-26SEP12AVLNOT",
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
        self.assertEqual(
            games[0]["book"]["link"],
            "https://kalshi.com/markets/kxeplcorners/kxeplcorners-26sep12avlnot",
        )

    def test_polymarket_us_team_total_uses_side_quotes_and_direct_links(self):
        events = [
            {
                "title": "Chelsea FC vs. Hull City AFC - More Markets",
                "slug": "epl-che-hul-2026-09-12",
                "startTime": "2026-09-12T14:00:00Z",
                "markets": [
                    {
                        "active": True,
                        "closed": False,
                        "slug": "tsc-epl-che-hul-2026-09-12-tt-hul-2pt5",
                        "sportsMarketType": "soccer_team_full_game_total",
                        "sportsMarketTypeV2": "SPORTS_MARKET_TYPE_TOTAL",
                        "line": 2.5,
                        "marketSides": [
                            {
                                "id": "over-id",
                                "description": "Over",
                                "long": True,
                                "tradable": True,
                                "quote": {"value": "0.045"},
                                "team": {"name": "Hull City AFC"},
                            },
                            {
                                "id": "under-id",
                                "description": "Under",
                                "long": False,
                                "tradable": True,
                                "quote": {"value": "0.96"},
                                "team": {"name": "Hull City AFC"},
                            },
                        ],
                    }
                ],
            }
        ]

        _, props = normalize_polymarket_events("soccer_epl", events)

        self.assertEqual(len(props), 1)
        self.assertEqual(props[0]["player_name"], "Hull City AFC")
        self.assertEqual(props[0]["over_price"], 2122)
        self.assertEqual(
            props[0]["over_url"],
            "https://polymarket.us/sports/epl/epl-che-hul-2026-09-12"
            "?marketSlug=tsc-epl-che-hul-2026-09-12-tt-hul-2pt5&outcomeId=over-id",
        )

    def test_polymarket_us_moneyline_uses_executable_side_quotes(self):
        events = [
            {
                "title": "Colorado Rockies vs. Detroit Tigers",
                "slug": "mlb-col-det-2026-09-12",
                "startTime": "2026-09-12T17:10:00Z",
                "markets": [
                    {
                        "active": True,
                        "closed": False,
                        "slug": "aec-mlb-col-det-2026-09-12",
                        "sportsMarketType": "baseball_team_full_game_winner",
                        "sportsMarketTypeV2": "SPORTS_MARKET_TYPE_MONEYLINE",
                        "marketSides": [
                            {
                                "id": "rockies-id",
                                "description": "Colorado Rockies",
                                "long": True,
                                "tradable": True,
                                "quote": {"value": "0.40"},
                                "team": {"name": "Colorado Rockies"},
                            },
                            {
                                "id": "tigers-id",
                                "description": "Detroit Tigers",
                                "long": False,
                                "tradable": True,
                                "quote": {"value": "0.605"},
                                "team": {"name": "Detroit Tigers"},
                            },
                        ],
                    }
                ],
            }
        ]

        games, props = normalize_polymarket_events("baseball_mlb", events)

        self.assertEqual(props, [])
        outcomes = games[0]["book"]["markets"][0]["outcomes"]
        self.assertEqual(outcomes[0]["price"], 150)
        self.assertEqual(outcomes[1]["price"], -153)
        self.assertIn("polymarket.us/sports/mlb/", outcomes[0]["url"])
        self.assertIn("outcomeId=rockies-id", outcomes[0]["url"])

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
        self.assertNotIn("kalshi", kwargs["params"]["bookmakers"])
        self.assertNotIn("polymarket", kwargs["params"]["bookmakers"])

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
        self.assertNotIn("kalshi", kwargs["params"]["bookmakers"])
        self.assertNotIn("polymarket", kwargs["params"]["bookmakers"])

    def test_get_prediction_markets_requests_kalshi_aligned_sources(self):
        response = Mock(status_code=200, headers={})
        response.json.return_value = [{"source": "kalshi", "ticker": "KXTEST"}]
        session = Mock()
        session.get.return_value = response
        client = ParlayAPIClient(session=session, sleep=Mock())

        result = client.get_prediction_markets("baseball_mlb")

        self.assertEqual(result, [{"source": "kalshi", "ticker": "KXTEST"}])
        self.assertEqual(
            session.get.call_args.args[0],
            "https://parlay-api.test/v1/prediction-markets/baseball_mlb",
        )
        self.assertEqual(
            session.get.call_args.kwargs["params"]["sources"],
            "kalshi,polymarket,novig",
        )


@override_settings(
    PROPLINE_API_KEY="test-key",
    PROPLINE_API_BASE_URL="https://api.prop-line.test/v1",
    MARKET_DATA_REQUEST_TIMEOUT_SECONDS=15,
    MARKET_DATA_PROPLINE_EVENT_LIMIT=5,
)
class PropLineAPIClientTests(TestCase):
    @override_settings(PROPLINE_API_BASE_URL="https://api.prop-line.test/v1p")
    def test_corrects_a_mistyped_propline_v1p_base_url(self):
        self.assertEqual(
            PropLineAPIClient(session=Mock(), sleep=Mock()).base_url,
            "https://api.prop-line.test/v1",
        )

    def test_get_kalshi_props_normalizes_two_sided_player_contracts(self):
        events = Mock(status_code=200, headers={})
        events.json.return_value = [{"id": "event-1"}]
        odds = Mock(status_code=200, headers={})
        odds.json.return_value = {
            "id": "event-1",
            "sport_key": "baseball_mlb",
            "away_team": "Away Team",
            "home_team": "Home Team",
            "commence_time": TEST_FUTURE_TIME,
            "bookmakers": [
                {
                    "key": "kalshi",
                    "title": "Kalshi",
                    "link": "https://kalshi.com/markets/test-prop",
                    "markets": [
                        {
                            "key": "pitcher_strikeouts",
                            "description": "Pitcher Strikeouts",
                            "last_update": "2026-09-12T01:00:00Z",
                            "outcomes": [
                                {
                                    "name": "Over",
                                    "description": "Test Pitcher",
                                    "point": 5.5,
                                    "price": 125,
                                },
                                {
                                    "name": "Under",
                                    "description": "Test Pitcher",
                                    "point": 5.5,
                                    "price": -145,
                                },
                            ],
                        }
                    ],
                }
            ],
        }
        session = Mock()
        session.get.side_effect = [events, odds]

        rows = PropLineAPIClient(session=session, sleep=Mock()).get_kalshi_props(
            "baseball_mlb"
        )

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["source"], "kalshi")
        self.assertEqual(rows[0]["player_name"], "Test Pitcher")
        self.assertEqual(rows[0]["over_price"], 125)
        self.assertEqual(rows[0]["under_price"], -145)
        self.assertEqual(rows[0]["url"], "https://kalshi.com/markets/test-prop")
        self.assertEqual(
            session.get.call_args_list[1].args[0],
            "https://api.prop-line.test/v1/sports/baseball_mlb/events/event-1/odds",
        )
        self.assertEqual(
            session.get.call_args_list[1].kwargs["params"],
            {"bookmakers": "kalshi", "includeLinks": "true"},
        )

    def test_get_game_odds_keeps_all_propline_books_and_links(self):
        response = Mock(status_code=200, headers={})
        response.json.return_value = [
            {
                "id": "event-1",
                "sport_key": "baseball_mlb",
                "bookmakers": [
                    {
                        "key": "kalshi",
                        "title": "Kalshi",
                        "link": "https://kalshi.com/markets/test-game",
                        "markets": [],
                    },
                    {"key": "pinnacle", "title": "Pinnacle", "markets": []},
                ],
            }
        ]
        session = Mock()
        session.get.return_value = response

        events = PropLineAPIClient(session=session, sleep=Mock()).get_game_odds(
            "baseball_mlb"
        )

        self.assertEqual(events[0]["bookmakers"][0]["key"], "kalshi")
        self.assertEqual(events[0]["bookmakers"][1]["key"], "pinnacle")
        self.assertEqual(
            events[0]["bookmakers"][0]["link"],
            "https://kalshi.com/markets/test-game",
        )
        self.assertEqual(
            session.get.call_args.kwargs["params"],
            {
                "markets": "h2h,spreads,totals",
                "includeLinks": "true",
            },
        )


@override_settings(
    KALSHI_API_BASE_URL="https://kalshi.test/trade-api/v2",
    POLYMARKET_US_API_BASE_URL="https://polymarket-us.test",
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

    def test_polymarket_requests_active_open_us_league_events(self):
        response = Mock(status_code=200)
        response.json.return_value = {"events": [{"id": "event-1"}]}
        session = Mock()
        session.get.return_value = response

        result = PolymarketAPIClient(session=session, sleep=Mock()).get_events(
            "epl"
        )

        self.assertEqual(result, [{"id": "event-1"}])
        _, kwargs = session.get.call_args
        self.assertEqual(
            session.get.call_args.args[0],
            "https://polymarket-us.test/v2/leagues/epl/events",
        )
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

    def test_propline_kalshi_target_is_compared_with_cross_book_references(self):
        client = Mock()
        client.get_props.return_value = [self.sharp, self.secondary]
        client.get_game_odds.return_value = []
        propline = Mock()
        propline.get_props.return_value = [self.target, self.sharp, self.secondary]
        propline.get_game_odds.return_value = []
        polymarket = Mock()
        polymarket.get_events.return_value = []

        results = OpportunityService(
            client=client,
            propline_client=propline,
            polymarket_client=polymarket,
        ).list({}, force_refresh=True)["results"]

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["platform"]["name"], "Kalshi")
        propline.get_props.assert_called_once_with("americanfootball_nfl")
        client.get_props.assert_called_once_with("americanfootball_nfl")

    def test_refresh_does_not_call_direct_market_clients(self):
        client = Mock()
        client.get_props.return_value = [self.target, self.sharp, self.secondary]
        client.get_game_odds.return_value = []
        kalshi = Mock()

        OpportunityService(client=client, kalshi_client=kalshi).list({}, force_refresh=True)

        kalshi.get_events.assert_not_called()

    def test_kalshi_opportunities_keep_their_actual_source_and_link(self):
        client = Mock()
        client.get_props.return_value = [self.target, self.sharp, self.secondary]
        client.get_game_odds.return_value = []

        result = OpportunityService(client=client).list({}, force_refresh=True)["results"][0]

        self.assertEqual(result["platform"]["name"], "Kalshi")
        self.assertEqual(result["action"]["platform"], "kalshi")
        self.assertEqual(result["action"]["marketUrl"], self.target["url"])

    def test_feed_personalizes_quarter_kelly_amount_from_profile_settings(self):
        client = Mock()
        client.get_props.return_value = [self.target, self.sharp, self.secondary]
        client.get_game_odds.return_value = []
        service = OpportunityService(client=client)

        result = service.list(
            {},
            force_refresh=True,
            bankroll="200.00",
        )["results"][0]

        sizing = result["positionSizing"]
        self.assertTrue(sizing["isConfigured"])
        self.assertGreaterEqual(sizing["recommendedAmount"], 1.0)
        self.assertLessEqual(sizing["recommendedAmount"], 5.0)
        self.assertLessEqual(sizing["recommendedAmount"], sizing["maximumAmount"])
        self.assertEqual(
            sizing["expectedProfit"],
            int(sizing["recommendedAmount"] * result["ev"]["value"]) / 100,
        )

    def test_parlay_polymarket_rows_are_not_used_as_targets(self):
        client = Mock()
        client.get_props.return_value = [
            OpportunityCalculationTests().row("polymarket"),
            self.sharp,
            self.secondary,
        ]
        client.get_game_odds.return_value = []

        results = OpportunityService(client=client).list({}, force_refresh=True)["results"]

        self.assertEqual(results, [])

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

    @override_settings(
        SUPABASE_URL="https://example.supabase.co",
        SUPABASE_PUBLISHABLE_KEY="test-publishable-key",
    )
    @patch("market_data.views.opportunity_service.list")
    def test_authenticated_feed_uses_saved_bankroll_and_fixed_position_cap(self, mock_list):
        uid = UUID("55555555-5555-5555-5555-555555555555")
        auth_response = Mock(status_code=200)
        auth_response.json.return_value = {
            "id": str(uid),
            "email": "sizing@example.com",
        }
        mock_list.return_value = {"live": None, "results": []}
        UserProfile.objects.create(
            uid=uid,
            bankroll="250.00",
            max_position_percent="4.00",
        )
        self.client.credentials(HTTP_AUTHORIZATION="Bearer valid-access-token")

        with patch(
            "market_data.authentication.requests.get",
            return_value=auth_response,
        ):
            response = self.client.get("/api/opportunities/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(mock_list.call_args.kwargs["bankroll"], Decimal("250.00"))
        self.assertNotIn("max_position_percent", mock_list.call_args.kwargs)

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


@override_settings(
    SUPABASE_URL="https://example.supabase.co",
    SUPABASE_PUBLISHABLE_KEY="test-publishable-key",
)
class SettingsEndpointTests(APITestCase):
    uid = UUID("22222222-2222-2222-2222-222222222222")
    url = "/api/settings/"

    def setUp(self):
        response = Mock(status_code=200)
        response.json.return_value = {"id": str(self.uid), "email": "user@example.com"}
        self.auth_request = patch(
            "market_data.authentication.requests.get", return_value=response
        )
        self.auth_request.start()
        self.addCleanup(self.auth_request.stop)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer valid-access-token")

    def test_get_creates_profile_and_returns_authenticated_account(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(UserProfile.objects.filter(uid=self.uid).exists())
        account = response.data["sections"][0]
        self.assertEqual(account["fields"][0]["value"], "user@example.com")

    def test_patch_updates_only_supported_profile_setting(self):
        response = self.client.patch(
            self.url,
            {"fieldId": "bankroll", "value": "750.00"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(UserProfile.objects.get(uid=self.uid).bankroll, 750)

        read_only = self.client.patch(
            self.url,
            {"fieldId": "is_age_verified", "value": True},
            format="json",
        )
        self.assertEqual(read_only.status_code, 400)
        self.assertFalse(UserProfile.objects.get(uid=self.uid).is_age_verified)

    def test_authentication_is_required(self):
        self.client.credentials()
        self.assertEqual(self.client.get(self.url).status_code, 401)


@override_settings(
    SUPABASE_URL="https://example.supabase.co",
    SUPABASE_PUBLISHABLE_KEY="test-publishable-key",
    PERSONA_INQUIRY_TEMPLATE_ID="itmpl_test",
)
class PersonaInquiryEndpointTests(APITestCase):
    uid = UUID("33333333-3333-3333-3333-333333333333")

    def setUp(self):
        response = Mock(status_code=200)
        response.json.return_value = {"id": str(self.uid), "email": "user@example.com"}
        self.auth_request = patch(
            "market_data.authentication.requests.get", return_value=response
        )
        self.auth_request.start()
        self.addCleanup(self.auth_request.stop)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer valid-access-token")

    @patch("market_data.views.persona_client.get_or_create_inquiry")
    def test_inquiry_is_linked_to_authenticated_user(self, get_or_create):
        get_or_create.return_value = PersonaInquirySession(
            inquiry_id="inq_test",
            status="created",
            environment_id="env_test",
        )

        response = self.client.post("/api/persona/inquiries/", {}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["inquiryId"], "inq_test")
        self.assertTrue(response.data["launchable"])
        get_or_create.assert_called_once_with(self.uid, None)
        profile = UserProfile.objects.get(uid=self.uid)
        self.assertEqual(profile.persona_inquiry_id, "inq_test")
        self.assertEqual(profile.verification_status, "pending")


@override_settings(
    PERSONA_WEBHOOK_SECRET="webhook-secret",
    PERSONA_INQUIRY_TEMPLATE_ID="itmpl_test",
)
class PersonaWebhookTests(APITestCase):
    uid = UUID("44444444-4444-4444-4444-444444444444")

    def signed_request(self, payload, secret="webhook-secret"):
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        timestamp = str(int(time.time()))
        digest = hmac.new(
            secret.encode("utf-8"),
            timestamp.encode("utf-8") + b"." + body,
            hashlib.sha256,
        ).hexdigest()
        return self.client.post(
            "/api/persona/webhook/",
            data=body,
            content_type="application/json",
            HTTP_PERSONA_SIGNATURE=f"t={timestamp},v1={digest}",
        )

    def payload(self, status="approved", country="US", subdivision="Texas"):
        fields = {}
        if country:
            fields["address-country-code"] = {
                "type": "string",
                "value": country,
            }
        if subdivision:
            fields["address-subdivision"] = {
                "type": "string",
                "value": subdivision,
            }
        return {
            "data": {
                "type": "event",
                "id": "evt_test",
                "attributes": {
                    "name": f"inquiry.{status}",
                    "created-at": "2026-09-12T10:00:00Z",
                    "payload": {
                        "data": {
                            "type": "inquiry",
                            "id": "inq_test",
                            "attributes": {
                                "status": status,
                                "reference-id": str(self.uid),
                                "fields": fields,
                            },
                            "relationships": {
                                "inquiry-template": {
                                    "data": {
                                        "id": "itmpl_test",
                                        "type": "inquiry-template",
                                    }
                                }
                            },
                        }
                    },
                },
            }
        }

    def test_approved_webhook_marks_matching_profile_verified(self):
        UserProfile.objects.create(uid=self.uid, persona_inquiry_id="inq_test")

        response = self.signed_request(self.payload())

        self.assertEqual(response.status_code, 200)
        profile = UserProfile.objects.get(uid=self.uid)
        self.assertTrue(profile.is_age_verified)
        self.assertEqual(profile.verification_status, "verified")
        self.assertEqual(profile.residence_country_code, "US")
        self.assertEqual(profile.residence_subdivision, "TEXAS")

        serialized = UserProfileSerializer(profile).data
        self.assertTrue(serialized["eligibility"]["platforms"]["kalshi"]["eligible"])
        self.assertTrue(
            serialized["eligibility"]["platforms"]["polymarket"]["eligible"]
        )

    def test_approved_webhook_without_country_does_not_grant_market_access(self):
        UserProfile.objects.create(uid=self.uid, persona_inquiry_id="inq_test")

        response = self.signed_request(self.payload(country="", subdivision=""))

        self.assertEqual(response.status_code, 200)
        profile = UserProfile.objects.get(uid=self.uid)
        self.assertTrue(profile.is_age_verified)
        self.assertFalse(profile.has_verified_residence)
        self.assertFalse(UserProfileSerializer(profile).data["eligibility"]["is_eligible"])

    def test_invalid_signature_is_rejected(self):
        response = self.signed_request(self.payload(), secret="wrong-secret")

        self.assertEqual(response.status_code, 401)

    def test_expired_signature_is_rejected(self):
        body = b"{}"
        old_timestamp = str(int(time.time()) - 301)
        digest = hmac.new(
            b"webhook-secret",
            old_timestamp.encode("utf-8") + b"." + body,
            hashlib.sha256,
        ).hexdigest()

        self.assertFalse(
            verify_persona_signature(
                body,
                f"t={old_timestamp},v1={digest}",
                "webhook-secret",
            )
        )
