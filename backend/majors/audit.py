from __future__ import annotations

from decimal import Decimal
import re

from django.conf import settings
from mql_audit import AuditOptions, audit_ir

from courses.models import Course
from worksheets.models import WorksheetMajor

from .catalog import ProgramAsset


class AuditDataConflict(ValueError):
    pass


def normalize_code(department: str, number: str) -> str:
    return f"{department}{number}".replace(" ", "").upper()


def _course_codes(course: Course) -> list[str]:
    return sorted({
        normalize_code(code.department, code.number)
        for instance in course.courseinstance_set.all()
        for code in instance.course_codes.all()
    })


def _instance_codes(instance) -> list[str]:
    return sorted({
        normalize_code(code.department, code.number)
        for code in instance.course_codes.all()
    })


def build_catalog() -> tuple[dict, dict[int, list[str]]]:
    records_by_id = {}
    ranks_by_id = {}
    codes_by_course: dict[int, list[str]] = {}
    courses = Course.objects.prefetch_related(
        "distributionals", "course_tags", "courseinstance_set__course_codes"
    )
    for course in courses:
        codes = _course_codes(course)
        codes_by_course[course.pk] = codes
        if course.credits <= 0:
            continue
        latest_offering = max(
            (
                (instance.year, {"SP": 1, "SU": 2, "FA": 3}.get(instance.season, 0))
                for instance in course.courseinstance_set.all()
            ),
            default=(0, 0),
        )
        rank = (*latest_offering, course.pk)
        attributes = sorted(tag.name for tag in course.course_tags.all())
        distributionals = sorted(str(item) for item in course.distributionals.all())
        credits = int(Decimal(course.credits) * 2)
        for canonical_id in codes:
            match = re.match(r"^([^0-9]+)([0-9]+)", canonical_id)
            if match is None:
                raise AuditDataConflict(f"cannot normalize course code {canonical_id}")
            subject, digits = match.groups()
            if rank <= ranks_by_id.get(canonical_id, (-1, -1, -1)):
                continue
            records_by_id[canonical_id] = {
                "canonical_course_id": canonical_id,
                "subject": subject,
                "number": int(digits or 0),
                "code": canonical_id,
                "codes": codes,
                "credit_units": credits,
                "attributes": attributes,
                "distributions": distributionals,
                "format": course.format,
                "language": course.language or None,
                "source_course_id": course.pk,
            }
            ranks_by_id[canonical_id] = rank
    records = []
    for record in records_by_id.values():
        record.pop("source_course_id", None)
        records.append(record)
    return {"schema_version": "0.2.0", "credit_scale": 2, "courses": records}, codes_by_course


def _year_of_study(selected: WorksheetMajor, worksheet_class) -> int:
    if worksheet_class.year_of_study_override:
        return worksheet_class.year_of_study_override
    class_year = selected.worksheet.user.class_year
    if not class_year:
        raise AuditDataConflict("class year is required to derive year of study")
    semester = worksheet_class.worksheet_semester
    academic_year_end = semester.year + (1 if semester.season == "FA" else 0)
    year = 4 - (class_year - academic_year_end)
    if year not in {1, 2, 3, 4}:
        raise AuditDataConflict(
            f"cannot derive year of study for worksheet class {worksheet_class.pk}"
        )
    return year


def build_transcript(selected: WorksheetMajor, codes_by_course: dict[int, list[str]]) -> dict:
    approvals = {
        item.worksheet_class_id: item.approved_for
        for item in selected.attempt_approvals.all()
    }
    attempts = []
    classes = selected.worksheet.userworksheetsemester_set.filter(
        is_completed=True
    ).prefetch_related(
        "userworksheetclass_set__course",
        "userworksheetclass_set__course_instance__course",
        "userworksheetclass_set__course_instance__course_codes",
    )
    for semester in classes:
        for item in semester.userworksheetclass_set.all():
            course = item.course or item.course_instance.course
            possible = (
                _instance_codes(item.course_instance)
                if item.course_instance_id
                else codes_by_course.get(course.pk, [])
            )
            enrolled = item.enrolled_course_code.replace(" ", "").upper()
            if not enrolled:
                if not possible:
                    raise AuditDataConflict(
                        f"worksheet class {item.pk} has no catalog course code"
                    )
                enrolled = possible[0]
            if enrolled not in possible:
                raise AuditDataConflict(
                    f"worksheet class {item.pk} has invalid enrolled course code {enrolled}"
                )
            attempts.append({
                "attempt_id": str(item.pk),
                "canonical_course_id": enrolled,
                "earned_credit_units": int(Decimal(course.credits) * 2),
                "grade": item.grade,
                "grading_mode": "crdf" if item.creditdf else item.grading_mode,
                "graduate_grade": item.graduate_grade,
                "source": item.source,
                "term": f"{semester.year}{semester.season}",
                "year_of_study": _year_of_study(selected, item),
                "enrolled_subject": "".join(ch for ch in enrolled if not ch.isdigit()),
                "enrolled_under_code": enrolled,
                "approved_for": approvals.get(item.pk, []),
            })
    return {"schema_version": "0.2.0", "credit_scale": 2, "attempts": attempts}


def build_profile(selected: WorksheetMajor, asset: ProgramAsset) -> dict:
    facts_by_id = {str(f["meta"]["id"]): f for f in asset.ir.get("facts", [])}
    unknown = sorted(set(selected.fact_ids) - set(facts_by_id))
    if unknown:
        raise AuditDataConflict(f"unknown fact ids: {unknown}")
    facts = [
        {"fact_type": facts_by_id[fid]["fact_type"], "parameters": facts_by_id[fid].get("parameters", {})}
        for fid in selected.fact_ids
    ]
    return {
        "schema_version": "0.2.0",
        "class_year": selected.worksheet.user.class_year,
        "declared_choices": selected.declared_choices,
        "facts": facts,
    }


def run_audit(selected: WorksheetMajor, asset: ProgramAsset) -> tuple[dict, list[dict]]:
    catalog_document, codes = build_catalog()
    transcript = build_transcript(selected, codes)
    profile = build_profile(selected, asset)
    result = audit_ir(
        asset.ir, asset.institution, catalog_document, transcript, profile,
        options=AuditOptions(
            max_time_seconds=settings.MQL_AUDIT_MAX_TIME_SECONDS,
            num_search_workers=1,
            random_seed=0,
        ),
        # The interactive audit response is the page's fast path. Candidate
        # usefulness requires additional solves and is not consumed here, so
        # keep it out of this request explicitly rather than relying on the
        # library default.
        include_candidate_usefulness=False,
    )
    return result.to_dict(), transcript["attempts"]
