import json
import logging
import os

from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

import pylibmql

from worksheets.models import UserWorksheet, WorksheetMajor
from worksheets.permissions import IsOwnerPermission

from .engine.matcher import match_courses
from .engine.solver import solve
from .serializers import WorksheetMajorSerializer

logger = logging.getLogger(__name__)

TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), '..', 'major_templates')


# ---------------------------------------------------------------------------
# Major template browsing (used by the frontend program-picker UI)
# ---------------------------------------------------------------------------

class MajorListView(APIView):
    def get(self, request):
        try:
            result = []
            for name in sorted(os.listdir(TEMPLATE_DIR)):
                dir_path = os.path.join(TEMPLATE_DIR, name)
                if not os.path.isdir(dir_path):
                    continue
                json_path = os.path.join(dir_path, f"{name}.json")
                try:
                    with open(json_path) as f:
                        data = json.load(f)
                        result.append({
                            "id": name,
                            "name": data.get("name", name),
                        })
                except (FileNotFoundError, json.JSONDecodeError):
                    result.append({"id": name, "name": name})
            return Response(result)
        except FileNotFoundError:
            return Response([], status=404)


class MajorIDView(APIView):
    def get(self, request, major_id):
        json_path = os.path.join(TEMPLATE_DIR, major_id, f"{major_id}.json")
        try:
            with open(json_path) as f:
                data = json.load(f)
        except FileNotFoundError:
            return Response({"error": f"Major {major_id} not found"}, status=404)
        return Response(data)


# ---------------------------------------------------------------------------
# WorksheetMajor CRUD (which majors a worksheet is auditing against)
# ---------------------------------------------------------------------------

class WorksheetMajorListCreateView(generics.ListCreateAPIView):
    serializer_class = WorksheetMajorSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerPermission]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['worksheet_pk'] = self.kwargs.get('worksheet_pk')
        return ctx

    def get_queryset(self):
        return WorksheetMajor.objects.filter(
            worksheet_id=self.kwargs['worksheet_pk'],
            worksheet__user=self.request.user,
        )

    def perform_create(self, serializer):
        worksheet = get_object_or_404(
            UserWorksheet,
            pk=self.kwargs['worksheet_pk'],
            user=self.request.user,
        )
        serializer.save(worksheet=worksheet)


class WorksheetMajorDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = WorksheetMajorSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerPermission]

    def get_queryset(self):
        return WorksheetMajor.objects.filter(
            worksheet_id=self.kwargs['worksheet_pk'],
            worksheet__user=self.request.user,
        )


# ---------------------------------------------------------------------------
# Audit endpoint — the main event
# ---------------------------------------------------------------------------

def _read_major_name(major_id: str) -> str:
    """Read the display name out of <major_id>.json, falling back to the id."""
    json_path = os.path.join(TEMPLATE_DIR, major_id, f"{major_id}.json")
    try:
        with open(json_path) as f:
            return json.load(f).get("name", major_id)
    except (FileNotFoundError, json.JSONDecodeError):
        return major_id


def _course_codes_for(course) -> list[str]:
    """
    Format a Course's codes as ["DEPT NUMBER", ...] by walking its
    course_instances → course_codes M2M. Mirrors what
    courses.serializers.CourseSerializer.get_course_codes does.
    """
    codes = set()
    for instance in course.courseinstance_set.all():
        for cc in instance.course_codes.all():
            codes.add(f"{cc.department} {cc.number}")
    return sorted(codes)


def _serialize_worksheet_courses(worksheet: UserWorksheet) -> list[dict]:
    """
    Walk worksheet → semesters → classes, return the list of dicts the
    matcher expects (codes, tags, dist, title, credit).
    """
    out = []
    for sem in worksheet.userworksheetsemester_set.all().prefetch_related(
        'userworksheetclass_set__course__course_tags',
        'userworksheetclass_set__course__distributionals',
        'userworksheetclass_set__course__courseinstance_set__course_codes',
        'userworksheetclass_set__course_instance__course__course_tags',
        'userworksheetclass_set__course_instance__course__distributionals',
        'userworksheetclass_set__course_instance__course__courseinstance_set__course_codes',
    ):
        for cls in sem.userworksheetclass_set.all():
            course = cls.course or (cls.course_instance and cls.course_instance.course)
            if course is None:
                continue
            out.append({
                "codes": _course_codes_for(course),
                "tags": [t.name for t in course.course_tags.all()],
                "dist": [d.code for d in course.distributionals.all()],
                "title": course.title,
                "credit": float(course.credits),
            })
    return out


