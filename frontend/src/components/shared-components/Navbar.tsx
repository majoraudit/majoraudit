import type { MajorProgress } from "@/types/type-program";

import { useUser } from "@/contexts/UserContext";
import { useApp } from "@/contexts/AppContext";

import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import { useAuth } from "@/contexts/AuthContext";

// import sunIcon from "../assets/sun.svg";

function Navbar() {
  const location = useLocation();
  const currentPath = location.pathname;

  const { isAuthenticated, login, logout } = useAuth();

  const linkFormat = (path: string) =>
    currentPath === path
      ? "text-blue-500"
      : "text-black hover:text-blue-500 transition-colors duration-300";

  return (
    <>
      <nav className="flex bg-white items-center justify-between p-5 h-20">
        <div className="font-serif text-3xl text-black font-thin">
          Major<span className="text-blue-500">Audit</span>
        </div>
        <div className="flex items-center justify-around gap-6 text-lg text-black">
          {/* <img
            src={sunIcon}
            alt="sun icon"
            className="w-9 h-9 cursor-pointer transition duration-300"
          ></img> */}
          <Link to="/dashboard" className={linkFormat("/dashboard")}>
            Dashboard
          </Link>
          <Link to="/programs" className={linkFormat("/programs")}>
            Programs
          </Link>
          <Link
            to="/course-planning"
            className={linkFormat("/course-planning")}
          >
            Course Planning
          </Link>
          {/*
          <Link to="/profile">
            <div className="flex bg-blue-500 p-3 rounded-full text-white w-10 h-10 items-center justify-center">
              AC
            </div>
          </Link>
*/}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex bg-blue-500 p-3 rounded-full text-white w-10 h-10 items-center justify-center cursor-pointer">
              AC
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-48" align="end" sideOffset={10}>
              <Link to="/about">
                <DropdownMenuItem className="text-md cursor-pointer">
                  About Us
                </DropdownMenuItem>
              </Link>
              <DropdownMenuItem className="text-md cursor-pointer">
                Feedback
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              {isAuthenticated ? (
                <DropdownMenuItem
                  className="text-red-600 text-md cursor-pointer"
                  onClick={logout}
                >
                  Sign Out
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  className="text-green-600 text-md cursor-pointer"
                  onClick={login}
                >
                  Sign In
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
      <hr className="border-gray-200 border-t-3" />
    </>
  );
}
export default Navbar;
