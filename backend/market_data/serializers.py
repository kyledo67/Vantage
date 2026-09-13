from rest_framework import serializers

from .eligibility import serialize_profile_eligibility
from .models import UserProfile


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
