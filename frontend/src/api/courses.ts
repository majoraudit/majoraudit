import { apiClient } from "./apiClient";

export const getCourses = async () => {
  return apiClient.get("/courses/");
};

export const getCourseByExternalId = async (externalId: number) => {
  return apiClient.get(`/courses/${externalId}/`);
};

export const getCourseTableDetails = async () => {
  return apiClient.get("/courses/coursetable/");
};