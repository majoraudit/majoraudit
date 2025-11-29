import { type StudentSemester } from "@/types/type-user";
import { addSemester } from "@/utils/userDataHelpers";

import CourseOutput from "./components/CourseOutput";
import SemesterOutput from "./components/SemesterOutput";

import { useUser } from "@/contexts/UserContext";
import { useApp } from "@/contexts/AppContext";

import pencilIcon from "./assets/pencil.svg";
import addSemesterIcon from "./assets/addSemester.svg";

import React, { useMemo, useState } from "react";

import SidebarLayout from "@/components/shared-components/SidebarLayout";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

import { Pencil, Trash2 } from "lucide-react";

function CoursePlanning() {
  const { userData, setUserData } = useUser();
  const { appData } = useApp();

  // term/year now strings so they work nicely with labels + custom dropdowns
  const [formData, setFormData] = useState({
    term: "",
    year: "",
    title: "",
  });
  const [searchTerm, setSearchTerm] = useState("");

  // Inline worksheet actions state (for rename/delete/create UI inside dropdown)
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState("");

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [newWorksheetName, setNewWorksheetName] = useState("");
  const [newWorksheetError, setNewWorksheetError] = useState("");
  const [semesterError, setSemesterError] = useState("");

  const worksheets = userData?.FYP?.worksheets ?? [];
  const activeWorksheetId = userData?.FYP?.activeWorksheetID ?? null;

  const activeSemesters: StudentSemester[] = useMemo(() => {
    if (!userData) return [];
    const ws = worksheets.find((w) => w.id === activeWorksheetId);
    return ws?.studentSemesters ?? [];
  }, [userData, activeWorksheetId, worksheets]);

  const activeWorksheet = worksheets.find((w) => w.id === activeWorksheetId);

  if (!appData) return <div>Loading courses and majors...</div>;

  const isMainId = (id: string | null | undefined) => {
    const ws = worksheets.find((w) => w.id === id);
    if (!ws) return false;
    return ws.name === "Main Worksheet" || ws.id === "ws_main";
  };

  // ---------- Worksheet helpers ----------
  const resetWorksheetInlineState = () => {
    setIsRenaming(false);
    setIsDeleting(false);
    setIsCreating(false);
    setRenameTargetId(null);
    setDeleteTargetId(null);
    setRenameValue("");
    setRenameError("");
    setNewWorksheetName("");
    setNewWorksheetError("");
  };

  const setActiveWorksheet = (id: string | null) => {
    if (!userData) return;
    setUserData({
      ...userData,
      FYP: {
        ...userData.FYP,
        activeWorksheetID: id ?? "ws_main",
      },
    });

    // Reset inline actions when switching
    resetWorksheetInlineState();
  };

  const createWorksheet = (name?: string) => {
    if (!userData) return;

    const defaultName = `Worksheet ${worksheets.length}`;
    const finalName = (name ?? defaultName).trim() || defaultName;

    const pastDegreeProgress = userData.FYP.degreeProgress2 ?? [];

    const mainWsMajors =
      pastDegreeProgress.find((dp) => dp.worksheetID === "ws_main")?.majors ??
      [];

    const newWs = {
      id: `ws_${Date.now()}`,
      name: finalName,
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

  const renameWorksheet = (id: string, newName: string) => {
    if (!userData) return;
    const trimmed = newName.trim();
    if (!trimmed) {
      setRenameError("Name cannot be empty.");
      return;
    }

    const duplicate = worksheets.some(
      (w) =>
        w.id !== id && w.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setRenameError("A worksheet with this name already exists.");
      return;
    }

    setUserData({
      ...userData,
      FYP: {
        ...userData.FYP,
        worksheets: worksheets.map((w) =>
          w.id === id ? { ...w, name: trimmed } : w
        ),
      },
    });
    setRenameError("");
  };

  const deleteWorksheet = (id: string) => {
    if (!userData || isMainId(id)) return;

    const nextList = worksheets.filter((w) => w.id !== id);
    const newDegreeProgress = (userData.FYP.degreeProgress2 ?? []).filter(
      (dp) => dp.worksheetID !== id
    );

    let nextActiveId = userData.FYP.activeWorksheetID;
    if (nextActiveId === id) {
      nextActiveId = "ws_main";
    }

    setUserData({
      ...userData,
      FYP: {
        ...userData.FYP,
        worksheets: nextList,
        activeWorksheetID: nextActiveId,
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
    setSemesterError(""); // clear error as user edits
  };

  const handleInputSubmit = () => {
    if (!userData) return;

    if (!(formData.term && formData.year && formData.title)) {
      setSemesterError("Please fill out term, year, and label.");
      return;
    }

    let year = Number(formData.year);
    if (Number(formData.term) === 2 || Number(formData.term) === 1) year += 1;

    const season = Number(`${year}${formData.term}`);

    // Check for duplicate semester (same year + term) on this worksheet
    const duplicateSemester = activeSemesters.some((s) => s.season === season);
    if (duplicateSemester) {
      setSemesterError(
        "You already have a semester for this term and year on this worksheet."
      );
      return;
    }

    const newSemester: StudentSemester = {
      title: formData.title,
      season,
      studentCourses: [],
      isCompleted: false,
    };

    setUserData(addSemester(userData, newSemester));

    // Clear form + error after success
    setFormData({ term: "", year: "", title: "" });
    setSemesterError("");
  };

  // term label helper
  const termLabel =
    formData.term === "03"
      ? "Fall"
      : formData.term === "01"
      ? "Spring"
      : formData.term === "02"
      ? "Summer"
      : "Select a term";

  const yearLabel = formData.year
    ? `${formData.year}-${Number(formData.year) + 1}`
    : "Select a year";

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
        {/* ---------- HEADER WITH DROPDOWNS ---------- */}
        <header className="m-6 mt-4 flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-gray-800">
                Course Planner
              </h1>
              <img src={pencilIcon} alt="pencil icon" className="h-10 w-10" />
            </div>

            {/* Right side: dropdowns */}
            <div className="ml-auto flex items-center gap-3">
              {/* Add Semester dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-2 border rounded-md bg-white text-sm font-medium shadow-sm hover:bg-gray-50 cursor-pointer">
                  <img
                    src={addSemesterIcon}
                    alt="add semester"
                    className="h-4 w-4 pointer-events-none"
                  />
                  <span className="cursor-pointer">Add Semester</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-80 p-3"
                  align="end"
                  sideOffset={6}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-2">
                      {/* Term custom dropdown */}
                      <div className="flex-1 flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-600">
                          Term
                        </label>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="w-full flex items-center justify-between px-2 py-1 border rounded-md text-sm bg-white cursor-pointer hover:bg-gray-50">
                            <span>{termLabel}</span>
                            <span className="text-gray-400 text-xs">▼</span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            className="w-full"
                            align="end"
                            sideOffset={4}
                          >
                            <DropdownMenuItem
                              className="text-sm cursor-pointer"
                              onSelect={(e) => {
                                e.preventDefault();
                                setFormData((prev) => ({
                                  ...prev,
                                  term: "03",
                                }));
                                setSemesterError("");
                              }}
                            >
                              Fall
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-sm cursor-pointer"
                              onSelect={(e) => {
                                e.preventDefault();
                                setFormData((prev) => ({
                                  ...prev,
                                  term: "01",
                                }));
                                setSemesterError("");
                              }}
                            >
                              Spring
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-sm cursor-pointer"
                              onSelect={(e) => {
                                e.preventDefault();
                                setFormData((prev) => ({
                                  ...prev,
                                  term: "02",
                                }));
                                setSemesterError("");
                              }}
                            >
                              Summer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Year custom dropdown */}
                      <div className="flex-1 flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-600">
                          Year
                        </label>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="w-full flex items-center justify-between px-2 py-1 border rounded-md text-sm bg-white cursor-pointer hover:bg-gray-50">
                            <span>{yearLabel}</span>
                            <span className="text-gray-400 text-xs">▼</span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            className="w-full"
                            align="end"
                            sideOffset={4}
                          >
                            {[
                              "2020",
                              "2021",
                              "2022",
                              "2023",
                              "2024",
                              "2025",
                              "2026",
                              "2027",
                              "2028",
                              "2029",
                            ].map((year) => (
                              <DropdownMenuItem
                                key={year}
                                className="text-sm cursor-pointer"
                                onSelect={(e) => {
                                  e.preventDefault();
                                  setFormData((prev) => ({
                                    ...prev,
                                    year,
                                  }));
                                  setSemesterError("");
                                }}
                              >
                                {year}-{Number(year) + 1}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-600">
                        Label
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Junior Spring"
                        className="border px-2 py-1 rounded-md text-sm bg-white cursor-text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleInputSubmit()
                        }
                      />
                    </div>

                    {semesterError && (
                      <p className="text-xs text-red-600">{semesterError}</p>
                    )}

                    <button
                      type="button"
                      onClick={handleInputSubmit}
                      className="mt-1 w-full px-3 py-2 rounded-md bg-brand-blue text-white text-sm font-medium hover:bg-blue-700 transition cursor-pointer"
                    >
                      Create semester
                    </button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Worksheets dropdown */}
              {/* Worksheets dropdown */}
              <DropdownMenu
                onOpenChange={(open) => {
                  // when the menu fully closes (click outside, Esc, etc.),
                  // clear any rename/delete/new-inline UIs
                  if (!open) {
                    resetWorksheetInlineState();
                  }
                }}
              >
                <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-2 border rounded-md bg-white text-sm font-medium shadow-sm hover:bg-gray-50 cursor-pointer max-w-[16rem]">
                  <span className="truncate cursor-pointer">
                    {activeWorksheet?.name ?? "Select worksheet"}
                  </span>
                  <span className="text-gray-400 text-xs pointer-events-none">
                    ▼
                  </span>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  className="max-w-[18rem]"
                  align="end"
                  sideOffset={6}
                >
                  <DropdownMenuLabel className="text-xs text-gray-500">
                    Active Worksheet
                  </DropdownMenuLabel>

                  {worksheets.map((w) => {
                    const isMain = isMainId(w.id);
                    const isActive = w.id === activeWorksheetId;
                    const isRowRenaming = isRenaming && renameTargetId === w.id;
                    const isRowDeleting = isDeleting && deleteTargetId === w.id;

                    return (
                      <DropdownMenuItem
                        key={w.id}
                        // Prevent default "select" behavior so we can control clicks inside
                        onSelect={(e) => e.preventDefault()}
                        className={`text-sm flex items-center justify-between gap-2 ${
                          isActive
                            ? "bg-gray-100 font-medium"
                            : "cursor-pointer"
                        }`}
                      >
                        {/* Normal row */}
                        {!isRowRenaming && !isRowDeleting && (
                          <>
                            <button
                              type="button"
                              className="truncate text-left flex-1"
                              onClick={() => {
                                setActiveWorksheet(w.id);
                              }}
                            >
                              {w.name}
                            </button>

                            {/* Inline actions for non-main worksheets */}
                            <div className="flex items-center gap-1 ml-2">
                              {!isMain && (
                                <>
                                  <button
                                    type="button"
                                    className="p-1 rounded hover:bg-gray-200 cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsDeleting(false);
                                      setDeleteTargetId(null);
                                      setIsRenaming(true);
                                      setRenameTargetId(w.id);
                                      setRenameValue(w.name);
                                      setRenameError("");
                                    }}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    className="p-1 rounded hover:bg-red-50 text-red-600 cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsRenaming(false);
                                      setRenameTargetId(null);
                                      setRenameError("");
                                      setIsDeleting(true);
                                      setDeleteTargetId(w.id);
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </>
                        )}

                        {/* Inline rename state for this row */}
                        {isRowRenaming && (
                          <div className="flex flex-col gap-1 w-full text-xs">
                            <span className="text-gray-600">
                              Rename "{w.name}"
                            </span>
                            <input
                              className="w-full border rounded-md px-2 py-1 bg-white"
                              value={renameValue}
                              onChange={(e) => {
                                setRenameValue(e.target.value);
                                setRenameError("");
                              }}
                              autoFocus
                              onFocus={(e) => e.target.select()}
                              onClick={(e) => e.stopPropagation()}
                            />

                            {renameError && (
                              <p className="text-xs text-red-600">
                                {renameError}
                              </p>
                            )}
                            <div className="flex justify-end gap-2 mt-1">
                              <button
                                type="button"
                                className="px-2 py-1 rounded-md border bg-white hover:bg-gray-50 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsRenaming(false);
                                  setRenameTargetId(null);
                                  setRenameValue("");
                                  setRenameError("");
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                className="px-2 py-1 rounded-md bg-brand-blue text-white hover:bg-blue-700 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (renameTargetId) {
                                    renameWorksheet(
                                      renameTargetId,
                                      renameValue
                                    );
                                    // Only close if no error
                                    if (!renameError) {
                                      setIsRenaming(false);
                                      setRenameTargetId(null);
                                    }
                                  }
                                }}
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Inline delete confirm for this row */}
                        {isRowDeleting && (
                          <div className="flex flex-col gap-1 w-full text-xs">
                            <span className="text-gray-700">
                              Delete "{w.name}"? This cannot be undone.
                            </span>
                            <div className="flex justify-end gap-2 mt-1">
                              <button
                                type="button"
                                className="px-2 py-1 rounded-md border bg-white hover:bg-gray-50 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsDeleting(false);
                                  setDeleteTargetId(null);
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                className="px-2 py-1 rounded-md bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (deleteTargetId) {
                                    deleteWorksheet(deleteTargetId);
                                  }
                                  setIsDeleting(false);
                                  setDeleteTargetId(null);
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </DropdownMenuItem>
                    );
                  })}

                  <DropdownMenuSeparator />

                  {/* New worksheet (inline name, closes on menu close) */}
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="cursor-pointer text-sm"
                  >
                    {!isCreating ? (
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsRenaming(false);
                          setIsDeleting(false);
                          setRenameTargetId(null);
                          setDeleteTargetId(null);
                          setRenameError("");
                          setNewWorksheetError("");
                          setIsCreating(true);
                          setNewWorksheetName("New Worksheet");
                        }}
                      >
                        New worksheet
                      </button>
                    ) : (
                      <div className="flex flex-col gap-1 w-full text-xs">
                        <span className="text-gray-700">
                          New worksheet name
                        </span>
                        <input
                          className="w-full border rounded-md px-2 py-1 bg-white"
                          value={newWorksheetName}
                          onChange={(e) => {
                            setNewWorksheetName(e.target.value);
                            setNewWorksheetError("");
                          }}
                          autoFocus
                          onFocus={(e) => e.target.select()}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const trimmed = newWorksheetName.trim();
                              if (!trimmed) {
                                setNewWorksheetError("Name cannot be empty.");
                                return;
                              }
                              const duplicate = worksheets.some(
                                (w) =>
                                  w.name.trim().toLowerCase() ===
                                  trimmed.toLowerCase()
                              );
                              if (duplicate) {
                                setNewWorksheetError(
                                  "A worksheet with this name already exists."
                                );
                                return;
                              }
                              createWorksheet(trimmed);
                              setIsCreating(false);
                              setNewWorksheetName("");
                              setNewWorksheetError("");
                            } else if (e.key === "Escape") {
                              e.preventDefault();
                              setIsCreating(false);
                              setNewWorksheetName("");
                              setNewWorksheetError("");
                            }
                          }}
                        />

                        {newWorksheetError && (
                          <p className="text-xs text-red-600">
                            {newWorksheetError}
                          </p>
                        )}
                      </div>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <p className="text-gray-500 font-medium mt-1">
            Welcome to your Course Planning page! Create new semesters, drag
            Yale courses from the sidebar, and create custom courses by clicking
            on the +!
          </p>
        </header>

        <hr className="border-gray-200 border-t-3" />

        {activeSemesters.map((semester, index) => (
          <SemesterOutput key={index} semester={semester} />
        ))}
      </div>
    </SidebarLayout>
  );
}

export default CoursePlanning;
