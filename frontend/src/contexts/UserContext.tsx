import { type User } from "../types/type-user";
import React, { useState, createContext, useContext, useEffect } from "react";
import { initialUserData } from "../data/mock_initial_user_data";
import { fetchProfile } from "@/api/authApi";

type UserContextType = {
  userData: User | undefined;
  setUserData: React.Dispatch<React.SetStateAction<User | undefined>>;
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

      const stored = localStorage.getItem("mockUserData");
      const alreadyOnboarded = stored
        ? (JSON.parse(stored) as { onboard?: boolean })?.onboard === true
        : false;

      setUserData(initialUserData);

      const profile = await fetchProfile();
      if (!profile) return;

      setUserData((prev) => ({
        ...(prev ?? initialUserData),
        first_name: profile.first_name,
        last_name: profile.last_name,
        netID: profile.email.split("@")[0],
        onboard: alreadyOnboarded,
      }));
    };

    init();
  }, []);

  // save data to local storage on change
  useEffect(() => {
    if (userData) {
      localStorage.setItem("mockUserData", JSON.stringify(userData));
    }
  }, [userData]);

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
