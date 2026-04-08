"""
matcher.py — MQL course matcher.

Mirrors the behavior of frontend/src/services/MatchingEngine.ts so the
backend can run the full audit pipeline (parse → match → solve) end-to-end.

Public surface:

    match_courses(course_list, mql_file) -> matching_eval

The output is the dict shape that solver.solve() consumes:

    {
        "results": [
            {
                "requirement": <MQLRequirement dict>,
                "selectedCourses": [<course or [course, ...]>, ...],
            },
            ...
        ],
        "allSelectedCourses": [<course>, ...],
    }

`course_list` items are dicts with at least:
    {
        "codes": ["CPSC 2010", ...],   # required
        "tags":  ["...", ...],
        "dist":  ["Hu", "QR", ...],
        "title": str,
        "credit": float,
    }
"""

from __future__ import annotations

import uuid
from typing import Any


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_placement(description: str) -> dict:
    """Synthetic ManualFulfillment dict — mirrors queryPlacement in TS."""
    return {
        "filled": False,
        "id": str(uuid.uuid4()),
        "description": description,
    }


def _course_codes(course: dict) -> list[str]:
    return course.get("codes", []) if isinstance(course, dict) else []


def _split_code(code: str) -> tuple[str, int | None]:
    parts = code.split(" ", 1)
    if len(parts) != 2:
        return code, None
    dept, num = parts
    try:
        return dept, int(num)
    except ValueError:
        return dept, None


# ---------------------------------------------------------------------------
# Per-selector matchers (mirror QueryMatcher methods in MatchingEngine.ts)
# ---------------------------------------------------------------------------

def _query_class(selector: dict, course_list: list[dict]) -> list[dict]:
    cls = selector["Class"]
    fmt = f"{cls['department_id']} {cls['course_number']}"
    return [c for c in course_list if fmt in _course_codes(c)]


def _query_placement(selector: dict, _course_list: list[dict]) -> list[dict]:
    return [_make_placement(selector["Placement"])]


def _query_tag(selector: dict, course_list: list[dict]) -> list[dict]:
    tag = selector["Tag"]
    return [c for c in course_list if tag in c.get("tags", [])]


def _query_tag_code(selector: dict, course_list: list[dict]) -> list[dict]:
    tag = selector["TagCode"]["tag"]
    dep = selector["TagCode"]["code"]
    out = []
    for c in course_list:
        codes = _course_codes(c)
        if any(code.split(" ", 1)[0] == dep for code in codes) and tag in c.get("tags", []):
            out.append(c)
    return out


def _query_dist(selector: dict, course_list: list[dict]) -> list[dict]:
    dist = selector["Dist"].lower()
    return [
        c for c in course_list
        if any((d or "").lower() == dist for d in (c.get("dist") or []))
    ]


def _query_dist_code(selector: dict, course_list: list[dict]) -> list[dict]:
    dist = selector["DistCode"]["dist"].lower()
    dep = selector["DistCode"]["code"]
    out = []
    for c in course_list:
        if not any(code.split(" ", 1)[0] == dep for code in _course_codes(c)):
            continue
        if any((d or "").lower() == dist for d in (c.get("dist") or [])):
            out.append(c)
    return out


def _query_range(selector: dict, course_list: list[dict]) -> list[dict]:
    rng = selector["Range"]
    if rng["from"]["department_id"] != rng["to"]["department_id"]:
        return []  # match TS soft-fail behavior
    dep = rng["from"]["department_id"]
    lo = rng["from"]["course_number"]
    hi = rng["to"]["course_number"]
    out = []
    for c in course_list:
        for code in _course_codes(c):
            cdep, num = _split_code(code)
            if cdep == dep and num is not None and lo <= num <= hi:
                out.append(c)
                break
    return out


def _query_range_dist(_selector: dict, _course_list: list[dict]) -> list[dict]:
    # TS marks RangeDist/RangeTag as deprecated/unimplemented
    return []


def _query_range_tag(_selector: dict, _course_list: list[dict]) -> list[dict]:
    return []


def _query_query(selector: dict, course_list: list[dict]) -> list[dict] | dict:
    """
    Recursive: a Query selector wraps a nested MQLQuery.

    The TS implementation returns `[result.data]` — i.e. wraps the inner match
    result in an outer array so it shows up as a *group* in selectedCourses.
    The solver later treats list-typed group items as "pick at most glimit
    from this group". We replicate that exactly.
    """
    inner_query = selector["Query"]
    inner_result = _match_query_flatten(course_list, inner_query)
    return inner_result  # returned as a single grouped sublist via the caller


_VTABLE = {
    "Class": _query_class,
    "Placement": _query_placement,
    "Tag": _query_tag,
    "TagCode": _query_tag_code,
    "Dist": _query_dist,
    "DistCode": _query_dist_code,
    "Range": _query_range,
    "RangeDist": _query_range_dist,
    "RangeTag": _query_range_tag,
    # Query handled separately because it returns a grouped sublist
}


# ---------------------------------------------------------------------------
# Top-level query match
# ---------------------------------------------------------------------------

def _match_query_flatten(course_list: list[dict], mql_query: dict) -> list[Any]:
    """
    Mirrors QueryMatcher.matchFlatten in MatchingEngine.ts.

    For each selector in mql_query["selector"], run the selector and append
    its results to a flat output list. For nested `Query` selectors, append
    the inner match result as a single sublist (preserving grouping for the
    solver's per-group limit constraints).

    Deduplication: courses are deduped by their primary code (codes[0]) so
    the same offering doesn't appear twice in one requirement. Sublists from
    nested Query selectors are not deduped against the flat items — they
    represent a distinct "pick one of these" group.
    """
    out: list[Any] = []
    seen_primary_codes: set[str] = set()

    for selector in mql_query.get("selector", []):
        if "Query" in selector:
            sublist = _query_query(selector, course_list)
            if sublist:
                out.append(sublist)
            continue

        kind = next(iter(selector.keys()), None)
        handler = _VTABLE.get(kind)
        if handler is None:
            continue

        results = handler(selector, course_list)
        for item in results:
            if not isinstance(item, dict):
                continue
            codes = _course_codes(item)
            primary = codes[0] if codes else None
            if primary is not None:
                if primary in seen_primary_codes:
                    continue
                seen_primary_codes.add(primary)
            out.append(item)

    return out


# ---------------------------------------------------------------------------
# Public entrypoint
# ---------------------------------------------------------------------------

def match_courses(course_list: list[dict], mql_file: dict) -> dict:
    """
    Match a course list against a parsed MQL file.

    Returns the matching_eval dict that solver.solve() consumes.
    """
    requirements = mql_file.get("requirements", [])

    # Sort by priority descending (matches MQLMatcher.match in TS)
    sorted_reqs = sorted(
        requirements,
        key=lambda r: r.get("priority", 0),
        reverse=True,
    )

    results = []
    used_courses_by_id: dict[int, dict] = {}

    for req in sorted_reqs:
        selected = _match_query_flatten(course_list, req["query"])
        results.append({
            "requirement": req,
            "selectedCourses": selected,
        })
        # Track all unique course objects that appeared anywhere
        for item in _iter_courses(selected):
            used_courses_by_id[id(item)] = item

    return {
        "results": results,
        "allSelectedCourses": list(used_courses_by_id.values()),
    }


def _iter_courses(selected_courses: list[Any]):
    """Recursively yield course/placement dicts from a selectedCourses list."""
    for item in selected_courses:
        if isinstance(item, list):
            for sub in _iter_courses(item):
                yield sub
        elif isinstance(item, dict):
            yield item
