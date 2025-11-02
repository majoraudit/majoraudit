import { type AppData } from "../types/type-program";
import React, { useState, createContext, useContext, useEffect } from "react";
import { loadCourses, CourseDatabase } from "../services/CourseDatabase";

import { loadMajorTemplates, MajorProcessor } from "../services/MajorProcessor";

type AppContextType = {
  appData: AppData | undefined;
  setAppData: React.Dispatch<React.SetStateAction<AppData | undefined>>;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [appData, setAppData] = useState<AppData | undefined>(undefined);

  // init user data or retrieve from localStorage
  useEffect(() => {
    const API = "/api";
    //const ctrl = new AbortController();

    async function initializeApp() {
      try {
        let courses;
        let major_templates;

        console.log("INIT APP");
        console.log(API);
        if (API) {
          console.log("FETCHING");
          // --- Load from backend API
          const [coursesRes, templatesRes] = await Promise.all([
            fetch(`${API}/courses?limit=10000`, {
              //signal: ctrl.signal,
              credentials: "include",
            }),
            fetch(`${API}/programs/templates`, {
              //signal: ctrl.signal,
              credentials: "include",
            }),
          ]);
          if (!coursesRes.ok) throw new Error("Failed to load courses");
          if (!templatesRes.ok) {
            major_templates = await loadMajorTemplates(
              "/mock_major_templates.json"
            );
            console.log("using local templates");
          }
          //throw new Error("Failed to load major templates");

          const coursesJson = await coursesRes.json();
          courses = coursesJson.items ?? coursesJson; // supports {items,total} or raw array
          console.log(courses.results);
          courses = courses.results ?? courses; // supports {results,total} or raw array
          //major_templates = await templatesRes.json();
        } else {
          // --- Fallback to local JSON files (current behavior)
          courses = await loadCourses("/mock_courses_2025_26.json");
          major_templates = await loadMajorTemplates(
            "/mock_major_templates.json"
          );
        }
        const course_database = new CourseDatabase(courses);
        courses = course_database.getAllCourses();
        courses = courses.filter((c) => c.credit != 0);
        console.log(courses[0]);

        // If your MajorProcessor expects CourseDatabase, keep this:
        const major_processor = new MajorProcessor(course_database);
        // If instead it expects templates, use:
        // const major_processor = new MajorProcessor(major_templates);

        setAppData({
          courses,
          major_templates,
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

  // if (!appData) {
  //   // Show loading page while initializing
  //   return (
  //     <div className="flex items-center justify-center h-screen w-screen bg-white">
  //       <div className="text-2xl font-semibold text-gray-600">
  //         Loading Major Audit...
  //       </div>
  //       <svg
  //         width="64"
  //         height="64"
  //         viewBox="0 0 64 64"
  //         className="animate-spin"
  //         xmlns="http://www.w3.org/2000/svg"
  //       >
  //         <g>
  //           <circle cx="32" cy="32" r="12" fill="#3b82f6" opacity="0.7" />
  //           <path
  //             d="M32 8v8M32 48v8M8 32h8M48 32h8M16.97 16.97l5.66 5.66M41.37 41.37l5.66 5.66M16.97 47.03l5.66-5.66M41.37 22.63l5.66-5.66"
  //             stroke="#2563eb"
  //             strokeWidth="3"
  //             strokeLinecap="round"
  //           />
  //         </g>
  //       </svg>
  //     </div>
  //   );
  // }

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
