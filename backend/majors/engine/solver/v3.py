"""
solver_v3.py — CP-SAT requirement-matching solver v3 (optimized for real data)

Designed to work with the actual matching_eval structure from the frontend
where courses have id, codes, title, credit, dist, tags fields.

Usage
-----
from solver_v3 import solve, SolveResult

result = solve(matching_eval)
result = solve(matching_eval, include_query=True)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from ortools.sat.python import cp_model


# ---------------------------------------------------------------------------
# Public types
# ---------------------------------------------------------------------------

@dataclass
class SelectorPath:
    """Represents the path to a specific selector in the MQL tree."""
    selector_index: int
    selector_kind: str
    nested_path: list[SelectorPath] = field(default_factory=list)
    
    def to_dict(self) -> dict:
        d = {
            "selector_index": self.selector_index,
            "selector_kind": self.selector_kind,
        }
        if self.nested_path:
            d["nested_path"] = [p.to_dict() for p in self.nested_path]
        return d


@dataclass
class SelectedCourse:
    """A course selection with its MQL component mapping."""
    course_id: str | int
    selector_path: SelectorPath
    group_index: int | None = None
    
    def to_dict(self) -> dict:
        d = {
            "course_id": str(self.course_id),
            "selector_path": self.selector_path.to_dict(),
        }
        if self.group_index is not None:
            d["group_index"] = self.group_index
        return d


@dataclass
class RequirementResult:
    description: str
    priority: int
    satisfied: bool
    selected: list[SelectedCourse]
    query: dict | None = None


@dataclass
class SolveResult:
    status: str
    status_cpsat: str
    total_satisfied: int = 0
    total_courses: int = 0
    selected_courses: list[str] = field(default_factory=list)
    selected_placements: list[str] = field(default_factory=list)
    per_requirement: list[RequirementResult] = field(default_factory=list)

    def to_dict(self) -> dict:
        d: dict[str, Any] = {
            "status": self.status,
            "status_cpsat": self.status_cpsat,
            "total_satisfied": self.total_satisfied,
            "total_courses": self.total_courses,
            "selected_courses": self.selected_courses,
            "selected_placements": self.selected_placements,
            "per_requirement": [],
        }
        for r in self.per_requirement:
            item: dict[str, Any] = {
                "description": r.description,
                "priority": r.priority,
                "satisfied": r.satisfied,
                "selected": [sc.to_dict() for sc in r.selected],
            }
            if r.query is not None:
                item["query"] = r.query
            d["per_requirement"].append(item)
        return d

    @property
    def ok(self) -> bool:
        return self.status == "ok"


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _q_bounds(q: dict) -> tuple[int, int]:
    """Return (min, max) from a quantity descriptor."""
    if "Single" in q:
        n = int(q["Single"])
        return n, n
    many = q["Many"]
    return int(many["from"]), int(many["to"])


def _get_course_id(course: dict) -> str:
    """Extract unique identifier from a course."""
    # Prefer id field, fall back to first code
    if "id" in course:
        return str(course["id"])
    if "codes" in course and course["codes"]:
        return str(course["codes"][0])
    if "external_id" in course:
        return str(course["external_id"])
    return str(hash(frozenset(course.items())))


def _is_placement(obj: Any) -> bool:
    """Check if object is a placement."""
    return isinstance(obj, dict) and "filled" in obj and "description" in obj


def _placement_key(p: dict) -> str:
    """Get unique key for a placement."""
    return f"PLACEMENT:{p.get('id', hash(p['description']))}"


def _is_place_key(k: str) -> bool:
    """Check if key is a placement key."""
    return k.startswith("PLACEMENT:")


def _safe_var_name(s: str) -> str:
    """Make a string safe for use as a variable name."""
    return s.replace(" ", "_").replace("@", "_").replace(":", "_").replace("-", "_")


def _get_selector_kind(selector: dict) -> str:
    """Extract the selector kind from a selector dict."""
    kinds = ["Class", "Placement", "Tag", "TagCode", "Dist", "DistCode", 
             "Range", "RangeDist", "RangeTag", "Query"]
    for kind in kinds:
        if kind in selector:
            return kind
    return "Unknown"


# ---------------------------------------------------------------------------
# Solver
# ---------------------------------------------------------------------------

def solve(matching_eval: dict, include_query: bool = False) -> SolveResult:
    """
    Run the CP-SAT requirement-matching solver v3.
    
    Parameters
    ----------
    matching_eval:
        The dict produced by the frontend MQL matching pipeline.
        Expected structure:
        {
            "results": [
                {
                    "requirement": {
                        "query": {...},
                        "description": str,
                        "priority": int
                    },
                    "selectedCourses": [course_or_list_of_courses, ...]
                }
            ],
            "allSelectedCourses": [all_unique_courses]
        }
    include_query:
        When True, includes the query in each RequirementResult
    
    Returns
    -------
    SolveResult
        Complete solver output with granular MQL mapping
    """
    model = cp_model.CpModel()
    results = matching_eval["results"]

    # ---- Build universe of all courses ----
    offerings: dict[str, dict] = {}
    placements: dict[str, dict] = {}
    x: dict[str, cp_model.IntVar] = {}
    x_place: dict[str, cp_model.IntVar] = {}

    # Flatten allSelectedCourses (which may contain nested lists)
    def flatten_courses(items):
        for item in items:
            if isinstance(item, list):
                yield from flatten_courses(item)
            else:
                yield item

    for item in flatten_courses(matching_eval.get("allSelectedCourses", [])):
        if _is_placement(item):
            pk = _placement_key(item)
            if pk not in x_place:
                placements[pk] = item
                x_place[pk] = model.new_bool_var(f"x_{_safe_var_name(pk)}")
        else:
            cid = _get_course_id(item)
            if cid not in x:
                offerings[cid] = item
                x[cid] = model.new_bool_var(f"x_{_safe_var_name(cid)}")

    # ---- Per-requirement assignment variables ----
    y: dict[tuple[int, str], cp_model.IntVar] = {}
    req_cands: list[list[str]] = []
    course_metadata: dict[tuple[int, str], tuple[int, str, int]] = {}
    sat: list[cp_model.IntVar] = []

    for r, qr in enumerate(results):
        req = qr["requirement"]
        qmin, qmax = _q_bounds(req["query"]["quantity"])

        cand_keys: list[str] = []
        selector = req["query"].get("selector", [])

        # Process selectedCourses
        for group_idx, group_item in enumerate(qr["selectedCourses"]):
            # Determine selector info
            selector_idx = min(group_idx, len(selector) - 1) if selector else 0
            selector_kind = _get_selector_kind(selector[selector_idx]) if selector_idx < len(selector) else "Unknown"
            
            # Handle both single items and lists
            if isinstance(group_item, list):
                items = group_item
                # If selector is Query, get its quantity limit
                if selector_idx < len(selector) and "Query" in selector[selector_idx]:
                    inner_q = selector[selector_idx]["Query"]
                    _, group_limit = _q_bounds(inner_q.get("quantity", {"Single": len(items)}))
                else:
                    group_limit = len(items)
            else:
                items = [group_item]
                group_limit = 1
            
            # Add each item in the group
            group_keys: list[str] = []
            for item in items:
                if _is_placement(item):
                    pk = _placement_key(item)
                    cand_keys.append(pk)
                    group_keys.append(pk)
                    course_metadata[(r, pk)] = (selector_idx, selector_kind, group_idx)
                    
                    if pk not in x_place:
                        placements[pk] = item
                        x_place[pk] = model.new_bool_var(f"x_{_safe_var_name(pk)}")
                else:
                    cid = _get_course_id(item)
                    cand_keys.append(cid)
                    group_keys.append(cid)
                    course_metadata[(r, cid)] = (selector_idx, selector_kind, group_idx)
                    
                    if cid not in x:
                        offerings[cid] = item
                        x[cid] = model.new_bool_var(f"x_{_safe_var_name(cid)}")
            
            # Add group limit constraint
            if group_keys and len(group_keys) > group_limit:
                group_vars = []
                for key in group_keys:
                    if (r, key) not in y:
                        y[(r, key)] = model.new_bool_var(f"y_r{r}_{_safe_var_name(key)}")
                    group_vars.append(y[(r, key)])
                if group_vars:
                    model.add(sum(group_vars) <= group_limit)

        req_cands.append(cand_keys)

        # Create assignment variables and link to selection
        for key in cand_keys:
            if (r, key) not in y:
                y[(r, key)] = model.new_bool_var(f"y_r{r}_{_safe_var_name(key)}")
            
            if _is_place_key(key):
                model.add(y[(r, key)] <= x_place[key])
            else:
                model.add(y[(r, key)] <= x[key])

        # Requirement satisfaction constraints
        sum_assigned = sum(y[(r, key)] for key in cand_keys if (r, key) in y)
        s = model.new_bool_var(f"sat_{r}")
        sat.append(s)

        model.add(sum_assigned <= qmax)
        model.add(sum_assigned >= qmin).only_enforce_if(s)
        if qmin > 0:
            model.add(sum_assigned <= qmin - 1).only_enforce_if(s.negated())
        else:
            model.add(sum_assigned == 0).only_enforce_if(s.negated())

    # ---- No double-counting constraints ----
    for c in x:
        used = [y[(r, c)] for r in range(len(results)) if (r, c) in y]
        if used:
            model.add(sum(used) <= 1)

    for pk in x_place:
        used = [y[(r, pk)] for r in range(len(results)) if (r, pk) in y]
        if used:
            model.add(sum(used) <= 1)

    # Base-course uniqueness (same course code across different offerings)
    def _base_code(course: dict) -> str | None:
        if "codes" in course and course["codes"]:
            return course["codes"][0].split()[0]  # "CPSC 201" -> "CPSC"
        return None

    base_to_courses: dict[str, list[str]] = {}
    for cid, course in offerings.items():
        base = _base_code(course)
        if base:
            base_to_courses.setdefault(base, []).append(cid)

    # For courses with same base code, ensure only one is used across all requirements
    for base, course_ids in base_to_courses.items():
        if len(course_ids) > 1:
            # Collect all y variables for these courses across all requirements
            all_y_vars = []
            for r in range(len(results)):
                for cid in course_ids:
                    if (r, cid) in y:
                        all_y_vars.append(y[(r, cid)])
            if all_y_vars:
                model.add(sum(all_y_vars) <= 1)

    # ---- Priority-lexicographic objective ----
    R = len(results)
    req_priority = [results[r]["requirement"]["priority"] for r in range(R)]
    priorities = sorted(set(req_priority), reverse=True)
    BASE = R + 1
    M = 10_000
    PLACEMENT_PENALTY = 1

    # Maximize satisfied requirements by priority tier
    expr = sum(
        sum(sat[r] for r in range(R) if req_priority[r] == p) * (BASE ** (len(priorities) - 1 - i))
        for i, p in enumerate(priorities)
    )
    
    # Secondary objective: maximize total assignments, penalize placements
    model.maximize(
        expr * M
        + sum(y.values())
        - PLACEMENT_PENALTY * sum(x_place.values())
    )

    # ---- Solve ----
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 3.0
    solver.parameters.num_search_workers = 8
    status = solver.Solve(model)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return SolveResult(status="no_solution", status_cpsat=str(status))

    # ---- Extract solution ----
    selected_courses = [c for c, var in x.items() if solver.value(var) == 1]
    selected_placements = [pk for pk, var in x_place.items() if solver.value(var) == 1]

    per_req: list[RequirementResult] = []
    for r, qr in enumerate(results):
        chosen_keys = [k for k in req_cands[r] if (r, k) in y and solver.value(y[(r, k)]) == 1]
        
        # Build SelectedCourse objects with MQL mapping
        chosen_courses = []
        for key in chosen_keys:
            if (r, key) in course_metadata:
                selector_idx, selector_kind, group_idx = course_metadata[(r, key)]
                selector_path = SelectorPath(
                    selector_index=selector_idx,
                    selector_kind=selector_kind,
                )
                chosen_courses.append(SelectedCourse(
                    course_id=key,
                    selector_path=selector_path,
                    group_index=group_idx,
                ))
            else:
                # Fallback
                chosen_courses.append(SelectedCourse(
                    course_id=key,
                    selector_path=SelectorPath(
                        selector_index=0,
                        selector_kind="Unknown",
                    ),
                ))
        
        per_req.append(RequirementResult(
            description=qr["requirement"]["description"],
            priority=qr["requirement"]["priority"],
            satisfied=solver.value(sat[r]) == 1,
            selected=chosen_courses,
            query=qr["requirement"]["query"] if include_query else None,
        ))

    total_satisfied = sum(sat)
    total_courses = sum(x.values())

    return SolveResult(
        status="ok",
        status_cpsat=str(status),
        total_satisfied=solver.value(total_satisfied),
        total_courses=solver.value(total_courses),
        selected_courses=selected_courses,
        selected_placements=selected_placements,
        per_requirement=per_req,
    )