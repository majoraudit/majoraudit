import { type StudentSemester } from "@/types/type-user";
import { addSemester } from "@/utils/userDataHelpers";

import CourseOutput from "./components/CourseOutput";
import SemesterOutput from "./components/SemesterOutput";

import { useUser } from "@/contexts/UserContext";
import { useApp } from "@/contexts/AppContext";

import pencilIcon from "./assets/pencil.svg";
import addSemesterIcon from "./assets/addSemester.svg";

import React, { useMemo, useState } from "react";

import { general_requirements_progress } from "@/data/mock_major_progress";
import SidebarLayout from "@/shared-components/SidebarLayout";

function CoursePlanning() {
  const { userData, setUserData } = useUser();
  const { appData } = useApp();

  const [formData, setFormData] = useState({ term: -1, year: -1, title: "" });
  const [searchTerm, setSearchTerm] = useState("");

  const worksheets = userData?.FYP?.worksheets ?? [];
  const activeWorksheetId = userData?.FYP?.activeWorksheetID;

  const activeSemesters: StudentSemester[] = useMemo(() => {
    if (!userData) return [];
    const ws = worksheets.find((w) => w.id === activeWorksheetId);
    return ws?.studentSemesters ?? [];
  }, [userData, activeWorksheetId, worksheets]);

  if (!appData) return <div>Loading courses and majors...</div>;

  // ---------- Worksheet helpers ----------
  const setActiveWorksheet = (id: string | null) => {
    if (!userData) return;
    setUserData({
      ...userData,
      FYP: {
        ...userData.FYP,
        activeWorksheetID: id ?? "main_ws",
      },
    });
  };

  const createWorksheet = () => {
    if (!userData) return;
    const defaultName = `Worksheet ${worksheets.length}`;
    const name = window.prompt("Name your new worksheet:", defaultName);
    if (!name) return;

    const pastDegreeProgress = userData.FYP.degreeProgress2 ?? [];

    const mainWsMajors =
      pastDegreeProgress.find((dp) => dp.worksheetID === "ws_main")?.majors ??
      [];

    const newWs = {
      id: `ws_${Date.now()}`,
      name: name.trim(),
      studentSemesters: [],
    };

    setUserData({
      ...userData,
      FYP: {
        ...userData.FYP,
        worksheets: [...worksheets, newWs],
        activeWorksheetID: newWs.id,
        degreeProgress2: [
          ...pastDegreeProgress,
          { worksheetID: newWs.id, majors: [...mainWsMajors] },
        ],
      },
    });
  };

  const renameWorksheet = () => {
    if (!userData || !activeWorksheetId) return;
    const current = worksheets.find((w) => w.id === activeWorksheetId);
    if (!current) return;
    const name = window.prompt("Rename worksheet:", current.name);
    if (!name || !name.trim()) return;

    setUserData({
      ...userData,
      FYP: {
        ...userData.FYP,
        worksheets: worksheets.map((w) =>
          w.id === activeWorksheetId ? { ...w, name: name.trim() } : w
        ),
      },
    });
  };

  const deleteWorksheet = () => {
    if (!userData || !activeWorksheetId) return;
    const current = worksheets.find((w) => w.id === activeWorksheetId);
    if (!current) return;
    const ok = window.confirm(
      `Delete worksheet "${current.name}"? This cannot be undone.`
    );
    if (!ok) return;

    const nextList = worksheets.filter((w) => w.id !== activeWorksheetId);
    const newDegreeProgress = (userData.FYP.degreeProgress2 ?? []).filter(
      (dp) => dp.worksheetID !== activeWorksheetId
    );
    setUserData({
      ...userData,
      FYP: {
        ...userData.FYP,
        worksheets: nextList,
        activeWorksheetID: "ws_main",
        degreeProgress2: newDegreeProgress,
      },
    });
  };

  // ---------- Search ----------
  const searchNormalized = searchTerm.toLowerCase().replace(/\s+/g, "");
  const filteredCourses = appData.courses.filter(
    (course) =>
      course.title
        .toLowerCase()
        .replace(/\s+/g, "")
        .includes(searchNormalized) ||
      course.codes[0]
        .toLowerCase()
        .replace(/\s+/g, "")
        .includes(searchNormalized)
  );

  const slicedCourses = filteredCourses.slice(0, 250);

  // ---------- Form handling ----------
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleInputSubmit = () => {
    if (
      !(
        formData.term != -1 &&
        formData.year != -1 &&
        formData.title &&
        userData
      )
    ) {
      alert("Please fill out all fields before creating a new semester!");
      return;
    }

    let year = Number(formData.year);
    if (Number(formData.term) == 2 || Number(formData.term) == 1) year += 1;

    const newSemester: StudentSemester = {
      title: formData.title,
      season: Number(`${year}${formData.term}`),
      studentCourses: [],
      isCompleted: false,
    };

    setUserData(addSemester(userData, newSemester));
  };

  return (
    <SidebarLayout
      sidebar={
        <div className="flex flex-col h-full">
          <input
            type="text"
            placeholder="Search by course code, title, prof..."
            className="px-4 py-2 border-b-4 border-gray-200 bg-blue-100 placeholder-shown:bg-white w-full focus:outline-none focus:bg-gray-100 transition-colors duration-200 ease-in-out border-t-2"
            onChange={(search) => setSearchTerm(search.target.value)}
          />
          <div className="flex-1 overflow-y-auto pb-2">
            <ul className="flex flex-col p-2 w-full gap-4">
              {slicedCourses.map((course, index) => (
                <li key={index}>
                  <CourseOutput course={course} draggable={true} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      }
    >
      {/* Right: planner */}
      <div>
        <header className="m-6 mt-4 flex flex-col">
          <div className="flex flex-row gap-2 items-center">
            <h1 className="text-3xl font-bold text-gray-800">Course Planner</h1>
            <img src={pencilIcon} alt="pencil icon" className="h-10 w-10" />
          </div>
          <p className="text-gray-500 font-medium mt-2">
            Welcome to your Course Planning page! Create new semesters, drag
            Yale courses from the sidebar, and create custom courses by clicking
            on the +!
          </p>
        </header>

        <hr className="border-gray-200 border-t-3" />

        {/* Toolbar */}
        <div className="flex flex-row p-4 pl-6 gap-4 items-center bg-gray-100">
          <button
            onClick={handleInputSubmit}
            onKeyDown={(e) => e.key === "Enter" && handleInputSubmit()}
          >
            <img
              src={addSemesterIcon}
              alt="addSemester icon"
              className="h-6 w-6 active:scale-125 transition duration-300 ease-in-out"
            />
          </button>
          <h2 className="text-xl font-medium">Add Semester </h2>

          <select
            className="px-4 py-2 border rounded-md text-center bg-white h-10"
            name="term"
            onChange={handleInputChange}
            onKeyDown={(e) => e.key === "Enter" && handleInputSubmit()}
          >
            <option value="">Select a term</option>
            <option value="03">Fall</option>
            <option value="01">Spring</option>
            <option value="02">Summer</option>
          </select>

          <select
            className="px-4 py-2 border rounded-md text-center bg-white h-10"
            name="year"
            onChange={handleInputChange}
            onKeyDown={(e) => e.key === "Enter" && handleInputSubmit()}
          >
            <option value="">Select a year</option>
            <option value="2020">2020-2021</option>
            <option value="2021">2021-2022</option>
            <option value="2022">2022-2023</option>
            <option value="2023">2023-2024</option>
            <option value="2024">2024-2025</option>
            <option value="2025">2025-2026</option>
            <option value="2026">2026-2027</option>
            <option value="2027">2027-2028</option>
            <option value="2028">2028-2029</option>
            <option value="2029">2029-2030</option>
          </select>

          <input
            type="text"
            placeholder="Enter a label (e.g. Junior Spring)"
            className="border p-2 rounded w-64 h-10 bg-white"
            name="title"
            onChange={handleInputChange}
            onKeyDown={(e) => e.key === "Enter" && handleInputSubmit()}
          />

          <div className="ml-auto flex items-center gap-2">
            <label className="p-4 text-xl font-medium">Manage Worksheets</label>
            <select
              className="px-2 py-2 border rounded-md text-center bg-white"
              value={activeWorksheetId ?? ""}
              onChange={(e) => setActiveWorksheet(e.target.value)}
            >
              {worksheets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>

            <button
              className="px-4 py-2 border rounded-md text-center bg-white h-10 hover:bg-gray-100"
              onClick={createWorksheet}
              title="Create worksheet from current view"
            >
              New
            </button>
            <button
              className="px-4 py-2 border rounded-md text-center bg-white h-10 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={renameWorksheet}
              disabled={!activeWorksheetId}
              title={
                !activeWorksheetId
                  ? "Cannot rename Main Worksheet"
                  : "Rename this worksheet"
              }
            >
              Rename
            </button>
            <button
              className="px-4 py-2 border rounded-md text-center bg-white hover:bg-red-50 text-red-600 border-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={deleteWorksheet}
              disabled={!activeWorksheetId}
              title={
                !activeWorksheetId
                  ? "Cannot delete Main Worksheet"
                  : "Delete this worksheet"
              }
            >
              Delete
            </button>
          </div>
        </div>

        <hr className="border-gray-200 border-t-3" />

        {activeSemesters.map((semester, index) => (
          <SemesterOutput key={index} semester={semester} />
        ))}
      </div>
    </SidebarLayout>
  );
}

export default CoursePlanning;
