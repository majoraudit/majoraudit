import { apiClient } from "./apiClient";

export interface WorksheetMajor {
  id: number;
  catalog_year: string;
  major_id: string;
  program_id: string;
  declared_choices: Record<string, unknown>;
  fact_ids: string[];
}

export interface WorksheetMajorPayload {
  catalog_year?: string;
  major_id: string;
  program_id: string;
}

// GET /api/worksheets/<worksheetId>/majors/
export async function apiListWorksheetMajors(
  worksheetId: number,
): Promise<WorksheetMajor[]> {
  const res = await apiClient.get(`/worksheets/${worksheetId}/majors/`);
  if (!res.ok) {
    throw new Error(`Failed to list worksheet majors (${res.status})`);
  }
  return res.json();
}

// POST /api/worksheets/<worksheetId>/majors/
export async function apiAddWorksheetMajor(
  worksheetId: number,
  payload: WorksheetMajorPayload,
): Promise<WorksheetMajor> {
  const res = await apiClient.post(
    `/worksheets/${worksheetId}/majors/`,
    payload,
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Failed to add worksheet major (${res.status}): ${body}`);
  }
  return res.json();
}

// DELETE /api/worksheets/<worksheetId>/majors/<id>/
export async function apiRemoveWorksheetMajor(
  worksheetId: number,
  worksheetMajorId: number,
): Promise<void> {
  const res = await apiClient.delete(
    `/worksheets/${worksheetId}/majors/${worksheetMajorId}/`,
  );
  if (!res.ok) {
    throw new Error(`Failed to remove worksheet major (${res.status})`);
  }
}

export async function apiUpdateWorksheetMajor(
  worksheetId: number,
  worksheetMajorId: number,
  payload: Partial<Pick<WorksheetMajor, "declared_choices" | "fact_ids">>,
): Promise<WorksheetMajor> {
  const res = await apiClient.patch(
    `/worksheets/${worksheetId}/majors/${worksheetMajorId}/`, payload,
  );
  if (!res.ok) throw new Error(`Failed to update worksheet major (${res.status})`);
  return res.json();
}
