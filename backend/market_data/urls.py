from django.urls import path

from .views import CurrentUserProfileView, HealthView

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("profile/", CurrentUserProfileView.as_view(), name="current-user-profile"),
]
