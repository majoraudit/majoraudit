// api/user_info.ts

import { getCsrfToken } from "./apiClient";

export interface UserInfo {
  id: number;
  class_year: number | null;
  language_requirement: string;
  intended_major_id: string;
  intended_language_code: string;
}

export interface UserMajor {
  id: number;
  major_id: string;
  specialization: string;
  added_at: string;
}

export interface UpdateUserInfoPayload {
  class_year?: number | null;
  language_requirement?: string;
  intended_major_id?: string;
  intended_language_code?: string;
}

export interface AddMajorPayload {
  major_id: string;
  specialization?: string;
}

// GET /api/user/info/
export async function apiGetUserInfo(): Promise<UserInfo> {
  const res = await fetch("/api/user/info/", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch user info");
  return res.json();
}

// PUT /api/user/info/
export async function apiUpdateUserInfo(payload: UpdateUserInfoPayload): Promise<UserInfo> {
  const res = await fetch("/api/user/info/", {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCsrfToken(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update user info");
  return res.json();
}

// GET /api/user/majors/
export async function apiGetMajors(): Promise<UserMajor[]> {
  const res = await fetch("/api/user/majors/", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch majors");
  return res.json();
}

// POST /api/user/majors/
export async function apiAddMajor(payload: AddMajorPayload): Promise<UserMajor> {
  const res = await fetch("/api/user/majors/", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCsrfToken(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to add major");
  return res.json();
}

// DELETE /api/user/majors/:id/
export async function apiRemoveMajor(majorId: number): Promise<void> {
  const res = await fetch(`/api/user/majors/${majorId}/`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "X-CSRFToken": getCsrfToken(),
    },
  });
  if (!res.ok) throw new Error("Failed to remove major");
}