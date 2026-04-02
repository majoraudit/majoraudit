import { type User } from "../types/type-user";
import React, { useState, createContext, useContext, useEffect } from "react";
import { fetchProfile } from "@/api/authApi";
import { getWorksheets } from "@/api/coursePlanning";
import { type Worksheet } from "@/types/type-user";

type UserContextType = {
  userData: User | undefined;
  setUserData: React.Dispatch<React.SetStateAction<User | undefined>>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [userData, setUserData] = useState<User | undefined>(undefined);

  useEffect(() => {
    const init = async () => {
      const profile = await fetchProfile();
      if (!profile) return;

      const netID = profile.email.split("@")[0];

      const stored = localStorage.getItem(`fyp_extras_${netID}`);
      const fyp_extras = stored ? JSON.parse(stored) : null;

      // Load worksheets once here so no child hook re-fetches and overwrites state
      let worksheets: Worksheet[] = [];
      let activeWorksheetID = "";
      try {
        const data = await getWorksheets();
        const API_SEASON_TO_NUM: Record<string, number> = { SP: 1, SU: 2, FA: 3 };
        const API_SEASON_TO_LABEL: Record<string, string> = { SP: "Spring", SU: "Summer", FA: "Fall" };
        worksheets = data.map((apiWs: any): Worksheet => ({
          id: String(apiWs.id),
          name: apiWs.name,
          studentSemesters: (apiWs.semesters ?? []).map((s: any) => ({
            id: String(s.id),
            season: s.year * 100 + (API_SEASON_TO_NUM[s.season] ?? 0),
            title: `${s.year} ${API_SEASON_TO_LABEL[s.season] ?? s.season}`,
            studentCourses: (s.classes ?? []).map((c: any) => ({
              course: c.course,
              term: s.year,
              status: "DA_PROSPECT",
            })),
            isCompleted: false,
          })),
        }));
        activeWorksheetID = worksheets[0]?.id ?? "";
      } catch (err) {
        console.error("Failed to load worksheets", err);
      }

      setUserData({
        first_name: profile.first_name,
        last_name: profile.last_name,
        netID,
        onboard: true,
        FYP: {
          languageRequirement: fyp_extras?.languageRequirement ?? "",
          degreeProgress: fyp_extras?.degreeProgress ?? [],
          degreeProgress2: fyp_extras?.degreeProgress2 ?? [],
          statCount: fyp_extras?.statCount ?? { majorNum: 0, certificateNum: 0 },
          worksheets,
          activeWorksheetID,
        },
      });
    };

    init();
  }, []);

  // Persist FYP extras (majors, statCount) to localStorage whenever they change.
  // Keyed by netID so different users don't share data.
  useEffect(() => {
    if (!userData?.netID) return;
    const extras = {
      languageRequirement: userData.FYP.languageRequirement,
      degreeProgress: userData.FYP.degreeProgress,
      degreeProgress2: userData.FYP.degreeProgress2,
      statCount: userData.FYP.statCount,
    };
    localStorage.setItem(`fyp_extras_${userData.netID}`, JSON.stringify(extras));
  }, [
    userData?.netID,
    userData?.FYP.degreeProgress2,
    userData?.FYP.statCount,
    userData?.FYP.languageRequirement,
    userData?.FYP.degreeProgress,
  ]);

  return (
    <UserContext.Provider value={{ userData, setUserData }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within a UserProvider");
  return context;
};
