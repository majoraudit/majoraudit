import { apiClient } from "./apiClient";

const BASE = "/worksheets";

export interface BackendSemester {
  id: number;
  year: number;
  season: string;
  classes: any[];
}

export interface Worksheet {
  id: number;
  name: string;
  semesters: BackendSemester[];
}
export interface CreateWorksheetPayload {
  name: string;
}

export interface UpdateWorksheetPayload {
  name: string;
}

// GET /worksheets/
export async function apiGetWorksheets(): Promise<Worksheet[]> {
  const res = await apiClient.get(BASE + "/");
  if (!res.ok) throw new Error("Failed to fetch worksheets");
  return res.json();
}

// GET /worksheets/:id/
export async function apiGetWorksheet(worksheetId: number): Promise<Worksheet> {
  const res = await apiClient.get(`${BASE}/${worksheetId}/`);
  if (!res.ok) throw new Error(`Failed to fetch worksheet ${worksheetId}`);
  return res.json();
}

// POST /worksheets/
export async function apiCreateWorksheet(payload: CreateWorksheetPayload): Promise<Worksheet> {
  const res = await apiClient.post(BASE + "/", payload);
  
  if (!res.ok){
    const errorText = await res.text();
    console.log("Error response:", errorText);
    throw new Error("Failed to create worksheet");
  }
  return res.json();
}

// PUT /worksheets/:id/
export async function apiUpdateWorksheet(
  worksheetId: number,
  payload: UpdateWorksheetPayload
): Promise<Worksheet> {
  const res = await apiClient.put(`${BASE}/${worksheetId}/`, payload);
  if (!res.ok) throw new Error(`Failed to update worksheet ${worksheetId}`);
  return res.json();
}

// DELETE /worksheets/:id/
export async function apiDeleteWorksheet(worksheetId: number): Promise<void> {
  const res = await apiClient.delete(`${BASE}/${worksheetId}/`);
  if (!res.ok) throw new Error(`Failed to delete worksheet ${worksheetId}`);
}