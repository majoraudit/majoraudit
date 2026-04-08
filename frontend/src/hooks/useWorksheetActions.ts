import { useCallback } from "react";
import { useUser } from "@/contexts/UserContext";
import { useWorksheetManager } from "@/hooks/useWorksheetManager";
import { apiCreateSemester, apiDeleteSemester } from "@/api/semesters";
import {apiAddCourse, apiRemoveCourse } from "@/api/courses";
import { apiUpdateSemester } from "@/api/semesters";
import { apiAddMajor, apiRemoveMajor } from "@/api/user_info";


import type { Course, StudentCourse, StudentSemester } from "@/types/type-user";

/**
 * Hook that mutates the active worksheet inside userData.
 * - No alerts: returns { ok, error } so UI can decide.
 * - Uses activeWorksheet from useWorksheetManager.
 */

export function useWorksheetActions() {
  const { userData, setUserData } = useUser();

  const { activeWorksheetId, activeWorksheet } = useWorksheetManager();

  const worksheet = activeWorksheet;

  const canMutate = Boolean(userData && worksheet && activeWorksheetId);

  function isMajorType(t?: string) {
    return t === "major" || t === "Major";
  }
  function isCertificateType(t?: string) {
    return t === "certificate" || t === "Certificate";
  }

  const updateActiveWorksheet = useCallback(
    (updater: (ws: any) => any) => {
      if (!userData || !worksheet) return;

      const updatedWorksheet = updater(worksheet);

      setUserData({
        ...userData,
        FYP: {
          ...userData.FYP,
          worksheets: (userData.FYP.worksheets ?? []).map((w) =>
            w.id === worksheet.id ? updatedWorksheet : w
          ),
        },
      });
    },
    [userData, worksheet, setUserData]
  );

  const addSemester = useCallback(
    async (newSemester: StudentSemester) => {

      if (!canMutate || !activeWorksheetId) return { ok: false, error: "No active worksheet." };

      const exists = worksheet.studentSemesters.some(
        (s: StudentSemester) => s.season === newSemester.season
      );
      if (exists) {
        return { ok: false, error: "A semester with this term/year already exists." };
      }


      // Create on the backend first to get the real ID
      const created = await apiCreateSemester(parseInt(activeWorksheetId), {
        year: Math.floor(newSemester.season / 100),
        season: newSemester.season % 100 === 1 ? "SP" : "FA",
        title: newSemester.title
      });

      const semesterWithId: StudentSemester = { ...newSemester, id: created.id };

      updateActiveWorksheet((ws) => ({
        ...ws,
        studentSemesters: [...ws.studentSemesters, semesterWithId].sort(
          (a: StudentSemester, b: StudentSemester) => a.season - b.season
        ),
      }));

      return { ok: true as const };
    },
    [canMutate, activeWorksheetId, worksheet, updateActiveWorksheet]
  );

  const removeSemester = useCallback(
    async (season: number) => {
      if (!canMutate || !activeWorksheetId) return { ok: false, error: "No active worksheet." };

      const semester = worksheet.studentSemesters.find(
        (s: StudentSemester) => s.season === season
      );
      if (!semester) {
        return { ok: false, error: "That semester does not exist." };
      }

      // Delete on the backend using the stored semester ID
      await apiDeleteSemester(parseInt(activeWorksheetId), semester.id);

      updateActiveWorksheet((ws) => ({
        ...ws,
        studentSemesters: ws.studentSemesters
          .filter((s: StudentSemester) => s.season !== season)
          .sort((a: StudentSemester, b: StudentSemester) => a.season - b.season),
      }));

      return { ok: true as const };
    },
    [canMutate, activeWorksheetId, worksheet, updateActiveWorksheet]
  );

  const addCourse = useCallback(
    async (season: number, newCourse: StudentCourse) => {
      if (!canMutate || !activeWorksheetId) return { ok: false, error: "No active worksheet." };

      const semester = worksheet.studentSemesters.find(
        (s: StudentSemester) => s.season === season
      );
      if (!semester) return { ok: false, error: "Semester not found." };

      const courseAlreadyExists = semester.studentCourses.some(
        (sc: StudentCourse) => sc.course.codes?.[0] === newCourse.course.codes?.[0]
      );
      if (courseAlreadyExists) return { ok: false, error: "Course already in semester." };

      // Add on the backend using the semester's backend ID
      const created = await apiAddCourse(parseInt(activeWorksheetId), semester.id, {
        course: newCourse.course.id,
      });

      const courseWithId: StudentCourse = { ...newCourse, worksheetClassId: created.id };
 

      updateActiveWorksheet((ws) => ({
        ...ws,
        studentSemesters: ws.studentSemesters.map((s: StudentSemester) =>
          s.season !== season
            ? s
            : { ...s, studentCourses: [...s.studentCourses, courseWithId] }
        ),
      }));

      return { ok: true as const };
    },
    [canMutate, activeWorksheetId, worksheet, updateActiveWorksheet]
  );

  const removeCourse = useCallback(
    async (season: number, courseToRemove: Course) => {
      if (!canMutate || !activeWorksheetId) return { ok: false, error: "No active worksheet." };

      const semester = worksheet.studentSemesters.find(
        (s: StudentSemester) => s.season === season
      );
      if (!semester) return { ok: false, error: "Semester not found." };

      // Find the StudentCourse entry to get its backend ID
      const studentCourse = semester.studentCourses.find(
        (sc: StudentCourse) =>
          sc.course.codes?.[0] === courseToRemove.codes?.[0] &&
          sc.course.title === courseToRemove.title
      );
      if (!studentCourse) return { ok: false, error: "Course not found in semester." };

      // Remove on the backend
      await apiRemoveCourse(parseInt(activeWorksheetId), semester.id, studentCourse.worksheetClassId!);

      updateActiveWorksheet((ws) => ({
        ...ws,
        studentSemesters: ws.studentSemesters.map((s: StudentSemester) =>
          s.season !== season
            ? s
            : {
                ...s,
                studentCourses: s.studentCourses.filter(
                  (sc: StudentCourse) =>
                    !(
                      sc.course.codes?.[0] === courseToRemove.codes?.[0] &&
                      sc.course.title === courseToRemove.title
                    )
                ),
              }
        ),
      }));

      return { ok: true as const };
    },
    [canMutate, activeWorksheetId, worksheet, updateActiveWorksheet]
  );

  const setSemesterCompleted = useCallback(
    async (season: number, isCompleted: boolean) => {
      if (!canMutate || !activeWorksheetId)
        return { ok: false as const, error: "No active worksheet." };

      const semester = worksheet.studentSemesters.find(
        (s: StudentSemester) => s.season === season
      );
      if (!semester) return { ok: false as const, error: "Semester not found." };

      // Persist to backend — reuse year/season derived from season code
      await apiUpdateSemester(parseInt(activeWorksheetId), semester.id, {
        year: Math.floor(season / 100),
        season: season % 100 === 1 ? "SP" : "FA",
        is_completed: isCompleted
      });

      updateActiveWorksheet((ws) => ({
        ...ws,
        studentSemesters: ws.studentSemesters.map((s: StudentSemester) =>
          s.season !== season ? s : { ...s, isCompleted }
        ),
      }));

      return { ok: true as const };
    },
    [canMutate, activeWorksheetId, worksheet, updateActiveWorksheet]
  );

  const addProgram = useCallback(
  async (majorId: string, specialization: string = "") => {
    try {
      const created = await apiAddMajor({ major_id: majorId, specialization });

      setUserData((prev) => {
        if (!prev) return prev;
        const already = prev.FYP.majors?.some((m) => m.id === created.id);
        if (already) return prev;
        return {
          ...prev,
          FYP: {
            ...prev.FYP,
            majors: [...(prev.FYP.majors ?? []), created],
          },
        };
      });

      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, error: "Failed to add major." };
    }
  },
  [setUserData]
);


  const removeProgram = useCallback(
  async (majorRowId: number) => {
    try {
      await apiRemoveMajor(majorRowId);

      setUserData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          FYP: {
            ...prev.FYP,
            majors: (prev.FYP.majors ?? []).filter((m) => m.id !== majorRowId),
          },
        };
      });

      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, error: "Failed to remove major." };
    }
  },
  [setUserData]
);

  return {
    addSemester,
    removeSemester,
    addCourse,
    removeCourse,
    setSemesterCompleted,
    addProgram,
    removeProgram,
  };
}