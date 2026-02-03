import { useCallback } from "react";
import { useUser } from "@/contexts/UserContext";
import { useWorksheetManager } from "@/hooks/useWorksheetManager";

import type { Course, StudentCourse, StudentSemester } from "@/types/type-user";

/**
 * Hook that mutates the active worksheet inside userData.
 * - No alerts: returns { ok, error } so UI can decide.
 * - Uses activeWorksheet from useWorksheetManager.
 */

export function useWorksheetActions() {
  const { userData, setUserData } = useUser();

  const { activeWorksheetId, activeWorksheet } =
    useWorksheetManager();

  const worksheet = activeWorksheet;

  const canMutate = Boolean(userData && worksheet && activeWorksheetId);

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
    (newSemester: StudentSemester) => {
      if (!canMutate) return { ok: false, error: "No active worksheet." };

      const exists = worksheet.studentSemesters.some(
        (s: StudentSemester) => s.season === newSemester.season
      );
      if (exists) {
        return {
          ok: false,
          error: "A semester with this term/year already exists.",
        };
      }

      updateActiveWorksheet((ws) => ({
        ...ws,
        studentSemesters: [...ws.studentSemesters, newSemester].sort(
          (a: StudentSemester, b: StudentSemester) => a.season - b.season
        ),
      }));

      return { ok: true as const };
    },
    [canMutate, worksheet, updateActiveWorksheet]
  );

  const removeSemester = useCallback(
    (season: number) => {
      if (!canMutate) return { ok: false, error: "No active worksheet." };

      const exists = worksheet.studentSemesters.some(
        (s: StudentSemester) => s.season === season
      );
      if (!exists) {
        return { ok: false, error: "That semester does not exist." };
      }

      updateActiveWorksheet((ws) => ({
        ...ws,
        studentSemesters: ws.studentSemesters
          .filter((s: StudentSemester) => s.season !== season)
          .sort((a: StudentSemester, b: StudentSemester) => a.season - b.season),
      }));

      return { ok: true as const };
    },
    [canMutate, worksheet, updateActiveWorksheet]
  );

  const addCourse = useCallback(
    (season: number, newCourse: StudentCourse) => {
      if (!canMutate) return { ok: false, error: "No active worksheet." };

      updateActiveWorksheet((ws) => {
        const updatedSemesters = ws.studentSemesters.map(
          (semester: StudentSemester) => {
            if (semester.season !== season) return semester;

            const courseAlreadyExists = semester.studentCourses.some(
              (sc: StudentCourse) =>
                sc.course.codes?.[0] === newCourse.course.codes?.[0]
            );

            if (courseAlreadyExists) return semester;

            return {
              ...semester,
              studentCourses: [...semester.studentCourses, newCourse],
            };
          }
        );

        return { ...ws, studentSemesters: updatedSemesters };
      });

      return { ok: true as const };
    },
    [canMutate, updateActiveWorksheet]
  );

  const removeCourse = useCallback(
    (season: number, courseToRemove: Course) => {
      if (!canMutate) return { ok: false, error: "No active worksheet." };

      updateActiveWorksheet((ws) => {
        const updatedSemesters = ws.studentSemesters.map(
          (semester: StudentSemester) => {
            if (semester.season !== season) return semester;

            return {
              ...semester,
              studentCourses: semester.studentCourses.filter(
                (sc: StudentCourse) =>
                  !(
                    sc.course.codes?.[0] === courseToRemove.codes?.[0] &&
                    sc.course.title === courseToRemove.title
                  )
              ),
            };
          }
        );

        return { ...ws, studentSemesters: updatedSemesters };
      });

      return { ok: true as const };
    },
    [canMutate, updateActiveWorksheet]
  );

  const setSemesterCompleted = useCallback(
  (season: number, isCompleted: boolean) => {
    if (!canMutate) return { ok: false as const, error: "No active worksheet." };

    updateActiveWorksheet((ws) => {
      const updatedSemesters = ws.studentSemesters.map((semester: StudentSemester) => {
        if (semester.season !== season) return semester;
        return { ...semester, isCompleted };
      });

      return { ...ws, studentSemesters: updatedSemesters };
    });

    return { ok: true as const };
  },
  [canMutate, updateActiveWorksheet]
);

  return {
    addSemester,
    removeSemester,
    addCourse,
    removeCourse,
    setSemesterCompleted
  };
}
