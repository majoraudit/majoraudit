import { type AppData } from "../types/type-program";
import React, { useState, createContext, useContext, useEffect } from "react";
import { loadCourses, CourseDatabase } from "../services/CourseDatabase";

import { loadMajorTemplates, MajorProcessor } from "../services/MajorProcessor";
import { useAuth } from "../contexts/AuthContext";

import Loading from "@/pages/Loading/Loading";

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

export async function fetchTemplates() {
  const res = await fetch("/api/programs/templates", {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Templates unavailable - getting json");
  return res.json();
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [appData, setAppData] = useState<AppData | undefined>(undefined);
  const { isAuthenticated } = useAuth();

  // init user data or retrieve from localStorage
  useEffect(() => {
    //const ctrl = new AbortController();

    async function initializeApp() {
      try {
        const [course_results, template_results] = await Promise.allSettled([
          fetchCourses(),
          fetchTemplates(),
        ]);

        if (course_results.status === "rejected") {
          console.warn(
            "Course API failed, falling back to local JSON:",
            course_results.reason,
          );
        }
        if (template_results.status === "rejected") {
          console.warn(
            "Templates API failed, falling back to local JSON:",
            template_results.reason,
          );
        }

        const [courses_raw, templates] = await Promise.all([
          course_results.status === "fulfilled"
            ? course_results.value
            : loadCourses("/mock_courses_2025_26.json"),
          template_results.status === "fulfilled"
            ? template_results.value
            : loadMajorTemplates("/mock_major_templates.json"),
        ]);

        const course_database = new CourseDatabase(courses_raw);
        const courses = course_database
          .getAllCourses()
          .filter((c) => c.credit != 0);

        const major_processor = new MajorProcessor(course_database);

        setAppData({
          courses,
          major_templates: templates,
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
