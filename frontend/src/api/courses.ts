import { apiClient } from "./apiClient";

const BASE = "/worksheets";

export interface WorksheetCourse {
  id: number;
  course: number | null;
  course_instance: number | null;
  creditdf: boolean;
}

// Exactly one of course or course_instance must be provided — mirrors the backend constraint
export type CreateWorksheetCoursePayload =
  | { course: string; course_instance?: never; creditdf?: boolean }
  | { course_instance: number; course?: never; creditdf?: boolean };

export type UpdateWorksheetCoursePayload =
  | { course: number; course_instance?: never; creditdf?: boolean }
  | { course_instance: number; course?: never; creditdf?: boolean }
  | { creditdf: boolean; course?: never; course_instance?: never };

// GET /worksheets/:worksheetId/semesters/:semesterId/classes/
export async function apiGetCourses(
  worksheetId: number,
  semesterId: number
): Promise<WorksheetCourse[]> {
  const res = await apiClient.get(`${BASE}/${worksheetId}/semesters/${semesterId}/classes/`);
  if (!res.ok) throw new Error(`Failed to fetch courses for semester ${semesterId}`);
  return res.json();
}

// GET /worksheets/:worksheetId/semesters/:semesterId/classes/:courseId/
export async function apiGetCourse(
  worksheetId: number,
  semesterId: number,
  courseId: string
): Promise<WorksheetCourse> {
  const res = await apiClient.get(
    `${BASE}/${worksheetId}/semesters/${semesterId}/classes/${courseId}/`
  );
  if (!res.ok) throw new Error(`Failed to fetch course ${courseId}`);
  return res.json();
}

// POST /worksheets/:worksheetId/semesters/:semesterId/classes/
export async function apiAddCourse(
  worksheetId: number,
  semesterId: number,
  payload: CreateWorksheetCoursePayload
): Promise<WorksheetCourse> {
  const res = await apiClient.post(
    `${BASE}/${worksheetId}/semesters/${semesterId}/classes/`,
    payload
  );
  if (!res.ok) 
    {
      const errorText = await res.text();
        console.log("addCourse error:", errorText);
      throw new Error(`Failed to add course to semester ${semesterId}`);
    }
  return res.json();
}

// PUT /worksheets/:worksheetId/semesters/:semesterId/classes/:courseId/
export async function apiUpdateCourse(
  worksheetId: number,
  semesterId: number,
  courseId: string,
  payload: UpdateWorksheetCoursePayload
): Promise<WorksheetCourse> {
  const res = await apiClient.put(
    `${BASE}/${worksheetId}/semesters/${semesterId}/classes/${courseId}/`,
    payload
  );
  if (!res.ok) throw new Error(`Failed to update course ${courseId}`);
  return res.json();
}

// DELETE /worksheets/:worksheetId/semesters/:semesterId/classes/:courseId/
export async function apiRemoveCourse(
  worksheetId: number,
  semesterId: number,
  courseId: string
): Promise<void> {
  const res = await apiClient.delete(
    `${BASE}/${worksheetId}/semesters/${semesterId}/classes/${courseId}/`
  );
  if (!res.ok) throw new Error(`Failed to remove course ${courseId}`);
}