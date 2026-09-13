import json
from uuid import UUID

from django.conf import settings
from django.utils.dateparse import parse_datetime
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .authentication import SupabaseAuthentication
from .clients import MarketDataError
from .eligibility import serialize_profile_eligibility
from .models import SavedParlay, UserProfile
from .opportunities import filter_config, opportunity_service
from .persona import (
    PersonaAPIError,
    extract_residence,
    persona_client,
    verify_persona_signature,
)
from .serializers import SavedParlaySerializer, UserProfileSerializer


PERSONA_PROFILE_STATUS = {
    "approved": UserProfile.VerificationStatus.VERIFIED,
    "declined": UserProfile.VerificationStatus.DECLINED,
    "failed": UserProfile.VerificationStatus.DECLINED,
    "expired": UserProfile.VerificationStatus.DECLINED,
}


def position_sizing_context(request):
    user = getattr(request, "user", None)
    if not getattr(user, "is_authenticated", False):
        return {}
    profile = UserProfile.objects.filter(uid=user.id).only("bankroll").first()
    if profile is None:
        return {}
    return {"bankroll": profile.bankroll}


def sync_profile_verification(
    profile, persona_status, residence_country_code="", residence_subdivision=""
):
    if residence_country_code:
        profile.residence_country_code = residence_country_code
    if residence_subdivision:
        profile.residence_subdivision = residence_subdivision
    profile_status = PERSONA_PROFILE_STATUS.get(
        persona_status, UserProfile.VerificationStatus.PENDING
    )
    if (
        profile.verification_status == UserProfile.VerificationStatus.VERIFIED
        and profile_status != UserProfile.VerificationStatus.VERIFIED
    ):
        return
    profile.verification_status = profile_status
    profile.is_age_verified = profile_status == UserProfile.VerificationStatus.VERIFIED


def build_settings_response(profile, email):
    serialized = UserProfileSerializer(profile).data
    eligibility = serialized["eligibility"]
    verification_label = dict(UserProfile.VerificationStatus.choices).get(
        profile.verification_status, profile.verification_status
    )
    verification_fields = [
        {
            "id": "verification_status",
            "label": "Identity and age verification",
            "description": "Persona confirms the verification rules configured for this app.",
            "type": "text",
            "value": verification_label,
            "readOnly": True,
        },
        {
            "id": "residence_country_code",
            "label": "Verified residence country",
            "description": "ISO country code supplied by the approved Persona inquiry.",
            "type": "text",
            "value": profile.residence_country_code or "Not verified",
            "readOnly": True,
        },
        {
            "id": "kalshi_eligibility",
            "label": "Kalshi eligibility pre-screen",
            "description": eligibility["platforms"]["kalshi"]["reason"],
            "type": "text",
            "value": eligibility["platforms"]["kalshi"]["status"].replace("_", " ").title(),
            "readOnly": True,
        },
        {
            "id": "polymarket_eligibility",
            "label": "Polymarket US eligibility pre-screen",
            "description": eligibility["platforms"]["polymarket"]["reason"],
            "type": "text",
            "value": eligibility["platforms"]["polymarket"]["status"].replace("_", " ").title(),
            "readOnly": True,
        },
        {
            "id": "is_age_verified",
            "label": "18+ verified",
            "description": "This does not replace Kalshi or Polymarket US location and eligibility checks.",
            "type": "toggle",
            "value": profile.is_age_verified,
            "readOnly": True,
        },
    ]
    if not profile.has_verified_residence:
        verification_fields.append(
            {
                "id": "persona_verification",
                "label": "Verify with Persona",
                "description": "Complete secure identity, age, and country-of-residence verification.",
                "type": "action",
                "actionLabel": (
                    "Continue verification"
                    if profile.persona_inquiry_id
                    else "Start verification"
                ),
            }
        )

    return {
        "sections": [
            {
                "id": "account",
                "title": "Account",
                "description": "Your authenticated Vantage account.",
                "fields": [
                    {
                        "id": "email",
                        "label": "Email address",
                        "description": "Managed by Supabase Auth.",
                        "type": "email",
                        "value": email or "",
                        "readOnly": True,
                    }
                ],
            },
            {
                "id": "verification",
                "title": "Verification",
                "description": "Human and age verification status from Persona.",
                "fields": verification_fields,
            },
            {
                "id": "risk",
                "title": "Markets and risk",
                "description": "These preferences personalize analysis and position guidance.",
                "fields": [
                    {
                        "id": "markets",
                        "label": "Prediction markets",
                        "description": "Choose the platforms you use.",
                        "type": "select",
                        "value": serialized["markets"],
                        "options": [
                            {"value": value, "label": label}
                            for value, label in UserProfile.MarketChoice.choices
                        ],
                    },
                    {
                        "id": "bankroll",
                        "label": "Analysis bankroll",
                        "description": "Amount allocated for prediction-market positions.",
                        "type": "text",
                        "value": serialized["bankroll"],
                    },
                ],
            },
        ]
    }


