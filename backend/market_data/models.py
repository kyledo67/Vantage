import uuid

from django.core.validators import MinValueValidator
from django.db import models


class UserProfile(models.Model):
    """A user's verified access status and self-declared risk settings."""

    class VerificationStatus(models.TextChoices):
        NOT_STARTED = "not_started", "Not started"
        PENDING = "pending", "Pending"
        VERIFIED = "verified", "Verified"
        DECLINED = "declined", "Declined"

    class MarketChoice(models.TextChoices):
        KALSHI = "kalshi", "Kalshi"
        POLYMARKET = "polymarket", "Polymarket US"
        BOTH = "both", "Kalshi and Polymarket US"

    # Match this value to the authenticated Supabase user's UUID when creating a profile.
    uid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    persona_inquiry_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    persona_event_created_at = models.DateTimeField(null=True, blank=True)
    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.NOT_STARTED,
    )
    is_age_verified = models.BooleanField(default=False)
    residence_country_code = models.CharField(
        max_length=2,
        blank=True,
        help_text="Persona-verified ISO 3166-1 alpha-2 country of residence.",
    )
    residence_subdivision = models.CharField(
        max_length=64,
        blank=True,
        help_text="Persona-verified state, province, or region of residence.",
    )
    markets = models.CharField(
        max_length=20,
        choices=MarketChoice.choices,
        default=MarketChoice.BOTH,
    )
    bankroll = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Amount the user has chosen to allocate for prediction markets.",
    )
    max_position_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=5,
        validators=[MinValueValidator(0)],
        help_text="Maximum percentage of bankroll allowed on one opportunity.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user_profiles"

    def __str__(self):
        return str(self.uid)

    @property
    def has_verified_residence(self):
        return self.is_age_verified and bool(self.residence_country_code)


class SavedParlay(models.Model):
    """A user's saved hypothetical parlay analysis.

    The owner is the authenticated user's existing Supabase-backed profile.
    No order, payment, or third-party-market credentials are recorded here.
    """

    class Outcome(models.TextChoices):
        PENDING = "pending", "Pending"
        WON = "won", "Won"
        LOST = "lost", "Lost"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="saved_parlays",
        db_column="owner_uid",
    )
    name = models.CharField(max_length=120, default="Untitled parlay")
    selections = models.JSONField(default=list)
    estimated_edge = models.CharField(max_length=32, blank=True)
    estimated_chance = models.CharField(max_length=32, blank=True)
    position_sizing = models.JSONField(default=dict)
    outcome = models.CharField(
        max_length=10,
        choices=Outcome.choices,
        default=Outcome.PENDING,
    )
    settled_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "saved_parlays"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.owner_id}: {self.name}"
