import { apiClient } from "./apiClient";

export async function getCourses() {
  const res = await apiClient.get("/courses/");
  return res.json();
}

export async function getMajors() {
  const res = await apiClient.get("/majors/");
  return res.json();
}

export async function getWorksheets() {
  const res = await apiClient.get("/worksheets/");
  if (!res.ok) throw new Error("Failed to fetch worksheets");
  return res.json();
}

export async function createWorksheet(name: string) {
  const res = await apiClient.post("/worksheets/", { name });
  if (!res.ok) throw new Error("Failed to create worksheet");
  return res.json();
}

export async function renameWorksheet(id: string, name: string) {
  const res = await apiClient.put(`/worksheets/${id}/`, { name });
  if (!res.ok) throw new Error("Failed to rename worksheet");
}

export async function deleteWorksheet(id: string) {
  const res = await apiClient.delete(`/worksheets/${id}/`);
  if (!res.ok) throw new Error("Failed to delete worksheet");
}

export async function addSemester(
  worksheetId: string,
  payload: {
    year: number;
    season: number;
  }
) {
  const res = await apiClient.post(
    `/worksheets/${worksheetId}/semesters/`,
    payload
  );
  return res.json();
}

export async function removeSemester(
  worksheetId: string,
  semesterId: string
) {
  const res = await apiClient.delete(
    `/worksheets/${worksheetId}/semesters/${semesterId}/`
  );
  if (!res.ok) throw new Error("Failed to remove semester");
}

export async function addCourseToSemester(
  worksheetId: string,
  semesterId: string,
  payload: { course_code: string; title: string; credits: number }
) {
  const res = await apiClient.post(
    `/worksheets/${worksheetId}/semesters/${semesterId}/classes/`,
    payload
  );
  if (!res.ok) throw new Error("Failed to add course");
  return res.json();
}

export async function removeCourseFromSemester(
  worksheetId: string,
  semesterId: string,
  classId: string
) {
  const res = await apiClient.delete(
    `/worksheets/${worksheetId}/semesters/${semesterId}/classes/${classId}/`
  );
  if (!res.ok) throw new Error("Failed to remove course");
}