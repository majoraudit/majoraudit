import { apiClient } from "./apiClient";

export interface WorksheetMajor {
  id: number;
  major_id: string;
  degree_type: string;
}

export interface WorksheetMajorPayload {
  major_id: string;
  degree_type: string;
}

// GET /worksheets/:worksheetId/majors/
export async function apiListWorksheetMajors(
  worksheetId: number,
): Promise<WorksheetMajor[]> {
  const res = await apiClient.get(`/worksheets/${worksheetId}/majors/`);
  if (!res.ok) throw new Error(`Failed to list worksheet majors (${res.status})`);
  return res.json();
}

// POST /worksheets/:worksheetId/majors/
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

// DELETE /worksheets/:worksheetId/majors/:id/
export async function apiRemoveWorksheetMajor(
  worksheetId: number,
  worksheetMajorId: number,
): Promise<void> {
  const res = await apiClient.delete(
    `/worksheets/${worksheetId}/majors/${worksheetMajorId}/`,
  );
  if (!res.ok) throw new Error(`Failed to remove worksheet major (${res.status})`);
}
