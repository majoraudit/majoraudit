import { apiClient } from "./apiClient";

const BASE = "/worksheets";

export type Season = "SP" | "SU" | "FA";

export interface Semester {
  id: number;
  year: number;
  season: Season;
}

export interface CreateSemesterPayload {
  year: number;
  season: Season;
}

export interface UpdateSemesterPayload {
  year?: number;
  season?: Season;
}

// GET /worksheets/:worksheetId/semesters/
export async function apiGetSemesters(worksheetId: number): Promise<Semester[]> {
  const res = await apiClient.get(`${BASE}/${worksheetId}/semesters/`);
  if (!res.ok) throw new Error(`Failed to fetch semesters for worksheet ${worksheetId}`);
  return res.json();
}

// GET /worksheets/:worksheetId/semesters/:semesterId/
export async function apiGetSemester(
  worksheetId: number,
  semesterId: number
): Promise<Semester> {
  const res = await apiClient.get(`${BASE}/${worksheetId}/semesters/${semesterId}/`);
  if (!res.ok) throw new Error(`Failed to fetch semester ${semesterId}`);
  return res.json();
}

// POST /worksheets/:worksheetId/semesters/
export async function apiCreateSemester(
  worksheetId: number,
  payload: CreateSemesterPayload
): Promise<Semester> {
  const res = await apiClient.post(`${BASE}/${worksheetId}/semesters/`, payload);
  if (!res.ok) 
    {
        const errorText = await res.text();
        console.log("createSemester error:", errorText);
        throw new Error(`Failed to create semester for worksheet ${worksheetId}`);
    }      
    return res.json();
}

// PUT /worksheets/:worksheetId/semesters/:semesterId/
export async function apiUpdateSemester(
  worksheetId: number,
  semesterId: number,
  payload: UpdateSemesterPayload
): Promise<Semester> {
  const res = await apiClient.put(`${BASE}/${worksheetId}/semesters/${semesterId}/`, payload);
  if (!res.ok) throw new Error(`Failed to update semester ${semesterId}`);
  return res.json();
}

// DELETE /worksheets/:worksheetId/semesters/:semesterId/
export async function apiDeleteSemester(
  worksheetId: number,
  semesterId: number
): Promise<void> {
  const res = await apiClient.delete(`${BASE}/${worksheetId}/semesters/${semesterId}/`);
  if (!res.ok) throw new Error(`Failed to delete semester ${semesterId}`);
}