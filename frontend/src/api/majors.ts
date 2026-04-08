import { getCsrfToken } from "./apiClient";
import { type Course } from "@/types/type-user";
import { MQLMatcher } from "@/services/MatchingEngine";
import { type MQLQueryFile } from "@/types/schema/mql/mql";
import { type CourseList } from "@/types/schema/courses/courses";


export async function apiFetchMajorTemplatesList(): Promise<string[]> {
  const res = await fetch("/api/majors/", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch major list");
  return res.json();
}

export async function apiFetchMajorTemplate(majorId: string) {
  const res = await fetch(`/api/majors/${majorId}/`, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to fetch major template ${majorId}`);
  return res.json();
}

export async function apiFetchMajorMQL(majorId: string, majorSpecification: string) {
  const url = `/api/majors/${majorId}/mql?specialization=${majorSpecification}`;
  console.log("Fetching MQL:", url);
  const res = await fetch(url, { credentials: "include" });
  const body = await res.json();
  if (!res.ok) {
    console.log("MQL error response:", body);
    throw new Error(`Failed to fetch major MQL: ${res.status}`);
  }
  return body;
}

export interface SelectorPath {
  selector_index: number;
  selector_kind: string;
  nested_path?: SelectorPath[];
}

export interface SelectedCourse {
  course_id: string;
  selector_path: SelectorPath;
  group_index?: number;
}

export interface AuditRequirement {
  description: string;
  priority: number;
  satisfied: boolean;
  selected: SelectedCourse[];
  query?: any;
}

export interface AuditResult {
  version: string;
  status: string;
  status_cpsat: string;
  total_satisfied: number;
  total_courses: number;
  selected_courses: string[];
  selected_placements: string[];
  per_requirement: AuditRequirement[];
}

export async function apiRunAudit(
  courses: Course[],
  courseCatalog: Course[],
  mqlData: MQLQueryFile,
): Promise<AuditResult> {
  // 1. Run local matching to produce matching_eval
  const courseListForMatcher = courseCatalog.map((c) => ({
  ...c,
  external_id: c.id,
  seasons: [],
  season_codes: [],
})) as unknown as CourseList;
const mqlMatcher = new MQLMatcher()

  const matchResult = mqlMatcher.match(courseListForMatcher, mqlData);

let matchingEval;
if (matchResult.ok) {
  matchingEval = matchResult.data;
} else {
  throw matchResult
  // // Build a best-effort matching_eval using all courses as candidates
  // // for every requirement — solver will figure out what fits
  // matchingEval = {
  //   results: mqlData.requirements.map((req) => ({
  //     requirement: req,
  //     selectedCourses: [courseListForMatcher], // all courses as candidates
  //   })),
  //   allSelectedCourses: [courseListForMatcher],
  // };
}
 
// const courseSet = new Set(courses.map((c) => ({
//   ...c,
//   seasons: [],
//   season_codes: [],
// })) as unknown as CourseList);

// const filteredEval: MatchingEvaluationResult = {
//     results: matchingEval.results.map(result => ({
//         requirement: result.requirement,
//         selectedCourses: result.selectedCourses.filter(course => courseSet.has(course))
//     })),
//     allSelectedCourses: matchingEval.allSelectedCourses.filter(course => courseSet.has(course))
// };

const ids = new Set(courses.map(c => Number(c.id)))

const courseListMap = (qr: CourseList): CourseList => {
  let result: CourseList = []
  for (const x of qr) {
    if (Array.isArray(x)) {
      result.push(courseListMap(x))
      continue;
    }
    if ("filled" in x) {
      continue; // skip manual fulfillment
    }

    if (x.external_id === undefined) {
      console.warn(x.external_id)
    }

    if (ids.has(x.external_id!)) {
      result.push(x)
    }
  }

  return result
}

matchingEval.results.forEach((qr) => {
  qr.selectedCourses = courseListMap(qr.selectedCourses)
})

console.log(matchingEval);


  // 2. Send matching_eval to solver
  const res = await fetch("/api/majors/solve/", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCsrfToken(),
    },
    body: JSON.stringify({
      matching_eval: matchingEval,
      include_query: false,
    }),
  });


  if (!res.ok) throw new Error(`Audit failed: ${res.status}`);

  const resJson = await res.json();

  console.log(resJson);

  return resJson;
}