import { apiClient } from "./apiClient";

export type ProfileResponse = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  class_year: number | null;
  intended_language_code: string;
  language_requirement: string;
};

export type ProfileUpdatePayload = Partial<{
  class_year: number | null;
  intended_language_code: string;
  language_requirement: string;
}>;

export async function fetchProfile(): Promise<ProfileResponse | null> {
  const res = await apiClient.get("/auth/profile/");

  if (!res.ok) {
    return null; // not authenticated
  }

  return res.json();
}

export async function apiUpdateProfile(
  payload: ProfileUpdatePayload,
): Promise<ProfileResponse> {
  const res = await apiClient.patch("/auth/profile/", payload);
  if (!res.ok) throw new Error(`Profile update failed (${res.status})`);
  return res.json();
}