class WorksheetAuditView(APIView):
    """
    GET /api/worksheets/<worksheet_pk>/audit/

    Loads the worksheet's courses + selected majors from the DB, parses
    each major's MQL via pylibmql, runs the matcher, runs the CP-SAT
    solver, and returns one MajorAudit per WorksheetMajor row.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, worksheet_pk):
        worksheet = get_object_or_404(
            UserWorksheet, pk=worksheet_pk, user=request.user
        )

        course_list = _serialize_worksheet_courses(worksheet)
        audits = []

        for wm in worksheet.worksheet_majors.all():
            mql_path = os.path.join(
                TEMPLATE_DIR,
                wm.major_id,
                f"{wm.major_id}_{wm.degree_type}.mql",
            )

            if not os.path.exists(mql_path):
                audits.append({
                    "major_id": wm.major_id,
                    "degree_type": wm.degree_type,
                    "name": _read_major_name(wm.major_id),
                    "error": f"MQL file not found: {wm.major_id}_{wm.degree_type}.mql",
                })
                continue

            try:
                with open(mql_path) as f:
                    mql_text = f.read()
                mql_file = json.loads(pylibmql.parse(mql_text).json())

                matching_eval = match_courses(course_list, mql_file)
                solve_result = solve(matching_eval, include_query=True)

                audits.append({
                    "major_id": wm.major_id,
                    "degree_type": wm.degree_type,
                    "name": _read_major_name(wm.major_id),
                    "solve_result": solve_result.to_dict(),
                })
            except Exception as e:
                logger.exception("Audit failed for %s_%s", wm.major_id, wm.degree_type)
                audits.append({
                    "major_id": wm.major_id,
                    "degree_type": wm.degree_type,
                    "name": _read_major_name(wm.major_id),
                    "error": f"audit error: {e}",
                })

        return Response({"audits": audits})


class MajorPreviewView(APIView):
    """
    GET /api/majors/<major_id>/<degree_type>/preview/?worksheet_id=<id>

    Returns the parsed MQL requirements for a major + degree variant, plus
    an audit computed against the given worksheet's courses if a
    `worksheet_id` query param is supplied.

    Response shape:
        {
            "major_id":     str,
            "degree_type":  str,
            "name":         str,
            "mql_file":     MQLQueryFile,
            "solve_result": SolveResult | None,
        }

    `solve_result` is null when `worksheet_id` is omitted, points to a
    worksheet the requesting user does not own, or the solver fails. The
    parsed MQL is always returned regardless.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, major_id, degree_type):
        mql_path = os.path.join(
            TEMPLATE_DIR, major_id, f"{major_id}_{degree_type}.mql"
        )
        if not os.path.exists(mql_path):
            return Response(
                {"error": f"MQL file not found: {major_id}_{degree_type}.mql"},
                status=404,
            )

        try:
            with open(mql_path) as f:
                mql_text = f.read()
            mql_file = json.loads(pylibmql.parse(mql_text).json())
        except Exception as e:
            logger.exception("MQL parse failed for %s_%s", major_id, degree_type)
            return Response({"error": f"MQL parse error: {e}"}, status=500)

        result = {
            "major_id": major_id,
            "degree_type": degree_type,
            "name": _read_major_name(major_id),
            "mql_file": mql_file,
            "solve_result": None,
        }

        worksheet_id = request.query_params.get("worksheet_id")
        if worksheet_id:
            try:
                worksheet = UserWorksheet.objects.get(
                    pk=int(worksheet_id), user=request.user
                )
            except (UserWorksheet.DoesNotExist, ValueError):
                return Response(result)

            try:
                course_list = _serialize_worksheet_courses(worksheet)
                matching_eval = match_courses(course_list, mql_file)
                solve_result = solve(matching_eval, include_query=True)
                result["solve_result"] = solve_result.to_dict()
            except Exception:
                logger.exception(
                    "Audit failed for preview %s_%s ws=%s",
                    major_id, degree_type, worksheet_id,
                )
                result["solve_result"] = None

        return Response(result)
