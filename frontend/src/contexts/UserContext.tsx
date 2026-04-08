import {
  type User,
  type Worksheet as FrontendWorksheet,
  type StudentSemester,
} from "../types/type-user";
import React, { useState, createContext, useContext, useEffect } from "react";
import { fetchProfile } from "@/api/auth";
import { apiGetWorksheets } from "@/api/worksheets";
import { apiListWorksheetMajors } from "@/api/worksheetMajors";

type UserContextType = {
  userData: User | undefined;
  setUserData: React.Dispatch<React.SetStateAction<User | undefined>>;
  onboarded: boolean;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

const ACTIVE_WORKSHEET_KEY = "majoraudit:activeWorksheetID";

// Season string from backend (e.g. "FA", "SP") → season code (e.g. 202303, 202401)
function toSeasonCode(year: number, season: string): number {
  return year * 100 + (season === "SP" ? 1 : 3);
}

function toSeasonTitle(year: number, season: string): string {
  const label =
    season === "SP" ? "Spring" : season === "FA" ? "Fall" : "Summer";
  return `${label} ${year}`;
}

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [userData, setUserData] = useState<User | undefined>(undefined);

  useEffect(() => {
    const init = async () => {
      const profile = await fetchProfile();
      if (!profile) return;

      const backendWorksheets = await apiGetWorksheets();

      // Fetch each worksheet's majors in parallel
      const majorsPerWorksheet = await Promise.all(
        backendWorksheets.map((w) =>
          apiListWorksheetMajors(w.id).catch(() => []),
        ),
      );

      const worksheets: FrontendWorksheet[] = backendWorksheets.map((w, i) => ({
        id: String(w.id),
        name: w.name,
        majors: majorsPerWorksheet[i],
        studentSemesters: (w.semesters ?? [])
          .map((s): StudentSemester & { _rawClasses?: any[] } => ({
            id: s.id,
            season: toSeasonCode(s.year, s.season),
            title: s.title || toSeasonTitle(s.year, s.season),
            studentCourses: [],
            isCompleted: s.is_completed,
            _rawClasses: s.classes,
          }))
          .sort((a, b) => a.season - b.season),
      }));

      // Active worksheet is per-device UI state — read from localStorage,
      // fall back to "Main Worksheet" or the first one.
      const stored = localStorage.getItem(ACTIVE_WORKSHEET_KEY) ?? "";
      const main = worksheets.find((w) => w.name === "Main Worksheet");
      const activeWorksheetID =
        worksheets.find((w) => w.id === stored)?.id ??
        main?.id ??
        worksheets[0]?.id ??
        "";

      setUserData({
        first_name: profile.first_name,
        last_name: profile.last_name,
        netID: profile.email.split("@")[0],
        classYear: profile.class_year != null ? String(profile.class_year) : undefined,
        intendedLanguageCode: profile.intended_language_code || undefined,
        FYP: {
          languageRequirement: profile.language_requirement || "L1",
          degreeProgress: [],
          degreeProgress2: [],
          statCount: { majorNum: 0, certificateNum: 0 },
          worksheets,
          activeWorksheetID,
        },
      });
    };

    init();
  }, []);

  // Persist only the active-worksheet UI selection (per-device).
  useEffect(() => {
    const id = userData?.FYP?.activeWorksheetID;
    if (id) localStorage.setItem(ACTIVE_WORKSHEET_KEY, id);
  }, [userData?.FYP?.activeWorksheetID]);

  // User is onboarded if they have at least one worksheet
  const onboarded = (userData?.FYP?.worksheets?.length ?? 0) > 0;

  return (
    <UserContext.Provider value={{ userData, setUserData, onboarded }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within a UserProvider");
  return context;
};
