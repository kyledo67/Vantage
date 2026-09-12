"""Server-side Persona inquiry lifecycle and webhook verification helpers."""

from __future__ import annotations

import hashlib
import hmac
import time
from dataclasses import dataclass

import requests
from django.conf import settings


class PersonaAPIError(Exception):
    """A safe, user-facing Persona integration error."""


@dataclass(frozen=True)
class PersonaInquirySession:
    inquiry_id: str
    status: str
    environment_id: str | None
    session_token: str | None = None
    residence_country_code: str = ""
    residence_subdivision: str = ""

    @property
    def launchable(self) -> bool:
        return self.status in {"created", "started", "pending"}


class PersonaClient:
    """Small Persona API client used only by authenticated backend routes."""

    def __init__(self, session=None):
        self.session = session or requests.Session()

    def _headers(self):
        return {
            "Authorization": f"Bearer {settings.PERSONA_API_KEY}",
            "Content-Type": "application/json",
            "Persona-Version": settings.PERSONA_API_VERSION,
        }

    def _request(self, method, path, **kwargs):
        if not settings.PERSONA_API_KEY or not settings.PERSONA_INQUIRY_TEMPLATE_ID:
            raise PersonaAPIError("Persona verification is not configured.")

        try:
            response = self.session.request(
                method,
                f"{settings.PERSONA_API_BASE_URL.rstrip('/')}/{path.lstrip('/')}",
                headers=self._headers(),
                timeout=settings.PERSONA_REQUEST_TIMEOUT_SECONDS,
                **kwargs,
            )
        except requests.RequestException as exc:
            raise PersonaAPIError("Persona verification is temporarily unavailable.") from exc

        if not response.ok:
            request_id = response.headers.get("Request-Id")
            suffix = f" Reference: {request_id}." if request_id else ""
            raise PersonaAPIError(f"Persona could not start verification.{suffix}")

        try:
            payload = response.json()
        except ValueError as exc:
            raise PersonaAPIError("Persona returned an invalid response.") from exc

        environment_id = (
            response.headers.get("Persona-Environment-Id")
            or settings.PERSONA_ENVIRONMENT_ID
            or None
        )
        return payload, environment_id

    @staticmethod
    def _parse_inquiry(payload, environment_id, session_token=None):
        try:
            data = payload["data"]
            country_code, subdivision = extract_residence(
                data["attributes"]
            )
            return PersonaInquirySession(
                inquiry_id=data["id"],
                status=data["attributes"]["status"],
                environment_id=environment_id,
                session_token=session_token,
                residence_country_code=country_code,
                residence_subdivision=subdivision,
            )
        except (KeyError, TypeError) as exc:
            raise PersonaAPIError("Persona returned an invalid inquiry.") from exc

    def retrieve_inquiry(self, inquiry_id):
        payload, environment_id = self._request("GET", f"inquiries/{inquiry_id}")
        return self._parse_inquiry(payload, environment_id)

    def find_incomplete_inquiry(self, reference_id):
        payload, environment_id = self._request(
            "GET",
            "inquiries",
            params={
                "filter[reference-id]": str(reference_id),
                "filter[status]": "created,started,pending",
                "page[size]": 1,
            },
        )
        inquiries = payload.get("data") or []
        if not inquiries:
            return None
        return self._parse_inquiry({"data": inquiries[0]}, environment_id)

    def create_inquiry(self, reference_id):
        payload, environment_id = self._request(
            "POST",
            "inquiries",
            json={
                "data": {
                    "attributes": {
                        "inquiry-template-id": settings.PERSONA_INQUIRY_TEMPLATE_ID,
                        "reference-id": str(reference_id),
                    }
                }
            },
        )
        return self._parse_inquiry(payload, environment_id)

    def resume_inquiry(self, inquiry):
        payload, environment_id = self._request(
            "POST",
            f"inquiries/{inquiry.inquiry_id}/resume",
            json={"meta": {}},
        )
        try:
            session_token = payload["meta"]["session-token"]
        except (KeyError, TypeError) as exc:
            raise PersonaAPIError("Persona could not resume verification.") from exc
        return PersonaInquirySession(
            inquiry_id=inquiry.inquiry_id,
            status=inquiry.status,
            environment_id=environment_id or inquiry.environment_id,
            session_token=session_token,
            residence_country_code=inquiry.residence_country_code,
            residence_subdivision=inquiry.residence_subdivision,
        )

    def get_or_create_inquiry(self, reference_id, inquiry_id=None):
        inquiry = self.retrieve_inquiry(inquiry_id) if inquiry_id else None

        if inquiry is None:
            inquiry = self.find_incomplete_inquiry(reference_id)
        if (
            inquiry is None
            or inquiry.status in {"declined", "failed", "expired"}
            or (inquiry.status == "approved" and not inquiry.residence_country_code)
        ):
            inquiry = self.create_inquiry(reference_id)

        if inquiry.status in {"started", "pending"}:
            inquiry = self.resume_inquiry(inquiry)
        return inquiry


def _field_value(fields, *names):
    for name in names:
        field = fields.get(name)
        value = field.get("value") if isinstance(field, dict) else field
        if value not in (None, ""):
            return str(value).strip()
    return ""


def extract_residence(inquiry_attributes):
    """Extract normalized residence values from a Persona inquiry payload."""

    fields = (inquiry_attributes or {}).get("fields") or {}
    country_code = _field_value(
        fields,
        "address-country-code",
        "country-of-residence",
        "selected-country-code",
        "country-code",
    ).upper()
    if len(country_code) != 2 or not country_code.isalpha():
        country_code = ""

    subdivision = _field_value(
        fields,
        "address-subdivision",
        "residence-subdivision",
        "state",
        "province",
    ).upper()
    return country_code, subdivision


def verify_persona_signature(raw_body, signature_header, secret, tolerance_seconds=300):
    """Verify Persona's HMAC, including rotating signatures and replay age."""

    if not raw_body or not signature_header or not secret:
        return False

    groups = signature_header.strip().split()
    if not groups:
        return False

    timestamp = None
    signatures = []
    for group in groups:
        values = {}
        for pair in group.split(","):
            key, separator, value = pair.partition("=")
            if separator:
                values[key] = value
        timestamp = timestamp or values.get("t")
        if values.get("v1"):
            signatures.append(values["v1"])

    try:
        timestamp_number = int(timestamp)
    except (TypeError, ValueError):
        return False

    if abs(int(time.time()) - timestamp_number) > tolerance_seconds:
        return False

    signed_payload = str(timestamp_number).encode("utf-8") + b"." + raw_body
    expected = hmac.new(secret.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()
    return any(hmac.compare_digest(expected, signature) for signature in signatures)


persona_client = PersonaClient()
