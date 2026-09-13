"""Conservative age and residence checks for supported prediction markets.

These checks are a pre-screen for Vantage. Kalshi and Polymarket US remain the
authority on whether an individual can open an account or place a trade.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass


POLICY_CHECKED_ON = "2026-09-12"

# Kalshi Member Agreement, section VI, effective June 17, 2026.
# https://kalshi.com/docs/kalshi-member-agreement.pdf
KALSHI_RESTRICTED_COUNTRIES = frozenset(
    {
        "AF", "DZ", "AO", "AU", "BY", "BE", "BO", "BG", "BF", "CM",
        "CA", "CF", "CI", "CU", "CD", "ET", "FR", "HT", "HU", "IN",
        "IR", "IQ", "IE", "IT", "KE", "LA", "LB", "LY", "ML", "MC",
        "MZ", "MM", "NA", "NZ", "NI", "NE", "KP", "CN", "PL", "PT",
        "RU", "SG", "SO", "SS", "SD", "CH", "SY", "TW", "TH", "UA",
        "AE", "GB", "VE", "YE", "ZW",
    }
)

# Polymarket US is the CFTC-regulated U.S. product and is currently built for
# U.S. residents. The platform remains authoritative during onboarding and at
# trade time.
# https://docs.polymarket.us/getting-started/what-is-polymarket-us
POLYMARKET_US_ALLOWED_COUNTRIES = frozenset({"US"})


@dataclass(frozen=True)
class EligibilityDecision:
    eligible: bool
    status: str
    reason: str

    def as_dict(self):
        return asdict(self)


def _normalize(value):
    return str(value or "").strip().upper()


def _pending(reason):
    return EligibilityDecision(False, "verification_required", reason)


def evaluate_platform_eligibility(
    *,
    is_age_verified: bool,
    residence_country_code: str,
    residence_subdivision: str = "",
):
    """Return conservative pre-screening decisions for each target platform."""

    if not is_age_verified:
        decision = _pending("Complete Persona identity and 18+ verification first.")
        return {"kalshi": decision, "polymarket": decision}

    country = _normalize(residence_country_code)
    if len(country) != 2 or not country.isalpha():
        decision = _pending(
            "Persona must provide a verified two-letter country of residence."
        )
        return {"kalshi": decision, "polymarket": decision}

    if country in KALSHI_RESTRICTED_COUNTRIES:
        kalshi = EligibilityDecision(
            False,
            "residence_restricted",
            "Kalshi currently restricts event-contract trading for this residence.",
        )
    else:
        kalshi = EligibilityDecision(
            True,
            "eligible",
            "Age and residence pass Vantage's current Kalshi pre-screen.",
        )

    if country not in POLYMARKET_US_ALLOWED_COUNTRIES:
        polymarket = EligibilityDecision(
            False,
            "residence_restricted",
            "Polymarket US is currently built for U.S. residents.",
        )
    else:
        polymarket = EligibilityDecision(
            True,
            "eligible",
            "Age and U.S. residence pass Vantage's current Polymarket US pre-screen.",
        )

    return {"kalshi": kalshi, "polymarket": polymarket}


def serialize_profile_eligibility(profile):
    decisions = evaluate_platform_eligibility(
        is_age_verified=profile.is_age_verified,
        residence_country_code=profile.residence_country_code,
        residence_subdivision=profile.residence_subdivision,
    )
    eligible_markets = [
        platform for platform, decision in decisions.items() if decision.eligible
    ]
    selected_markets = (
        ["kalshi", "polymarket"]
        if profile.markets == profile.MarketChoice.BOTH
        else [profile.markets]
    )
    return {
        "is_eligible": any(
            decisions[platform].eligible for platform in selected_markets
        ),
        "is_residence_verified": bool(
            profile.is_age_verified and profile.residence_country_code
        ),
        "eligible_markets": eligible_markets,
        "platforms": {
            platform: decision.as_dict()
            for platform, decision in decisions.items()
        },
        "policy_checked_on": POLICY_CHECKED_ON,
        "disclaimer": (
            "This is a preliminary age-and-residence check. Each platform makes the final decision and may also use current physical location."
        ),
    }
