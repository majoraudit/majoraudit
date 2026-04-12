import { useCallback } from "react";
import { useUser } from "@/contexts/UserContext";
import { useWorksheetManager } from "@/hooks/useWorksheetManager";

import type { Course, StudentCourse, StudentSemester, Worksheet } from "@/types/type-user";
import type { MajorProgress } from "../types/type-program";

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

  function isMajorType(t?: string) {
  return t === "major" || t === "Major";
}
function isCertificateType(t?: string) {
  return t === "certificate" || t === "Certificate";
}

  function getStudentCourseKey(studentCourse: StudentCourse) {
    const primaryCode =
      studentCourse.course.codes?.[0] || studentCourse.course.title || "unknown";
    return `${primaryCode}@${studentCourse.term ?? "?"}`;
  }

  const updateActiveWorksheet = useCallback(
    (updater: (ws: Worksheet) => Worksheet) => {
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

const addProgram = useCallback(
    (program: MajorProgress | null) => {
      if (!activeWorksheetId) return { ok: false as const, error: "No active worksheet." };
        
      if(!program) return { ok: false as const, error: "Program is null." };
      setUserData((prev) => {
        if (!prev) return prev;

        const dp2 = prev.FYP.degreeProgress2 ?? [];

        const newDegreeProgress2 = dp2.map((entry) => {
          if (entry.worksheetID !== activeWorksheetId) return entry;

          const exists = entry.majors.some((m) => m.id === program.id);
          if (exists) return entry;

          return { ...entry, majors: [...entry.majors, program] };
        });

        // if there was no entry for this worksheet, you may want to create one
        // (optional; depends on your data invariants)
        const hasEntry = dp2.some((e) => e.worksheetID === activeWorksheetId);
        const newWorksheetEntry: (typeof dp2)[number] = {
          worksheetID: activeWorksheetId,
          majors: [program],
        };
        const finalDegreeProgress2 = hasEntry
          ? newDegreeProgress2
          : [
              ...dp2,
              newWorksheetEntry,
            ];

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

          return {
            ...entry,
            majors: entry.majors.filter((m) => m.id !== program.id),
          };
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

  const assignExistingCourseToRequirement = useCallback(
    (groupIdx: number, itemIdx: number, courseKey: string) => {
      if (!canMutate) return { ok: false as const, error: "No active worksheet." };

      let foundCourse = false;

      updateActiveWorksheet((ws) => {
        const updatedSemesters = ws.studentSemesters.map((semester: StudentSemester) => {
          const updatedCourses = semester.studentCourses
            .filter(
              (studentCourse: StudentCourse) =>
                !(
                  studentCourse.manualFulfillInfo?.manualFulfill &&
                  studentCourse.manualFulfillInfo.groupIdx === groupIdx &&
                  studentCourse.manualFulfillInfo.itemIdx === itemIdx
                ),
            )
            .map((studentCourse: StudentCourse) => {
              const studentCourseKey = getStudentCourseKey(studentCourse);
              const pinnedToTargetItem =
                studentCourse.requirementOverrideInfo?.groupIdx === groupIdx &&
                studentCourse.requirementOverrideInfo?.itemIdx === itemIdx;
              const isSelectedCourse = studentCourseKey === courseKey;

              const updatedCourse: StudentCourse = { ...studentCourse };

              if (pinnedToTargetItem || isSelectedCourse) {
                delete updatedCourse.requirementOverrideInfo;
              }

              if (isSelectedCourse) {
                updatedCourse.requirementOverrideInfo = { groupIdx, itemIdx };
                foundCourse = true;
              }

              return updatedCourse;
            });

          return {
            ...semester,
            studentCourses: updatedCourses,
          };
        });

        return {
          ...ws,
          studentSemesters: updatedSemesters,
        };
      });

      if (!foundCourse) {
        return { ok: false as const, error: "Selected course was not found." };
      }

      return { ok: true as const };
    },
    [canMutate, updateActiveWorksheet],
  );

  const assignManualRequirementFulfillment = useCallback(
    (
      groupIdx: number,
      itemIdx: number,
      data: {
        label: string;
        categories: string[];
        credits?: number;
      },
    ) => {
      if (!canMutate) return { ok: false as const, error: "No active worksheet." };

      const trimmedLabel = data.label.trim();
      if (!trimmedLabel) {
        return { ok: false as const, error: "Course label is required." };
      }

      const sortedSemesters = [...worksheet.studentSemesters].sort(
        (a: StudentSemester, b: StudentSemester) => a.season - b.season,
      );
      const completedSemesters = sortedSemesters.filter(
        (semester: StudentSemester) => semester.isCompleted,
      );
      const targetSemester =
        completedSemesters[completedSemesters.length - 1] ?? sortedSemesters[0];

      if (!targetSemester) {
        return { ok: false as const, error: "No semester is available for this requirement." };
      }

      updateActiveWorksheet((ws) => {
        const updatedSemesters = ws.studentSemesters.map((semester: StudentSemester) => {
          const updatedCourses = semester.studentCourses
            .filter(
              (studentCourse: StudentCourse) =>
                !(
                  studentCourse.manualFulfillInfo?.manualFulfill &&
                  studentCourse.manualFulfillInfo.groupIdx === groupIdx &&
                  studentCourse.manualFulfillInfo.itemIdx === itemIdx
                ),
            )
            .map((studentCourse: StudentCourse) => {
              if (
                studentCourse.requirementOverrideInfo?.groupIdx === groupIdx &&
                studentCourse.requirementOverrideInfo?.itemIdx === itemIdx
              ) {
                const updatedCourse: StudentCourse = { ...studentCourse };
                delete updatedCourse.requirementOverrideInfo;
                return updatedCourse;
              }

              return studentCourse;
            });

          if (semester.season !== targetSemester.season) {
            return {
              ...semester,
              studentCourses: updatedCourses,
            };
          }

          const manualCourse: StudentCourse = {
            course: {
              id: Date.now(),
              codes: [trimmedLabel],
              title: trimmedLabel,
              credit: data.credits ?? 1,
              dist: data.categories,
            },
            term: semester.season,
            status: "DA_COMPLETE",
            manualFulfillInfo: {
              manualFulfill: true,
              groupIdx,
              itemIdx,
            },
          };

          return {
            ...semester,
            studentCourses: [...updatedCourses, manualCourse],
          };
        });

        return {
          ...ws,
          studentSemesters: updatedSemesters,
        };
      });

      return { ok: true as const };
    },
    [canMutate, updateActiveWorksheet, worksheet],
  );

  return {
    addSemester,
    removeSemester,
    addCourse,
    removeCourse,
    setSemesterCompleted,
    addProgram,
    removeProgram,
    assignExistingCourseToRequirement,
    assignManualRequirementFulfillment,
  };
}
