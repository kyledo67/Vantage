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
            "max_position_percent",
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

    def get_eligibility(self, obj):
        return serialize_profile_eligibility(obj)

    def validate_max_position_percent(self, value):
        if value > 100:
            raise serializers.ValidationError("Must be no greater than 100 percent.")
        return value
