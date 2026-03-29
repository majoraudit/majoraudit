import {
  type User,
  type Worksheet as FrontendWorksheet,
  type StudentSemester,
} from "../types/type-user";
import React, { useState, createContext, useContext, useEffect } from "react";
import { initialUserData } from "../data/mock_initial_user_data";
import { fetchProfile } from "@/api/auth";
import { apiGetWorksheets } from "@/api/worksheets";

type UserContextType = {
  userData: User | undefined;
  setUserData: React.Dispatch<React.SetStateAction<User | undefined>>;
  onboarded: boolean;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

// Season string from backend (e.g. "Fa", "Sp") → season code (e.g. 202303, 202401)
function toSeasonCode(year: number, season: string): number {
  return year * 100 + (season === "Sp" ? 1 : 3);
}

function toSeasonTitle(year: number, season: string): string {
  const label =
    season === "Sp" ? "Spring" : season === "Fa" ? "Fall" : "Summer";
  return `${label} ${year}`;
}

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [userData, setUserData] = useState<User | undefined>(undefined);

  useEffect(() => {
    const init = async () => {
      // Fetch real profile
      const profile = await fetchProfile();
      if (!profile) return;

      // Fetch full nested worksheets from backend
      const backendWorksheets = await apiGetWorksheets();

      // Map full nested backend shape into frontend Worksheet shape
      const worksheets: FrontendWorksheet[] = backendWorksheets.map((w) => ({
        id: String(w.id),
        name: w.name,
        studentSemesters: (w.semesters ?? []).map(
          (s): StudentSemester => ({
            id: s.id,
            season: toSeasonCode(s.year, s.season),
            title: toSeasonTitle(s.year, s.season),
            studentCourses: [], // courses not mapped yet — extend later if needed
            isCompleted: false,
          }),
        ),
      }));

      // Set Main Worksheet as the active one
      const mainWorksheet = worksheets.find((w) => w.name === "Main Worksheet");
      const activeWorksheetID = mainWorksheet?.id ?? worksheets[0]?.id ?? "";

      setUserData((prev) => ({
        ...(prev ?? initialUserData),
        first_name: profile.first_name,
        last_name: profile.last_name,
        netID: profile.email.split("@")[0],
        FYP: {
          ...(prev ?? initialUserData).FYP,
          worksheets,
          activeWorksheetID,
        },
      }));
    };

    init();
  }, []);

  // Save user data to localStorage on change
  useEffect(() => {
    if (userData) {
      localStorage.setItem("mockUserData", JSON.stringify(userData));
    }
  }, [userData]);

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
