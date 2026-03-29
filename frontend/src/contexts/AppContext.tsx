import { type AppData } from "../types/type-program";
import React, { useState, createContext, useContext, useEffect } from "react";
import { loadCourses, CourseDatabase } from "../services/CourseDatabase";

import { loadMajorTemplates, MajorProcessor } from "../services/MajorProcessor";
import { useAuth } from "../contexts/AuthContext";

import Loading from "@/pages/Loading/Loading";

import { useUser } from "./UserContext";
import { type StudentCourse } from "@/types/type-user";

import { apiFetchMajorTemplatesList } from "@/api/majors";

type AppContextType = {
  appData: AppData | undefined;
  setAppData: React.Dispatch<React.SetStateAction<AppData | undefined>>;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export async function fetchCourses() {
  const res = await fetch("/api/courses?limit=10000", {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Courses unavailable - getting json");
  const data = await res.json();
  return data.results ?? data;
}

/*export async function fetchTemplates() {
  const res = await fetch("/api/programs/templates", {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Templates unavailable - getting json");
  return res.json();
}*/

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [appData, setAppData] = useState<AppData | undefined>(undefined);
  const { isAuthenticated } = useAuth();
  const { userData, setUserData } = useUser();

  // init user data or retrieve from localStorage
  useEffect(() => {
    //const ctrl = new AbortController();

    async function initializeApp() {
      try {
        const [course_results, major_templates_result] =
          await Promise.allSettled([
            fetchCourses(),
            apiFetchMajorTemplatesList(),
          ]);

        const [courses_raw, major_templates] = await Promise.all([
          course_results.status === "fulfilled"
            ? course_results.value
            : loadCourses("/mock_courses_2025_26.json"),
          major_templates_result.status === "fulfilled"
            ? major_templates_result.value
            : [],
        ]);

        console.log(major_templates_result);
        console.log(major_templates);

        const course_database = new CourseDatabase(courses_raw);
        const courses = course_database
          .getAllCourses()
          .filter((c) => c.credit != 0);

        const major_processor = new MajorProcessor(course_database);

        setAppData({
          courses,
          major_templates: major_templates,
          course_database,
          major_processor,
        });
      } catch (e) {
        console.error(e);
      }
    }

    initializeApp();
    //return () => ctrl.abort();
  }, []);

  useEffect(() => {
    if (!appData || !userData) return;

    const needsHydration = userData.FYP.worksheets.some((w) =>
      w.studentSemesters.some(
        (s) =>
          (s as any)._rawClasses?.length > 0 && s.studentCourses.length === 0,
      ),
    );

    if (!needsHydration) return;

    setUserData((prev) => {
      if (!prev) return prev;

      const worksheets = prev.FYP.worksheets.map((w) => ({
        ...w,
        studentSemesters: w.studentSemesters.map((s) => ({
          ...s,
          studentCourses:
            s.studentCourses.length > 0
              ? s.studentCourses // already hydrated, skip
              : ((s as any)._rawClasses?.flatMap((c: any): StudentCourse[] => {
                  const externalId = String(c.course ?? c.course_instance);
                  const fullCourse = appData.course_database.getCourse(
                    Number(externalId),
                  );
                  if (!fullCourse) return [];
                  return [
                    {
                      worksheetClassId: c.id,
                      course: fullCourse,
                      term: s.season,
                      status: "DA_COMPLETE",
                    },
                  ];
                }) ?? []),
        })),
      }));

      return { ...prev, FYP: { ...prev.FYP, worksheets } };
    });
  }, [appData, userData]);

  if (isAuthenticated && !appData) {
    // Show loading page while initializing
    return <Loading />;
  }

  return (
    <AppContext.Provider value={{ appData, setAppData }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within a AppProvider");
  return context;
};
