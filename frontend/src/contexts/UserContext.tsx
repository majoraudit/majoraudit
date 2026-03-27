import { type User } from "../types/type-user";
import React, { useState, createContext, useContext, useEffect } from "react";
import { initialUserData } from "../data/mock_initial_user_data";
import { fetchProfile } from "@/api/auth";
import { getWorksheets } from "@/api/worksheets";
import { type Worksheet } from "../types/type-user";

type UserContextType = {
  userData: User | undefined;
  setUserData: React.Dispatch<React.SetStateAction<User | undefined>>;
  onboarded: boolean;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [userData, setUserData] = useState<User | undefined>(undefined);

  // init user data or retrieve from localStorage
  /*useEffect(() => {
    const stored = localStorage.getItem("mockUserData");
    console.log(stored);
    //if (stored) setUserData(JSON.parse(stored));
    //else setUserData(initialUserData);
    //if (stored) {
    setUserData(initialUserData); //to reset mock user data
    //}
    //console.log(`[UserData] Using ${initialUserData}`);
  }, []);*/

  useEffect(() => {
    const init = async () => {
      //const stored = localStorage.getItem("mockUserData");
      //const alreadyOnboarded = false;
      /*stored
        ? (JSON.parse(stored) as { onboard?: boolean })?.onboard === true
        : false;*/

      //setUserData(initialUserData);

      const profile = await fetchProfile();
      if (!profile) return;

      const backendWorksheets = await getWorksheets();

      // Map backend shape { id, name } into the frontend Worksheet shape
      const worksheets: Worksheet[] = backendWorksheets.map((w) => ({
        id: String(w.id),
        name: w.name,
        studentSemesters: [],
      }));

      setUserData((prev) => ({
        ...(prev ?? initialUserData),
        first_name: profile.first_name,
        last_name: profile.last_name,
        netID: profile.email.split("@")[0],
        FYP: {
          ...(prev ?? initialUserData).FYP,
          worksheets,
        },
      }));
    };

    init();
  }, []);

  // save data to local storage on change
  /*useEffect(() => {
    if (userData) {
      localStorage.setItem("mockUserData", JSON.stringify(userData));
    }
  }, [userData]);*/

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
