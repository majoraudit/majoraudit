/**
 * auditToMajorProgress.ts — adapter from backend solver output to the
 * `MajorProgress` shape that the existing Dashboard UI components consume.
 *
 * This is a thin shim, not a real conversion. The solver returns flat
 * per-requirement results; the Dashboard widgets and requirement
 * list/graph expect a deeply-nested `MajorProgress` with
 * `GroupItemProgress[]` containing `CourseItemProgressType[]`. The shim
 * synthesizes one `GroupItemProgress` per `RequirementResult` directly
 * from the solver output, sized so the existing UI math
 * (completedNum/requiredNum, isCompleted, etc.) is exact.
 *
 * The solver is the source of truth; we just give the existing UI a
 * shape it understands. The shim is lossless for everything except
 * `courseItem.type` (the MQL selector kind), which the solver flattens
 * away — `flexibility-meter` in `DashboardInsightGrid` reads this and
 * will see all items as `single-choice`.
 */

import type { MajorAudit, Quantity, RequirementResult } from "@/api/audit";
import type {
  MajorProgress,
  GroupItemProgress,
  CourseItemProgressType,
} from "@/types/type-program";
import type { StudentCourse, Course } from "@/types/type-user";

/** Build a synthetic `StudentCourse` from a course-code string. */
function syntheticStudentCourse(code: string): StudentCourse {
  const course: Course = {
    id: code,
    codes: [code],
    title: code,
    credit: 0,
    dist: [],
    tags: [],
  };
  return {
    course,
    term: 0,
    status: "DA_COMPLETE",
  };
}

/** Extract the integer required count from an MQL `Quantity`. */
function quantityToRequiredNum(q: Quantity | undefined, fallback: number): number {
  if (!q) return fallback;
  if ("Single" in q) return q.Single;
  if ("Many" in q) return q.Many.from;
  return fallback;
}

/**
 * Convert one `RequirementResult` into a `GroupItemProgress`.
 *
 * Each fulfilled course becomes a completed `single-choice` item; each
 * missing slot (when `selected.length < requiredNum`) becomes an empty
 * placeholder item. This gives the UI the right "X of Y" count and the
 * right list of fulfillments without inventing structure that isn't
 * really there.
 */
function requirementToGroupProgress(
  req: RequirementResult,
): GroupItemProgress {
  const requiredNum = quantityToRequiredNum(req.query?.quantity, 1);

  const completedItems: CourseItemProgressType[] = req.selected.map((code) => ({
    type: "single-choice",
    courseCode: code,
    isCompleted: true,
    completedCourses: [syntheticStudentCourse(code)],
  }));

  const missingCount = Math.max(0, requiredNum - completedItems.length);
  const missingItems: CourseItemProgressType[] = Array.from(
    { length: missingCount },
    () => ({
      type: "single-choice",
      courseCode: "",
      isCompleted: false,
      completedCourses: [],
    }),
  );

  return {
    description: req.description,
    requiredNum,
    courseItems: [...completedItems, ...missingItems],
    isCompleted: req.satisfied,
    completedNum: completedItems.length,
  };
}

/**
 * Build a `MajorProgress` shim from a `MajorAudit`. Returns null if the
 * audit has no `solve_result` (e.g. backend returned an error for that
 * major).
 */
export function auditToMajorProgress(audit: MajorAudit): MajorProgress | null {
  if (!audit.solve_result) return null;

  // Solver sorts results internally by priority; for display we want the
  // higher-priority requirements first.
  const sortedReqs = [...audit.solve_result.per_requirement].sort(
    (a, b) => a.priority - b.priority,
  );

  const requirements: GroupItemProgress[] = sortedReqs.map(
    requirementToGroupProgress,
  );

  const totalCompletedRequirementGroups = requirements.filter(
    (g) => g.isCompleted,
  ).length;

  return {
    id: `${audit.major_id}_${audit.degree_type}`,
    name: audit.name,
    totalCourses: audit.solve_result.total_courses,
    totalRequirementGroups: requirements.length,
    requirements,
    totalCompletedCourses: audit.solve_result.total_courses,
    totalCompletedRequirementGroups,
    info: {
      name: audit.name,
      abbr: "",
      degreeType: "Major",
      stats: { courses: 0, rating: 0, workload: 0, type: audit.degree_type },
      students: 0,
      about: "",
      dus: { name: [], email: [] },
      catalogLink: "",
      websiteLink: "",
      majorEmail: "",
    },
  };
}
