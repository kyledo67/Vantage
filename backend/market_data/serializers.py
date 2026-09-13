from rest_framework import serializers

from .eligibility import serialize_profile_eligibility
from django.utils import timezone

from .models import SavedParlay, UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    eligibility = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = (
            "uid",
            "is_age_verified",
            "residence_country_code",
            "residence_subdivision",
            "eligibility",
            "verification_status",
            "markets",
            "bankroll",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "uid",
            "is_age_verified",
            "residence_country_code",
            "residence_subdivision",
            "eligibility",
            "verification_status",
            "created_at",
            "updated_at",
        )
        extra_kwargs = {
            # The authenticated profile POST is an explicit setup flow. A profile
            # retrieved for onboarding may begin at the model default, but it
            # cannot be deliberately created without an analysis bankroll.
            "bankroll": {"required": True},
        }

    def get_eligibility(self, obj):
        return serialize_profile_eligibility(obj)

    def validate_bankroll(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Enter a bankroll greater than zero to use position sizing."
            )
        return value


class SavedParlaySerializer(serializers.ModelSerializer):
    """Camel-case API representation consumed by the React parlay screens."""

    estimatedEdge = serializers.CharField(source="estimated_edge", required=False, allow_blank=True)
    estimatedChance = serializers.CharField(source="estimated_chance", required=False, allow_blank=True)
    positionSizing = serializers.JSONField(source="position_sizing", required=False)
    settledAt = serializers.DateTimeField(source="settled_at", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = SavedParlay
        fields = (
            "id",
            "name",
            "selections",
            "estimatedEdge",
            "estimatedChance",
            "positionSizing",
            "outcome",
            "settledAt",
            "createdAt",
            "updatedAt",
        )
        read_only_fields = ("id", "settledAt", "createdAt", "updatedAt")

    def validate_name(self, value):
        value = value.strip()
        return value or "Untitled parlay"

    def validate_selections(self, value):
        if not isinstance(value, list) or not value:
            raise serializers.ValidationError("A saved parlay needs at least one selection.")
        return value

    def update(self, instance, validated_data):
        outcome = validated_data.get("outcome")
        if outcome is not None:
            instance.settled_at = (
                timezone.now() if outcome != SavedParlay.Outcome.PENDING else None
            )
        return super().update(instance, validated_data)
