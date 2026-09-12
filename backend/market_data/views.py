from django.conf import settings
from rest_framework.response import Response
from rest_framework.views import APIView


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
                    "supabase": bool(settings.SUPABASE_URL),
                },
            }
        )

# Create your views here.
