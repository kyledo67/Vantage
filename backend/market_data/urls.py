from django.urls import path

from .views import (
    CurrentUserProfileView,
    FilterConfigView,
    HealthView,
    OpportunityDetailView,
    OpportunityListView,
)

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("profile/", CurrentUserProfileView.as_view(), name="current-user-profile"),
    path("opportunities/", OpportunityListView.as_view(), name="opportunity-list"),
    path(
        "opportunities/<str:opportunity_id>/detail/",
        OpportunityDetailView.as_view(),
        name="opportunity-detail",
    ),
    path("filters/", FilterConfigView.as_view(), name="filter-config"),
]
