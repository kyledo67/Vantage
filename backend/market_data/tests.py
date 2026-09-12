from unittest.mock import Mock, patch
from uuid import UUID

from django.test import override_settings
from rest_framework.test import APITestCase

from .models import UserProfile


@override_settings(
    SUPABASE_URL="https://example.supabase.co",
    SUPABASE_PUBLISHABLE_KEY="test-publishable-key",
)
class CurrentUserProfileTests(APITestCase):
    uid = UUID("11111111-1111-1111-1111-111111111111")
    url = "/api/profile/"

    def setUp(self):
        response = Mock(status_code=200)
        response.json.return_value = {"id": str(self.uid), "email": "user@example.com"}
        self.auth_request = patch(
            "market_data.authentication.requests.get", return_value=response
        )
        self.auth_request.start()
        self.addCleanup(self.auth_request.stop)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer valid-access-token")

    def test_authentication_is_required(self):
        self.client.credentials()
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 401)

    def test_create_and_get_current_user_profile(self):
        create_response = self.client.post(
            self.url,
            {
                "markets": "both",
                "bankroll": "500.00",
                "max_position_percent": "5.00",
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(create_response.data["uid"], str(self.uid))
        self.assertFalse(create_response.data["is_age_verified"])

        get_response = self.client.get(self.url)
        self.assertEqual(get_response.status_code, 200)
        self.assertEqual(get_response.data["bankroll"], "500.00")

    def test_patch_updates_only_user_editable_fields(self):
        UserProfile.objects.create(uid=self.uid, bankroll="100.00")

        response = self.client.patch(
            self.url,
            {
                "markets": "kalshi",
                "bankroll": "250.00",
                "is_age_verified": True,
                "verification_status": "verified",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        profile = UserProfile.objects.get(uid=self.uid)
        self.assertEqual(profile.markets, "kalshi")
        self.assertEqual(str(profile.bankroll), "250.00")
        self.assertFalse(profile.is_age_verified)
        self.assertEqual(profile.verification_status, "not_started")

    def test_rejects_invalid_market_and_position_percent(self):
        response = self.client.post(
            self.url,
            {"markets": "sportsbook", "max_position_percent": "101.00"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("markets", response.data)
        self.assertIn("max_position_percent", response.data)
