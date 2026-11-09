from __future__ import annotations

import json
from django.conf import settings
from django.shortcuts import get_object_or_404
from mql_audit import InputValidationError, SolveTimeoutError, UnsupportedSchemaError
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from worksheets.models import UserWorksheet, WorksheetMajor
from .audit import AuditDataConflict, run_audit
from .catalog import CatalogError, catalog
from .serializers import WorksheetMajorSerializer


def error(code, message, http_status, details=None):
    body = {"code": code, "message": message}
    if details is not None:
        body["details"] = details
    return Response(body, status=http_status)


class MajorListView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request):
        year = request.query_params.get("catalog_year", settings.MAJORS_DEFAULT_CATALOG_YEAR)
        try:
            majors = catalog.list_majors(year)
        except (CatalogError, OSError, ValueError) as exc:
            return error("catalog_not_found", str(exc), status.HTTP_404_NOT_FOUND)
        return Response({"api_version": "2", "catalog_year": year, "majors_revision": catalog.revision, "majors": majors})


class MajorDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request, major_id):
        year = request.query_params.get("catalog_year", settings.MAJORS_DEFAULT_CATALOG_YEAR)
        try:
            entry = next(m for m in catalog.list_majors(year) if m["id"] == major_id)
            root = catalog.year_root(year)
            metadata = json.loads((root / major_id / f"{major_id}.json").read_text(encoding="utf-8"))
        except (StopIteration, CatalogError, OSError, ValueError):
            return error("major_not_found", "major not found", status.HTTP_404_NOT_FOUND)
        return Response({"api_version": "2", "catalog_year": year, "majors_revision": catalog.revision, "major": {**metadata, "programs": entry["programs"]}})


class ProgramDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request, major_id, program_id):
        year = request.query_params.get("catalog_year", settings.MAJORS_DEFAULT_CATALOG_YEAR)
        try:
            asset = catalog.program(year, major_id, program_id)
        except (CatalogError, OSError, ValueError) as exc:
            return error("program_not_found", str(exc), status.HTTP_404_NOT_FOUND)
        return Response({
            "api_version": "2", "catalog_year": year, "majors_revision": catalog.revision,
            "program": {"major_id": major_id, "program_id": program_id, "semantic_program_id": asset.semantic_program_id, "schema_version": asset.ir["schema_version"], "requirements": asset.ir["requirements"], "choices": asset.ir.get("choices", []), "facts": asset.ir.get("facts", [])},
        })


class WorksheetMajorAuditView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request, worksheet_pk, pk):
        selected = get_object_or_404(WorksheetMajor.objects.select_related("worksheet__user").prefetch_related("attempt_approvals"), pk=pk, worksheet_id=worksheet_pk, worksheet__user=request.user)
        try:
            asset = catalog.program(selected.catalog_year, selected.major_id, selected.program_id)
            result, attempts = run_audit(selected, asset)
        except AuditDataConflict as exc:
            return error("audit_data_conflict", str(exc), status.HTTP_409_CONFLICT)
        except SolveTimeoutError as exc:
            return error("solver_timeout", str(exc), status.HTTP_503_SERVICE_UNAVAILABLE)
        except UnsupportedSchemaError as exc:
            return error("unsupported_schema", str(exc), status.HTTP_422_UNPROCESSABLE_ENTITY)
        except InputValidationError as exc:
            return error("invalid_audit_input", str(exc), status.HTTP_400_BAD_REQUEST)
        except (CatalogError, OSError, ValueError) as exc:
            return error("program_invalid", str(exc), status.HTTP_422_UNPROCESSABLE_ENTITY)
        return Response({
            "api_version": "2", "scope": "completed", "catalog_year": selected.catalog_year, "majors_revision": catalog.revision,
            "program": {"major_id": selected.major_id, "program_id": selected.program_id, "semantic_program_id": asset.semantic_program_id, "schema_version": asset.ir["schema_version"], "requirements": asset.ir["requirements"]},
            "attempts": attempts,
            "audit": result,
        })


class WorksheetMajorListCreateView(generics.ListCreateAPIView):
    serializer_class = WorksheetMajorSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return WorksheetMajor.objects.filter(worksheet_id=self.kwargs["worksheet_pk"], worksheet__user=self.request.user).prefetch_related("attempt_approvals")
    def perform_create(self, serializer):
        worksheet = get_object_or_404(UserWorksheet, pk=self.kwargs["worksheet_pk"], user=self.request.user)
        serializer.save(worksheet=worksheet)


class WorksheetMajorDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = WorksheetMajorSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return WorksheetMajor.objects.filter(worksheet_id=self.kwargs["worksheet_pk"], worksheet__user=self.request.user).prefetch_related("attempt_approvals")
