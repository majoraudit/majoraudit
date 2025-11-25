import React, { createContext, useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../constants.ts";
import { apiClient } from "../utils/apiClient.ts";

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  login: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // fix this --> api return for /auth/profile should be standard for if someone is logged in
  const checkAuthStatus = async () => {
    try {
      /*const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setIsAuthenticated(true);
      }*/

      const response = await apiClient.get(`/auth/profile/`);

      if (response.ok) {
        const userData = await response.json();
        setIsAuthenticated(true);
        localStorage.setItem("user", JSON.stringify(userData));
        navigate("/dashboard");
      } else {
        setIsAuthenticated(false);
        localStorage.removeItem("user");
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setIsAuthenticated(false);
      localStorage.removeItem("user");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();

    const handleAuthFailure = () => {
      localStorage.removeItem("user");
    };

    window.addEventListener("auth-refresh-failed", handleAuthFailure);
    return () =>
      window.removeEventListener("auth-refresh-failed", handleAuthFailure);
  }, []);

  const login = (): void => {
    window.location.href = `${apiUrl}/auth/login/`;
  };

  const logout = async (): Promise<void> => {
    try {
      await fetch(`${apiUrl}/auth/logout/`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.warn("Logout request failed:", error);
    } finally {
      localStorage.removeItem("user");
      setIsAuthenticated(false);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
