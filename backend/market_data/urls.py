from django.urls import path

from .views import (
    CurrentUserProfileView,
    FilterConfigView,
    HealthView,
    OpportunityDetailView,
    OpportunityListView,
    PersonaInquiryView,
    PersonaWebhookView,
    SettingsView,
)

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("profile/", CurrentUserProfileView.as_view(), name="current-user-profile"),
    path("settings/", SettingsView.as_view(), name="settings"),
    path(
        "persona/inquiries/",
        PersonaInquiryView.as_view(),
        name="persona-inquiry",
    ),
    path("persona/webhook/", PersonaWebhookView.as_view(), name="persona-webhook"),
    path("opportunities/", OpportunityListView.as_view(), name="opportunity-list"),
    path(
        "opportunities/<str:opportunity_id>/detail/",
        OpportunityDetailView.as_view(),
        name="opportunity-detail",
    ),
    path("filters/", FilterConfigView.as_view(), name="filter-config"),
]
