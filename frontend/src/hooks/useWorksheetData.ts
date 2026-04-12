import { useMemo, useCallback } from "react";
import type { Course, StudentCourse, StudentSemester, Worksheet } from "@/types/type-user";
import { useWorksheetManager } from "@/hooks/useWorksheetManager";
import { useUser } from "@/contexts/UserContext";

/**
 * Try to get numeric credits from a course.
 * Adjust this to match your Course schema (e.g. course.credits, course.creditHours, etc.)
 */
function getCourseCredits(course: Course | undefined | null): number {
  if (!course) return 0;

  const n = Number(course.credit);
  return Number.isFinite(n) ? n : 0;
}

/** Useful for de-duping. Adjust if your canonical key differs. */
function getCourseKey(course: Course | undefined | null): string {
  if (!course) return "unknown";
  const code = course.codes?.[0] ?? "";
  // If you have external_id / id, that’s often better than title
  return code || `${course.title ?? "untitled"}`;
}

export function useWorksheetData() {
    const {userData} = useUser();
  const { activeWorksheet, activeSemesters } = useWorksheetManager();

  /**
   * Semesters: always sorted, always stable reference if nothing changed.
   */
  const semestersSorted = useMemo(() => {
    const arr = [...(activeSemesters ?? [])];
    arr.sort((a, b) => a.season - b.season);
    return arr;
  }, [activeSemesters]);

  /**
   * Map for O(1) semester lookup.
   */
  const semesterBySeason = useMemo(() => {
    const map = new Map<number, StudentSemester>();
    for (const s of semestersSorted) map.set(s.season, s);
    return map;
  }, [semestersSorted]);

  /**
   * Flatten all student courses in this worksheet.
   */
  const allStudentCourses = useMemo(() => {
    const out: Array<{ semester: StudentSemester; sc: StudentCourse }> = [];
    for (const sem of semestersSorted) {
      for (const sc of sem.studentCourses ?? []) {
        out.push({ semester: sem, sc });
      }
    }
    return out;
  }, [semestersSorted]);

  /**
   * Completed courses (by student-course status, not by semester lock).
   */
  const completedStudentCourses = useMemo(() => {
    return allStudentCourses.filter(({ semester }) => Boolean(semester.isCompleted));
  }, [allStudentCourses]);

  /**
   * Credits per semester + totals
   */
  const creditsBySeason = useMemo(() => {
    const map = new Map<number, number>();
    for (const sem of semestersSorted) {
      let total = 0;
      for (const sc of sem.studentCourses ?? []) {
        total += getCourseCredits(sc.course);
      }
      map.set(sem.season, total);
    }
    return map;
  }, [semestersSorted]);

  const totalCredits = useMemo(() => {
    let total = 0;
    for (const v of creditsBySeason.values()) total += v;
    return total;
  }, [creditsBySeason]);


  /**
   * Unique courses (de-duped) in the worksheet.
   * Useful for things like "completed courses list" where repeats shouldn’t double-count.
   */
  const uniqueCourses = useMemo(() => {
    const seen = new Set<string>();
    const out: Course[] = [];

    for (const { sc } of allStudentCourses) {
      const key = getCourseKey(sc.course);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(sc.course);
    }

    return out;
  }, [allStudentCourses]);

  const uniqueCompletedCourses = useMemo(() => {
    const seen = new Set<string>();
    const out: Course[] = [];

    for (const { sc } of completedStudentCourses) {
      const key = getCourseKey(sc.course);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(sc.course);
    }

    return out;
  }, [completedStudentCourses]);

  /**
   * Tiny helper accessors for UI components.
   */
  const getSemester = useCallback(
    (season: number) => semesterBySeason.get(season),
    [semesterBySeason]
  );

  const isSemesterCompleted = useCallback(
    (season: number) => Boolean(semesterBySeason.get(season)?.isCompleted),
    [semesterBySeason]
  );

  const getSemesterCredits = useCallback(
    (season: number) => creditsBySeason.get(season) ?? 0,
    [creditsBySeason]
  );

  const completedCredits = useMemo(() => {
    let total = 0;
    for(const sem of semestersSorted)
    {
        if(sem.isCompleted)
        {
            total += getSemesterCredits(sem.season);
        }
    }
    return total;
  }, [semestersSorted, getSemesterCredits]);

  const completedCourseCount = useMemo(() => {
  return completedStudentCourses.length;
}, [completedStudentCourses]);

const majorCount = useMemo(() => {
  return (activeWorksheet?.majors ?? []).filter(
    (m) => m.major_id !== "general_degree",
  ).length;
}, [activeWorksheet?.majors]);

const certificateCount = useMemo(() => {
  return 0; // TODO: implement when certificates are added
}, []);

  return {
    // raw worksheet
    activeWorksheet: activeWorksheet as Worksheet | undefined,

    // semesters
    semesters: semestersSorted,
    getSemester,
    isSemesterCompleted,

    // courses
    allStudentCourses, // [{ semester, sc }]
    completedStudentCourses, // same shape
    uniqueCourses,
    uniqueCompletedCourses,
    completedCourseCount,

    // credits
    creditsBySeason,
    totalCredits,
    completedCredits,
    getSemesterCredits,
    majorCount,
    certificateCount
  };
}
