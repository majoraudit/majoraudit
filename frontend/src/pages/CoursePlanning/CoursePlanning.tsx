import { type StudentSemester } from "@/types/type-user";

import CourseOutput from "./components/CourseOutput";
import SemesterOutput from "./components/SemesterOutput";

import { useApp } from "@/contexts/AppContext";

import { useWorksheetManager } from "@/hooks/useWorksheetManager";

import pencilIcon from "./assets/pencil.svg";
import addSemesterIcon from "./assets/addSemester.svg";

import React, { useState } from "react";

import SidebarLayout from "@/components/shared-components/SidebarLayout";
import CustomCourseModal from "./components/CustomCourseModal";

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
  const { appData } = useApp();

  // term/year now strings so they work nicely with labels + custom dropdowns
  const [formData, setFormData] = useState({
    term: "",
    year: "",
    title: "",
  });
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedSemester, setSelectedSemester] =
    useState<StudentSemester | null>(null);
  const [isCustomCourseModalOpen, setIsCustomCourseModalOpen] = useState(false);

  const {
    worksheets,
    activeWorksheetId,
    activeWorksheet,
    activeSemesters,

    isMainId,
    setActiveWorksheet,
    addSemester,

    // inline UI
    isRenaming,
    renameTargetId,
    renameValue,
    renameError,
    beginRename,
    cancelRename,
    setRenameValue,
    commitRename,

    isDeleting,
    deleteTargetId,
    beginDelete,
    cancelDelete,
    confirmDelete,

    isCreating,
    newWorksheetName,
    newWorksheetError,
    beginCreate,
    cancelCreate,
    setNewWorksheetName,
    commitCreate,

    resetWorksheetInlineState,
  } = useWorksheetManager();

  if (!appData) return <div>Loading courses and majors...</div>;

  const openCustomCourseModal = (semester: StudentSemester) => {
    setSelectedSemester(semester);
    setIsCustomCourseModalOpen(true);
  };

  const closeCustomCourseModal = () => {
    setIsCustomCourseModalOpen(false);
    setSelectedSemester(null);
  };

  const handleCreateCustomCourse = (
    semester: StudentSemester,
    data: { title: string; code: string; notes: string },
  ) => {
    // TODO: adjust to match your actual StudentCourse type / helper
    // This is a *generic example* of pushing a new custom course
    const newCourse: any = {
      id: `custom_${Date.now()}`,
      title: data.title,
      code: data.code || "CUSTOM",
      notes: data.notes,
      isCustom: true,
    };
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
        .includes(searchNormalized),
  );

  const slicedCourses = filteredCourses.slice(0, 250);

  // ---------- Form handling ----------
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const TERM_TO_API_SEASON: Record<string, string> = { "01": "SP", "02": "SU", "03": "FA" };
  const TERM_TO_NUM: Record<string, number> = { "01": 1, "02": 2, "03": 3 };

  const handleInputSubmit = async () => {
    if (!(formData.term && formData.year)) return;

    // Yale convention: spring/summer belong to the next calendar year
    let year = Number(formData.year);
    if (formData.term === "01" || formData.term === "02") year += 1;

    const seasonNum = TERM_TO_NUM[formData.term] ?? 0;
    const combinedSeason = year * 100 + seasonNum;

    // Check for duplicate semester on this worksheet
    if (activeSemesters.some((s) => s.season === combinedSeason)) return;

    await addSemester({ year, season: TERM_TO_API_SEASON[formData.term] });
    setFormData({ term: "", year: "", title: "" });
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
                                      beginRename(w.id, w.name);
                                    }}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    className="p-1 rounded hover:bg-red-50 text-red-600 cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      beginDelete(w.id);
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
                                  cancelRename();
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                className="px-2 py-1 rounded-md bg-brand-blue text-white hover:bg-blue-700 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  commitRename();
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
                                  cancelDelete();
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                className="px-2 py-1 rounded-md bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmDelete();
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
                          beginCreate();
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
                          }}
                          autoFocus
                          onFocus={(e) => e.target.select()}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Enter") {
                              e.preventDefault();
                              commitCreate();
                            } else if (e.key === "Escape") {
                              e.preventDefault();
                              cancelCreate();
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
          <SemesterOutput
            key={index}
            semester={semester}
            onAddCustomCourse={() => openCustomCourseModal(semester)}
          />
        ))}
      </div>

      <CustomCourseModal
        open={isCustomCourseModalOpen}
        onClose={closeCustomCourseModal}
        semester={selectedSemester}
        onCreate={handleCreateCustomCourse}
      />
    </SidebarLayout>
  );
}

export default CoursePlanning;
