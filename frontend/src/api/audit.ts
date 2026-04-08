import { apiClient } from "./apiClient";

export type Quantity = { Single: number } | { Many: { from: number; to: number } };

/**
 * The original MQL query for a requirement, included via the solver's
 * `include_query=True` flag. We only consume `quantity` here.
 */
export interface RequirementQuery {
  quantity: Quantity;
  type: string;
  selector: unknown[];
}

export interface RequirementResult {
  description: string;
  priority: number;
  satisfied: boolean;
  /** Course code strings (e.g. "CPSC 2010") and "PLACEMENT:<uuid>" entries. */
  selected: string[];
  /** The original parsed MQL query for this requirement. */
  query?: RequirementQuery;
}

export interface SolveResult {
  status: "ok" | "no_solution";
  status_cpsat: string;
  total_satisfied: number;
  total_courses: number;
  selected_courses: string[];
  selected_placements: string[];
  per_requirement: RequirementResult[];
}

/**
 * One audit result per WorksheetMajor on the worksheet. `solve_result` is
 * present on success; `error` is present if the MQL file was missing or the
 * solver crashed.
 */
export interface MajorAudit {
  major_id: string;
  degree_type: string;
  name: string;
  solve_result?: SolveResult;
  error?: string;
}

interface AuditResponse {
  audits: MajorAudit[];
}

/**
 * GET /api/worksheets/:id/audit/
 *
 * Backend loads the worksheet's courses + selected majors, parses each
 * major's MQL, runs the matcher and CP-SAT solver, returns results.
 */
export async function apiFetchAudit(worksheetId: number): Promise<MajorAudit[]> {
  const res = await apiClient.get(`/worksheets/${worksheetId}/audit/`);
  if (!res.ok) {
    throw new Error(`Audit fetch failed (${res.status})`);
  }
  const data: AuditResponse = await res.json();
  return data.audits;
}
