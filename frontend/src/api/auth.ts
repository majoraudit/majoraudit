import { apiClient } from "./apiClient";

export type ProfileResponse = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
};

export async function fetchProfile(): Promise<ProfileResponse | null> {
  const res = await apiClient.get("/auth/profile/");

  if (!res.ok) {
    return null; // not authenticated
  }

  return res.json();
}
