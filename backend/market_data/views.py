from django.conf import settings
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .authentication import SupabaseAuthentication
from .clients import MarketDataError
from .models import UserProfile
from .opportunities import filter_config, opportunity_service
from .serializers import UserProfileSerializer


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
                    "parlay_api": bool(settings.PARLAY_API_KEY),
                    "kalshi": bool(settings.KALSHI_API_BASE_URL),
                    "polymarket": bool(settings.POLYMARKET_GAMMA_API_BASE_URL),
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
        profile = self.get_profile(request)
        if profile is None:
            return Response(
                {"detail": "Profile not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
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
        profile = self.get_profile(request)
        if profile is None:
            return Response(
                {"detail": "Profile not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class OpportunityListView(APIView):
    authentication_classes = []
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
                )
            )
            response["Cache-Control"] = "no-store"
            return response
        except MarketDataError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class OpportunityDetailView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request, opportunity_id):
        try:
            detail = opportunity_service.detail(opportunity_id)
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
