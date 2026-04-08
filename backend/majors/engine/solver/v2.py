"""
v2.py — CP-SAT requirement-matching solver library with granular MQL tracking.

Usage
-----
from solver import solve, SolveResult

result = solve(matching_eval)          # returns a SolveResult dataclass
result = solve(matching_eval, include_query=True)

# Or work with the raw dict:
raw = solve(matching_eval).to_dict()
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from ortools.sat.python import cp_model


API_VERSION = 2


# ---------------------------------------------------------------------------
# Public types
# ---------------------------------------------------------------------------

@dataclass
class SelectorPath:
    """Represents the path to a specific selector in the MQL tree."""
    selector_index: int                    # index in requirement.query.selector[]
    selector_kind: str                     # "Class" | "Tag" | "Query" | etc.
    nested_path: list[SelectorPath] = field(default_factory=list)  # for Query selectors
    
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
    course_id: str                         # course code or PLACEMENT:<uuid>
    selector_path: SelectorPath            # which MQL component matched this
    group_index: int | None = None         # index within selectedCourses array
    
    def to_dict(self) -> dict:
        d = {
            "course_id": self.course_id,
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
    selected: list[SelectedCourse]         # now includes MQL mapping
    query: dict | None = None              # only populated when include_query=True


@dataclass
class SolveResult:
    status: str                              # "ok" | "no_solution"
    status_cpsat: str                        # raw OR-Tools status string
    total_satisfied: int = 0
    total_courses: int = 0
    selected_courses: list[str] = field(default_factory=list)
    selected_placements: list[str] = field(default_factory=list)
    per_requirement: list[RequirementResult] = field(default_factory=list)

    def to_dict(self) -> dict:
        d: dict[str, Any] = {
            "version": API_VERSION,
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
    """Return (min, max) from a quantity descriptor like {"Single": 1} or {"Many": {"from": 2, "to": 4}}."""
    if "Single" in q:
        n = int(q["Single"])
        return n, n
    many = q["Many"]
    return int(many["from"]), int(many["to"])


def _course_id(course: dict, use_seasons: bool = False) -> str:
    code = course["codes"][0]
    if use_seasons:
        season = course["season_codes"][0] if course.get("season_codes") else "NA"
        return f"{code}@{season}"
    return code


def _base_key(course: dict) -> str:
    return course["codes"][0]


def _is_placement(obj: Any) -> bool:
    return isinstance(obj, dict) and "id" in obj and "filled" in obj and "description" in obj


def _placement_key(p: dict) -> str:
    return f"PLACEMENT:{p['id']}"


def _is_place_key(k: str) -> bool:
    return k.startswith("PLACEMENT:")


def _safe_var_name(s: str) -> str:
    return s.replace(" ", "_").replace("@", "_").replace(":", "_")


def _get_selector_kind(selector: dict) -> str:
    """Extract the selector kind from a selector dict."""
    kinds = ["Class", "Placement", "Tag", "TagCode", "Dist", "DistCode", 
             "Range", "RangeDist", "RangeTag", "Query"]
    for kind in kinds:
        if kind in selector:
            return kind
    return "Unknown"


def _build_selector_path(selector: dict, selector_index: int, group_index: int | None = None) -> SelectorPath:
    """Build a SelectorPath from a selector dict."""
    kind = _get_selector_kind(selector)
    path = SelectorPath(
        selector_index=selector_index,
        selector_kind=kind,
    )
    
    # If this is a Query selector, we need to track nested paths
    # This is a placeholder - actual nested path would be built during matching
    # For now, we just mark that this is a Query type
    if kind == "Query" and "Query" in selector:
        # Nested queries would be handled recursively during course matching
        pass
    
    return path


# ---------------------------------------------------------------------------
# Course metadata tracking
# ---------------------------------------------------------------------------

@dataclass
class CourseMetadata:
    """Metadata about which selector matched a course."""
    selector_index: int
    selector_kind: str
    group_index: int
    nested_path: list[SelectorPath] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Solver
# ---------------------------------------------------------------------------

def solve(matching_eval: dict, include_query: bool = False) -> SolveResult:
    """
    Run the CP-SAT requirement-matching solver with granular MQL component tracking.

    Parameters
    ----------
    matching_eval:
        The dict produced by the upstream MQL matching pipeline.  Expected
        top-level keys: ``"results"``, ``"allSelectedCourses"``.
        
        REQUIRED ADDITIONS to matching_eval structure:
        - Each item in qr["selectedCourses"] should include metadata about which
          selector matched it. This can be added by the frontend matcher.
    include_query:
        When True, each ``RequirementResult`` will carry the raw query dict
        from the original requirement.

    Returns
    -------
    SolveResult
        A dataclass with all relevant outputs.  Call ``.to_dict()`` if you
        need a plain JSON-serialisable dict.

    Notes
    -----
    * Courses are never double-counted across requirements.
    * Requirements are filled in priority order (lexicographic objective).
    * Within the same priority tier, the solver maximises the number of
      assigned items; placements are slightly penalised so real courses are
      preferred when both would satisfy a requirement.
    * Each selected course now includes its MQL selector path for UI mapping.
    """
    model = cp_model.CpModel()
    results = matching_eval["results"]

    # ---- collect all offerings and create selection variables ----
    offerings: dict[str, dict] = {}      # course_id  -> course dict
    placements: dict[str, dict] = {}     # place_key  -> placement dict
    x: dict[str, cp_model.IntVar] = {}
    x_place: dict[str, cp_model.IntVar] = {}

    flat_courses = [
        c
        for group in matching_eval.get("allSelectedCourses", [])
        for c in (group if isinstance(group, list) else [group])
    ]
    for item in flat_courses:
        if _is_placement(item):
            pk = _placement_key(item)
            if pk not in x_place:
                placements[pk] = item
                x_place[pk] = model.new_bool_var(f"x_{_safe_var_name(pk)}")
        else:
            cid = _course_id(item)
            if cid not in x:
                offerings[cid] = item
                x[cid] = model.new_bool_var(f"x_{_safe_var_name(cid)}")

    # ---- per-requirement assignment variables with metadata tracking ----
    y: dict[tuple[int, str], cp_model.IntVar] = {}
    req_cands: list[list[str]] = []
    # NEW: track metadata for each candidate
    course_metadata: dict[tuple[int, str], CourseMetadata] = {}
    sat: list[cp_model.IntVar] = []

    for r, qr in enumerate(results):
        req = qr["requirement"]
        qmin, qmax = _q_bounds(req["query"]["quantity"])

        cand_keys: list[str] = []
        groups: list[dict] = []

        for group_idx, group_items in enumerate(qr["selectedCourses"]):
            if not isinstance(group_items, list):
                group_items = [group_items]

            selector = req["query"].get("selector", [])
            selector_idx = group_idx if group_idx < len(selector) else 0
            selector_kind = _get_selector_kind(selector[selector_idx]) if selector_idx < len(selector) else "Unknown"
            
            if group_idx < len(selector):
                inner_q = selector[group_idx].get("Query", {})
                _, glimit = _q_bounds(inner_q.get("quantity", {"Single": len(group_items)}))
            else:
                glimit = len(group_items)

            group_keys: list[str] = []
            for item in group_items:
                if _is_placement(item):
                    pk = _placement_key(item)
                    cand_keys.append(pk)
                    group_keys.append(pk)
                    
                    # Store metadata
                    course_metadata[(r, pk)] = CourseMetadata(
                        selector_index=selector_idx,
                        selector_kind=selector_kind,
                        group_index=group_idx,
                    )
                    
                    if pk not in x_place:
                        placements[pk] = item
                        x_place[pk] = model.new_bool_var(f"x_{_safe_var_name(pk)}")
                else:
                    cid = _course_id(item)
                    cand_keys.append(cid)
                    group_keys.append(cid)
                    
                    # Store metadata
                    course_metadata[(r, cid)] = CourseMetadata(
                        selector_index=selector_idx,
                        selector_kind=selector_kind,
                        group_index=group_idx,
                    )
                    
                    if cid not in x:
                        offerings[cid] = item
                        x[cid] = model.new_bool_var(f"x_{_safe_var_name(cid)}")

            if group_keys:
                groups.append({"limit": glimit, "keys": group_keys})

        req_cands.append(cand_keys)

        # y[r, key] assignment vars, linked to selection vars
        for key in cand_keys:
            y[(r, key)] = model.new_bool_var(
                f"y_r{r}_{_safe_var_name(key)}"
            )
            if _is_place_key(key):
                model.add(y[(r, key)] <= x_place[key])
            else:
                model.add(y[(r, key)] <= x[key])

        sum_assigned = sum(y[(r, key)] for key in cand_keys)
        s = model.new_bool_var(f"sat_{r}")
        sat.append(s)

        model.add(sum_assigned <= qmax)
        model.add(sum_assigned >= qmin).only_enforce_if(s)
        if qmin > 0:
            model.add(sum_assigned <= qmin - 1).only_enforce_if(s.negated())
        else:
            model.add(sum_assigned == 0).only_enforce_if(s.negated())

        for group in groups:
            gkeys = [k for k in group["keys"] if (r, k) in y]
            if gkeys:
                model.add(sum(y[(r, k)] for k in gkeys) <= group["limit"])

    # ---- no double-counting constraints ----
    for c in x:
        used = [y[(r, c)] for r in range(len(results)) if (r, c) in y]
        if used:
            model.add(sum(used) <= 1)

    for pk in x_place:
        used = [y[(r, pk)] for r in range(len(results)) if (r, pk) in y]
        if used:
            model.add(sum(used) <= 1)

    # base-course uniqueness (collapse cross-season duplicates)
    base_to_y: dict[str, list[cp_model.IntVar]] = {}
    for (r, key), var in y.items():
        if _is_place_key(key):
            continue
        b = _base_key(offerings[key])
        base_to_y.setdefault(b, []).append(var)
    for vars_ in base_to_y.values():
        model.add(sum(vars_) <= 1)

    # ---- priority-lexicographic objective ----
    R = len(results)
    req_priority = [results[r]["requirement"]["priority"] for r in range(R)]
    priorities = sorted(set(req_priority), reverse=True)
    BASE = R + 1
    M = 10_000
    PLACEMENT_PENALTY = 1

    expr = sum(
        sum(sat[r] for r in range(R) if req_priority[r] == p) * (BASE ** (len(priorities) - 1 - i))
        for i, p in enumerate(priorities)
    )
    # model.maximize(
    #     expr * M
    #     + sum(y.values())
    #     - PLACEMENT_PENALTY * sum(x_place.values())
    # )
    weighted_assignments = sum(
        y[(r, key)] * (BASE ** (len(priorities) - 1 - priorities.index(req_priority[r])))
        for (r, key) in y
    )
    
    model.maximize(
        expr * M
        + sum(y.values())
        + weighted_assignments
        - PLACEMENT_PENALTY * sum(x_place.values())
    )

    # ---- solve ----
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 2.0
    solver.parameters.num_search_workers = 8
    status = solver.Solve(model)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return SolveResult(status="no_solution", status_cpsat=str(status))

    selected_courses = [c for c, var in x.items() if solver.value(var) == 1]
    selected_placements = [pk for pk, var in x_place.items() if solver.value(var) == 1]

    per_req: list[RequirementResult] = []
    for r, qr in enumerate(results):
        chosen_keys = [k for k in req_cands[r] if solver.value(y[(r, k)]) == 1]
        
        # Build SelectedCourse objects with MQL component mapping
        chosen_courses = []
        for key in chosen_keys:
            metadata = course_metadata.get((r, key))
            if metadata:
                selector_path = SelectorPath(
                    selector_index=metadata.selector_index,
                    selector_kind=metadata.selector_kind,
                    nested_path=metadata.nested_path,
                )
                chosen_courses.append(SelectedCourse(
                    course_id=key,
                    selector_path=selector_path,
                    group_index=metadata.group_index,
                ))
            else:
                # Fallback if metadata missing
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