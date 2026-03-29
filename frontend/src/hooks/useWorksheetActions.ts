import { useCallback } from "react";
import { useUser } from "@/contexts/UserContext";
import { useWorksheetManager } from "@/hooks/useWorksheetManager";
import { apiCreateSemester, apiDeleteSemester } from "@/api/semesters";
import {apiAddCourse, apiRemoveCourse } from "@/api/courses";
import { apiUpdateSemester } from "@/api/semesters";

import type { Course, StudentCourse, StudentSemester } from "@/types/type-user";
import type { MajorProgress } from "../types/type-program";

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
    (program: MajorProgress | null) => {
      if (!activeWorksheetId) return { ok: false as const, error: "No active worksheet." };
      if (!program) return { ok: false as const, error: "Program is null." };

      setUserData((prev) => {
        if (!prev) return prev;

        const dp2 = prev.FYP.degreeProgress2 ?? [];

        const newDegreeProgress2 = dp2.map((entry) => {
          if (entry.worksheetID !== activeWorksheetId) return entry;
          const exists = entry.majors.some((m) => m.id === program.id);
          if (exists) return entry;
          return { ...entry, majors: [...entry.majors, program] };
        });

        const hasEntry = dp2.some((e) => e.worksheetID === activeWorksheetId);
        const finalDegreeProgress2 = hasEntry
          ? newDegreeProgress2
          : [...dp2, { worksheetID: activeWorksheetId, majors: [program] } as any];

        const majorNum = prev.FYP.statCount?.majorNum ?? 0;
        const certificateNum = prev.FYP.statCount?.certificateNum ?? 0;

        return {
          ...prev,
          FYP: {
            ...prev.FYP,
            statCount: {
              ...prev.FYP.statCount,
              majorNum: isMajorType(program.info.degreeType) ? majorNum + 1 : majorNum,
              certificateNum: isCertificateType(program.info.degreeType)
                ? certificateNum + 1
                : certificateNum,
            },
            degreeProgress2: finalDegreeProgress2,
          },
        };
      });

      return { ok: true as const };
    },
    [activeWorksheetId, setUserData]
  );

  const removeProgram = useCallback(
    (program: MajorProgress) => {
      if (!activeWorksheetId) return { ok: false as const, error: "No active worksheet." };

      setUserData((prev) => {
        if (!prev) return prev;

        const dp2 = prev.FYP.degreeProgress2 ?? [];

        const newDegreeProgress2 = dp2.map((entry) => {
          if (entry.worksheetID !== activeWorksheetId) return entry;
          return { ...entry, majors: entry.majors.filter((m) => m.id !== program.id) };
        });

        const majorNum = prev.FYP.statCount?.majorNum ?? 0;
        const certificateNum = prev.FYP.statCount?.certificateNum ?? 0;

        return {
          ...prev,
          FYP: {
            ...prev.FYP,
            statCount: {
              ...prev.FYP.statCount,
              majorNum: isMajorType(program.info.degreeType)
                ? Math.max(0, majorNum - 1)
                : majorNum,
              certificateNum: isCertificateType(program.info.degreeType)
                ? Math.max(0, certificateNum - 1)
                : certificateNum,
            },
            degreeProgress2: newDegreeProgress2,
          },
        };
      });

      return { ok: true as const };
    },
    [activeWorksheetId, setUserData]
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