class HealthView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        return Response(
            {
                "status": "ok",
                "integrations": {
                    "nessie": bool(settings.NESSIE_API_KEY),
                    "persona": bool(settings.PERSONA_API_KEY)
                    and bool(settings.PERSONA_INQUIRY_TEMPLATE_ID),
                    "persona_webhook": bool(settings.PERSONA_WEBHOOK_SECRET),
                    "parlay_api": bool(settings.PARLAY_API_KEY),
                    "propline": bool(settings.PROPLINE_API_KEY),
                    "polymarket": bool(settings.POLYMARKET_US_API_BASE_URL),
                    "supabase": bool(settings.SUPABASE_URL),
                },
            }
        )


class CurrentUserProfileView(APIView):
    authentication_classes = [SupabaseAuthentication]
    permission_classes = [IsAuthenticated]

    def get_profile(self, request):
        return UserProfile.objects.filter(uid=request.user.id).first()

    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(uid=request.user.id)
        return Response(UserProfileSerializer(profile).data)

    def post(self, request):
        if self.get_profile(request) is not None:
            return Response(
                {"detail": "Profile already exists."},
                status=status.HTTP_409_CONFLICT,
            )

        serializer = UserProfileSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(uid=request.user.id)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def patch(self, request):
        profile, _ = UserProfile.objects.get_or_create(uid=request.user.id)

        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class SettingsView(APIView):
    authentication_classes = [SupabaseAuthentication]
    permission_classes = [IsAuthenticated]
    editable_fields = {"markets", "bankroll"}

    def get_profile(self, request):
        profile, _ = UserProfile.objects.get_or_create(uid=request.user.id)
        return profile

    def get(self, request):
        return Response(build_settings_response(self.get_profile(request), request.user.email))

    def patch(self, request):
        field_id = request.data.get("fieldId")
        if field_id not in self.editable_fields:
            return Response(
                {"detail": "That setting is read-only or does not exist."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if "value" not in request.data:
            return Response(
                {"detail": "A value is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile = self.get_profile(request)
        serializer = UserProfileSerializer(
            profile,
            data={field_id: request.data["value"]},
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(build_settings_response(profile, request.user.email))


class SavedParlayListView(APIView):
    """List and create saved parlays for the authenticated Supabase user only."""

    authentication_classes = [SupabaseAuthentication]
    permission_classes = [IsAuthenticated]

    def get_profile(self, request):
        profile, _ = UserProfile.objects.get_or_create(uid=request.user.id)
        return profile

    def get(self, request):
        parlays = SavedParlay.objects.filter(owner=self.get_profile(request))
        return Response(SavedParlaySerializer(parlays, many=True).data)

    def post(self, request):
        serializer = SavedParlaySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        parlay = serializer.save(owner=self.get_profile(request))
        return Response(SavedParlaySerializer(parlay).data, status=status.HTTP_201_CREATED)


class SavedParlayDetailView(APIView):
    """Update or remove exactly one of the requesting user's saved parlays."""

    authentication_classes = [SupabaseAuthentication]
    permission_classes = [IsAuthenticated]

    def get_object(self, request, parlay_id):
        return SavedParlay.objects.filter(id=parlay_id, owner_id=request.user.id).first()

    def patch(self, request, parlay_id):
        parlay = self.get_object(request, parlay_id)
        if parlay is None:
            return Response({"detail": "Saved parlay not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = SavedParlaySerializer(parlay, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, parlay_id):
        parlay = self.get_object(request, parlay_id)
        if parlay is None:
            return Response({"detail": "Saved parlay not found."}, status=status.HTTP_404_NOT_FOUND)
        parlay.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PersonaInquiryView(APIView):
    authentication_classes = [SupabaseAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile, _ = UserProfile.objects.get_or_create(uid=request.user.id)
        if profile.has_verified_residence:
            eligibility = serialize_profile_eligibility(profile)
            return Response(
                {
                    "status": "approved",
                    "verified": True,
                    "eligibility": eligibility,
                    "launchable": False,
                }
            )

        try:
            inquiry = persona_client.get_or_create_inquiry(
                request.user.id, profile.persona_inquiry_id
            )
        except PersonaAPIError as exc:
            return Response(
                {"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        profile.persona_inquiry_id = inquiry.inquiry_id
        sync_profile_verification(
            profile,
            inquiry.status,
            inquiry.residence_country_code,
            inquiry.residence_subdivision,
        )
        profile.save(
            update_fields=[
                "persona_inquiry_id",
                "verification_status",
                "is_age_verified",
                "residence_country_code",
                "residence_subdivision",
                "updated_at",
            ]
        )

        if inquiry.launchable and not inquiry.environment_id:
            return Response(
                {"detail": "Persona environment ID is not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {
                "inquiryId": inquiry.inquiry_id,
                "sessionToken": inquiry.session_token,
                "environmentId": inquiry.environment_id,
                "status": inquiry.status,
                "verified": profile.has_verified_residence,
                "eligibility": serialize_profile_eligibility(profile),
                "launchable": inquiry.launchable,
            }
        )


class PersonaWebhookView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        raw_body = request.body
        signature = request.headers.get("Persona-Signature", "")
        if not verify_persona_signature(
            raw_body, signature, settings.PERSONA_WEBHOOK_SECRET
        ):
            return Response(
                {"detail": "Invalid Persona signature."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            event = json.loads(raw_body)
            event_attributes = event["data"]["attributes"]
            event_name = event_attributes["name"]
            inquiry = event_attributes["payload"]["data"]
            inquiry_id = inquiry["id"]
            inquiry_attributes = inquiry["attributes"]
            persona_status = inquiry_attributes.get("status") or event_name.removeprefix(
                "inquiry."
            )
        except (KeyError, TypeError, ValueError, json.JSONDecodeError):
            return Response(
                {"detail": "Invalid Persona event."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not event_name.startswith("inquiry."):
            return Response({"received": True})

        profile = UserProfile.objects.filter(persona_inquiry_id=inquiry_id).first()
        reference_id = inquiry_attributes.get("reference-id")
        if profile is None and reference_id:
            try:
                profile = UserProfile.objects.filter(uid=UUID(reference_id)).first()
            except (TypeError, ValueError):
                profile = None
        if profile is None:
            return Response({"received": True})

        relationships = inquiry.get("relationships") or {}
        template_relation = (
            relationships.get("inquiry-template") or relationships.get("template") or {}
        )
        template_id = (template_relation.get("data") or {}).get("id")
        if template_id and template_id != settings.PERSONA_INQUIRY_TEMPLATE_ID:
            return Response({"received": True})

        event_created_at = parse_datetime(event_attributes.get("created-at") or "")
        if (
            event_created_at
            and profile.persona_event_created_at
            and event_created_at <= profile.persona_event_created_at
        ):
            return Response({"received": True})

        profile.persona_inquiry_id = inquiry_id
        if event_created_at:
            profile.persona_event_created_at = event_created_at
        residence_country_code, residence_subdivision = extract_residence(
            inquiry_attributes
        )
        sync_profile_verification(
            profile,
            persona_status,
            residence_country_code,
            residence_subdivision,
        )
        profile.save(
            update_fields=[
                "persona_inquiry_id",
                "persona_event_created_at",
                "verification_status",
                "is_age_verified",
                "residence_country_code",
                "residence_subdivision",
                "updated_at",
            ]
        )
        return Response({"received": True})


class OpportunityListView(APIView):
    authentication_classes = [SupabaseAuthentication]
    permission_classes = []

    def get(self, request):
        force_refresh = str(request.query_params.get("refresh", "")).lower() in {
            "1",
            "true",
            "yes",
        }
        try:
            response = Response(
                opportunity_service.list(
                    request.query_params,
                    force_refresh=force_refresh,
                    **position_sizing_context(request),
                )
            )
            # The frontend also keeps a per-account session cache. This lets
            # browser caches reuse a normal filtered response briefly while
            # preserving an explicit `?refresh=true` escape hatch for fresh
            # upstream prices.
            response["Cache-Control"] = (
                "no-store" if force_refresh else "private, max-age=300"
            )
            return response
        except MarketDataError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class OpportunityDetailView(APIView):
    authentication_classes = [SupabaseAuthentication]
    permission_classes = []

    def get(self, request, opportunity_id):
        try:
            detail = opportunity_service.detail(
                opportunity_id,
                **position_sizing_context(request),
            )
        except MarketDataError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        if detail is None:
            return Response(
                {"detail": "Opportunity not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        response = Response(detail)
        response["Cache-Control"] = "no-store"
        return response


class FilterConfigView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        return Response(filter_config())
