from dataclasses import dataclass
from uuid import UUID

import requests
from django.conf import settings
from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed


@dataclass(frozen=True)
class SupabaseUser:
    """The minimum authenticated-user interface required by DRF."""

    id: UUID
    email: str | None = None

    @property
    def is_authenticated(self):
        return True


class SupabaseAuthentication(BaseAuthentication):
    """Validate a Supabase access token with the project's Auth server."""

    def authenticate(self, request):
        header = get_authorization_header(request).split()
        if not header:
            return None
        if len(header) != 2 or header[0].lower() != b"bearer":
            raise AuthenticationFailed("Use an Authorization: Bearer <token> header.")

        if not settings.SUPABASE_URL or not settings.SUPABASE_PUBLISHABLE_KEY:
            raise AuthenticationFailed("Supabase authentication is not configured.")

        token = header[1].decode("utf-8")
        try:
            response = requests.get(
                f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/user",
                headers={
                    "apikey": settings.SUPABASE_PUBLISHABLE_KEY,
                    "Authorization": f"Bearer {token}",
                },
                timeout=5,
            )
        except requests.RequestException as exc:
            raise AuthenticationFailed("Authentication service is unavailable.") from exc

        if response.status_code != 200:
            raise AuthenticationFailed("Invalid or expired access token.")

        try:
            payload = response.json()
            user = SupabaseUser(id=UUID(payload["id"]), email=payload.get("email"))
        except (KeyError, TypeError, ValueError) as exc:
            raise AuthenticationFailed("Supabase returned an invalid user record.") from exc

        return user, token

    def authenticate_header(self, request):
        return "Bearer"
