from django.contrib import admin

from .models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = (
        "uid",
        "verification_status",
        "is_age_verified",
        "residence_country_code",
        "markets",
        "bankroll",
        "updated_at",
    )
    list_filter = (
        "verification_status",
        "is_age_verified",
        "residence_country_code",
        "markets",
    )
    search_fields = ("uid", "persona_inquiry_id")

# Register your models here.
