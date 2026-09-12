from rest_framework import serializers

from .models import UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = (
            "uid",
            "is_age_verified",
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
            "verification_status",
            "created_at",
            "updated_at",
        )

    def validate_max_position_percent(self, value):
        if value > 100:
            raise serializers.ValidationError("Must be no greater than 100 percent.")
        return value
