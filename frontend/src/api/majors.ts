import { fetchCsrfToken } from "./apiClient";
import { apiUrl } from "@/constants";
import type { MQLQueryFile } from "@/types/schema/mql/mql";

const catalogYear = "2026-2027";

export interface MajorSummary { id: string; name: string; programs: string[] }

export async function apiFetchMajorTemplatesList(): Promise<MajorSummary[]> {
  const res = await fetch(`${apiUrl}/majors/?catalog_year=${catalogYear}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch major list");
  return (await res.json()).majors;
}

export async function apiFetchMajorTemplate(majorId: string) {
  const res = await fetch(`${apiUrl}/majors/${majorId}/?catalog_year=${catalogYear}`, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to fetch major ${majorId}`);
  const { major } = await res.json();
  return { ...major, specializations: major.programs };
}

function fixedBound(bound: any): number {
  return bound?.kind === "FIXED" ? Number(bound.value) : 1;
}

function displayQuantity(req: any): number {
  const amount = fixedBound(req.lower);
  // MQL credit bounds use half-credit units; slot bounds are already counts.
  return req.contribution?.kind === "CREDITS" ? Math.max(1, amount / 2) : amount;
}

export async function apiFetchMajorMQL(majorId: string, programId: string): Promise<MQLQueryFile> {
  const res = await fetch(`${apiUrl}/majors/${majorId}/programs/${programId}/?catalog_year=${catalogYear}`, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to fetch program ${majorId}/${programId}`);
  const { program } = await res.json();
  // Preserve the semantic node while providing the small display projection used
  // by the existing cards during the UI migration.
  const project = (req: any): any => ({
    ...req,
    requirement_id: String(req.meta.id),
    description: String(req.meta.description ?? req.meta.id),
    children: (req.children ?? []).map(project),
    query: {
      quantity: { Single: displayQuantity(req) },
      type: "Select",
      selector: [{ Placement: String(req.meta.description ?? req.meta.id) }],
    },
  });
  return {
    version: program.schema_version,
    requirements: program.requirements.map(project),
    choices: program.choices,
    facts: program.facts,
  };
}

export interface Rational { numerator: number; denominator: number }
export interface AuditRequirement {
  requirement_id: string;
  description: string;
  active: boolean;
  q: number;
  lower: number;
  upper: number | null;
  satisfied: boolean;
  progress: Rational;
  selected: { course_id: string }[];
}
export interface EngineAudit {
  status: string;
  program_complete: boolean | null;
  choices: Record<string, unknown>;
  effects: unknown[];
  assignments: { attempt_id: string; requirement_id: string; constraint_ids: string[] }[];
  rejections: unknown[];
  requirements: Omit<AuditRequirement, "description" | "selected">[];
  totals: unknown[];
  objective: unknown;
  alternate_witnesses: unknown[];
  trace: unknown[];
}
export interface AuditResult {
  api_version: "2";
  scope: "completed";
  catalog_year: string;
  majors_revision: string;
  program: { major_id: string; program_id: string; semantic_program_id: string; schema_version: string; requirements: any[] };
  attempts: { attempt_id: string; canonical_course_id: string }[];
  audit: EngineAudit;
  per_requirement: AuditRequirement[];
}

function flattenRequirements(requirements: any[]): any[] {
  return requirements.flatMap((req) => [req, ...flattenRequirements(req.children ?? [])]);
}

export async function apiRunAudit(worksheetId: number, worksheetMajorId: number): Promise<AuditResult> {
  const csrfToken = await fetchCsrfToken();
  const res = await fetch(`${apiUrl}/worksheets/${worksheetId}/majors/${worksheetMajorId}/audit/`, {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
    body: "{}",
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message ?? `Audit failed: ${res.status}`);
  const descriptions = Object.fromEntries(flattenRequirements(body.program.requirements).map((r) => [String(r.meta.id), r.description]));
  const assignments = body.audit.assignments as EngineAudit["assignments"];
  const courseByAttempt = Object.fromEntries(body.attempts.map((attempt: any) => [attempt.attempt_id, attempt.canonical_course_id]));
  body.per_requirement = body.audit.requirements.map((req: any) => ({
    ...req,
    description: descriptions[req.requirement_id] ?? req.requirement_id,
    selected: assignments.filter((a) => a.requirement_id === req.requirement_id).map((a) => ({ course_id: courseByAttempt[a.attempt_id] ?? a.attempt_id })),
  }));
  return body;
}
