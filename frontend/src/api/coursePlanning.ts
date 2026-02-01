import { apiClient } from "./apiClient";

/**
 * Course Planning APIs
 * These functions describe WHAT data the page needs.
 * They do not handle UI logic.
 */

export async function getCourses() {
  const res = await apiClient.get("/courses/");
  return res.json();
}

export async function getMajors() {
  const res = await apiClient.get("/majors/");
  return res.json();
}

export async function getSemesters() {
  const res = await apiClient.get("/semesters/");
  return res.json();
}

export async function getWorksheets() {
  const res = await apiClient.get("/worksheets/");
  return res.json();
}