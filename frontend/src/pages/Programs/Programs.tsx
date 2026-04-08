import type { GroupItemProgress } from "@/types/type-program";
import { formatCourseItemTypes } from "@/utils/formatHelpers";
import type { MajorTemplate } from "@/types/type-program";

import { useUser } from "@/contexts/UserContext";
import { useApp } from "@/contexts/AppContext";

import bookIcon from "./assets/book.svg";

import { useWorksheetManager } from "@/hooks/useWorksheetManager";
import { useWorksheetActions } from "@/hooks/useWorksheetActions";

import { useState, useEffect, useMemo, useCallback } from "react";
import SidebarLayout from "@/components/shared-components/SidebarLayout";

import { useAuth } from "@/contexts/AuthContext";
import {
  apiFetchMajorTemplate,
  apiFetchMajorPreview,
  type MajorPreview,
} from "@/api/majors";
import type { RequirementResult } from "@/api/audit";
import { formatSelector, formatQuantity } from "@/services/formatMQL";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import { Plus, Check, Loader2 } from "lucide-react";

// Converts a specialization filename into a display label
// e.g. "computer_science_bs_ms.mql" with major id "computer_science" → "BS/MS"
function specializationLabel(
  specializationFile: string,
  majorId: string,
): string {
  return specializationDegreeType(specializationFile, majorId)
    .split("_")
    .map((s) => s.toUpperCase())
    .join("/");
}

// Extracts the degree-type slug from a specialization filename.
// e.g. "computer_science_bs_ms.mql" with major id "computer_science" → "bs_ms"
// This is the suffix the backend WorksheetMajor.degree_type column expects.
function specializationDegreeType(
  specializationFile: string,
  majorId: string,
): string {
  return specializationFile
    .replace(`${majorId}_`, "")
    .replace(".mql", "");
}

// Major info shape returned by the backend
interface MajorInfo {
  name: string;
  id: string;
  abbr: string;
  degreeTypes: string[][];
  courses: number;
  rating: number;
  workload: number;
  discipline: string;
  students: number;
  about: string;
  dus: string[][];
  catalogLink: string;
  websiteLink: string;
  specializations: string[];
}

function Programs() {
  const { userData, setUserData } = useUser();
  const { appData } = useApp();
  const { isAuthenticated } = useAuth();
  const { worksheets, activeWorksheetId, activeWorksheet } =
    useWorksheetManager();
  const { addProgram } = useWorksheetActions();

  const [selectedMajorInfo, setSelectedMajorInfo] = useState<MajorInfo | null>(
    null,
  );
  const [selectedSpecialization, setSelectedSpecialization] = useState<
    string | null
  >(null);
  const [templateCache, setTemplateCache] = useState<Record<string, MajorInfo>>(
    {},
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [isAddingProgram, setIsAddingProgram] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Clear add-error when the user changes selection
  useEffect(() => {
    setAddError(null);
  }, [selectedMajorInfo?.id, selectedSpecialization, activeWorksheetId]);

  // Is the currently-selected (major, degree_type) pair already on the active worksheet?
  const selectedDegreeType = useMemo(() => {
    if (!selectedMajorInfo || !selectedSpecialization) return null;
    return specializationDegreeType(
      selectedSpecialization,
      selectedMajorInfo.id,
    );
  }, [selectedMajorInfo, selectedSpecialization]);

  const alreadyAdded = useMemo(() => {
    if (!selectedMajorInfo || !selectedDegreeType) return false;
    return (
      activeWorksheet?.majors?.some(
        (m) =>
          m.major_id === selectedMajorInfo.id &&
          m.degree_type === selectedDegreeType,
      ) ?? false
    );
  }, [activeWorksheet?.majors, selectedMajorInfo, selectedDegreeType]);

  const handleAddProgram = useCallback(async () => {
    if (!selectedMajorInfo || !selectedDegreeType) return;
    if (!activeWorksheetId) {
      setAddError("Select a worksheet first.");
      return;
    }
    if (alreadyAdded) return;

    setIsAddingProgram(true);
    setAddError(null);
    try {
      const res = await addProgram(selectedMajorInfo.id, selectedDegreeType);
      if (!res.ok) {
        setAddError(res.error ?? "Failed to add program.");
      }
    } catch (e: any) {
      setAddError(String(e?.message ?? e));
    } finally {
      setIsAddingProgram(false);
    }
  }, [
    selectedMajorInfo,
    selectedDegreeType,
    activeWorksheetId,
    alreadyAdded,
    addProgram,
  ]);

  // ---- MQL preview cache ---------------------------------------------------
  // Keyed on `${major_id}|${degree_type}|${worksheet_id}|${courses_fp}`. The
  // course fingerprint is a stable hash of the worksheet's current course list
  // (sorted UserWorksheetClass ids), so cache entries automatically invalidate
  // whenever a course is added or removed on the active worksheet.

  const [previewCache, setPreviewCache] = useState<Map<string, MajorPreview>>(
    () => new Map(),
  );
  const [isLoadingPreviews, setIsLoadingPreviews] = useState(false);

  // Stable hash of the active worksheet's courses. Sorting makes it
  // independent of insertion order; missing ids are skipped (only happens for
  // optimistically-added courses that haven't yet been persisted).
  const courseFingerprint = useMemo(() => {
    if (!activeWorksheet) return "no-ws";
    const ids: number[] = [];
    for (const sem of activeWorksheet.studentSemesters ?? []) {
      for (const sc of sem.studentCourses ?? []) {
        if (sc.worksheetClassId != null) ids.push(sc.worksheetClassId);
      }
    }
    ids.sort((a, b) => a - b);
    return ids.length === 0 ? "empty" : ids.join(",");
  }, [activeWorksheet]);

  const cacheKey = (
    majorId: string,
    degreeType: string,
    worksheetId: number | undefined,
    fp: string,
  ) => `${majorId}|${degreeType}|${worksheetId ?? "none"}|${fp}`;

  // When the user clicks a major in the sidebar — or when the active
  // worksheet's courses change — sequentially fetch previews for every
  // variant of that major. The toggle (BA/BS/...) is a pure cache lookup.
  useEffect(() => {
    if (!selectedMajorInfo) return;

    const wsIdRaw = activeWorksheetId ? Number(activeWorksheetId) : undefined;
    const wsId =
      wsIdRaw != null && !Number.isNaN(wsIdRaw) ? wsIdRaw : undefined;

    let cancelled = false;

    (async () => {
      setIsLoadingPreviews(true);
      try {
        for (const specFile of selectedMajorInfo.specializations ?? []) {
          const degreeType = specializationDegreeType(
            specFile,
            selectedMajorInfo.id,
          );
          const key = cacheKey(
            selectedMajorInfo.id,
            degreeType,
            wsId,
            courseFingerprint,
          );
          if (previewCache.has(key)) continue;
          try {
            const preview = await apiFetchMajorPreview(
              selectedMajorInfo.id,
              degreeType,
              wsId,
            );
            if (cancelled) return;
            setPreviewCache((prev) => {
              const next = new Map(prev);
              next.set(key, preview);
              return next;
            });
          } catch (e) {
            console.error(
              `preview fetch failed for ${selectedMajorInfo.id}_${degreeType}`,
              e,
            );
          }
        }
      } finally {
        if (!cancelled) setIsLoadingPreviews(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // previewCache is intentionally NOT in deps — we read it inside via .has()
    // for de-duplication. Re-running on every successful fetch would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMajorInfo?.id, activeWorksheetId, courseFingerprint]);

  // Currently-displayed preview, looked up from the cache.
  const activePreview = useMemo(() => {
    if (!selectedMajorInfo || !selectedDegreeType) return null;
    const wsIdRaw = activeWorksheetId ? Number(activeWorksheetId) : undefined;
    const wsId =
      wsIdRaw != null && !Number.isNaN(wsIdRaw) ? wsIdRaw : undefined;
    return (
      previewCache.get(
        cacheKey(
          selectedMajorInfo.id,
          selectedDegreeType,
          wsId,
          courseFingerprint,
        ),
      ) ?? null
    );
  }, [
    previewCache,
    selectedMajorInfo,
    selectedDegreeType,
    activeWorksheetId,
    courseFingerprint,
  ]);

  // Audit results indexed by requirement description for fast lookup during render.
  const reqResultsByDesc = useMemo(() => {
    const m = new Map<string, RequirementResult>();
    for (const r of activePreview?.solve_result?.per_requirement ?? []) {
      m.set(r.description, r);
    }
    return m;
  }, [activePreview]);

  // major_templates is now { id: string; name: string }[]
  // Sort by name directly
  const sortedMajors = useMemo(() => {
    if (!appData?.major_templates) return [];
    return [...appData.major_templates].sort((a, b) =>
      a.name.localeCompare(b.name, "en", { sensitivity: "base" }),
    );
  }, [appData?.major_templates]);

  // Filter by name or id
  const filteredMajors = useMemo(() => {
    if (!searchTerm.trim()) return sortedMajors;
    const normalized = searchTerm.toLowerCase();
    return sortedMajors.filter(
      (m) =>
        m.name.toLowerCase().includes(normalized) ||
        m.id.toLowerCase().includes(normalized),
    );
  }, [sortedMajors, searchTerm]);

  const handleSelectMajor = useCallback(
    async (majorId: string) => {
      if (!appData) return;

      setIsLoadingTemplate(true);
      try {
        let info = templateCache[majorId];
        if (!info) {
          info = await apiFetchMajorTemplate(majorId);
          setTemplateCache((prev) => ({ ...prev, [majorId]: info }));
        }

        setSelectedMajorInfo(info);
        setSelectedSpecialization(info.specializations?.[0] ?? null);
      } catch (e) {
        console.error("Failed to load major template:", e);
      } finally {
        setIsLoadingTemplate(false);
      }
    },
    [appData, templateCache],
  );

  // Load the first major by default once appData is ready
  useEffect(() => {
    if (!appData || sortedMajors.length === 0 || selectedMajorInfo) return;
    handleSelectMajor(sortedMajors[0].id);
  }, [appData, sortedMajors]);

  const setActiveWorksheet = (id: string | null) => {
    if (!userData) return;
    setUserData({
      ...userData,
      FYP: {
        ...userData.FYP,
        activeWorksheetID: id ?? "",
      },
    });
  };

  if (!appData) return <div>Loading courses and majors...</div>;

  return (
    <SidebarLayout
      sidebar={
        <div className="flex flex-col h-full">
          <input
            type="text"
            placeholder="Search by major or certificate..."
            className="px-4 py-2 border-b-4 border-gray-200 bg-blue-100 placeholder-shown:bg-white w-full focus:outline-none focus:bg-gray-100 transition-colors duration-200 ease-in-out border-t-2"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="overflow-y-auto flex-1 pb-2">
            <ul className="flex flex-col w-full">
              {filteredMajors.map((major, index) => {
                const isSelected = selectedMajorInfo?.id === major.id;
                return (
                  <li key={major.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectMajor(major.id)}
                      className={`w-full text-left m-0 p-2 cursor-pointer transition-colors duration-200 hover:bg-blue-200 ${
                        isSelected
                          ? "bg-blue-100 font-medium"
                          : index % 2 === 0
                            ? "bg-gray-100"
                            : "bg-white"
                      }`}
                    >
                      {major.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      }
    >
      {/* RIGHT SIDE CONTENT */}
      <div className="flex flex-col w-full">
        <header className="m-6 mt-4 flex flex-col">
          <div className="flex flex-row gap-2 items-center">
            <h1 className="text-3xl font-bold text-gray-800">Program Viewer</h1>
            <img src={bookIcon} alt="book icon" className="h-8 w-8 ml-1" />
          </div>
          <p className="text-gray-500 font-medium mt-2">
            Welcome to the Program Viewer page! Search through majors and
            certificates, and add them to your profile!
          </p>
        </header>

        <hr className="border-gray-200 border-t-3" />

        {isLoadingTemplate ? (
          <div className="flex items-center justify-center flex-1 text-gray-500 p-12">
            Loading program...
          </div>
        ) : !selectedMajorInfo ? (
          <div className="flex items-center justify-center flex-1 text-gray-500 p-12">
            Select a major from the sidebar.
          </div>
        ) : (
          <main className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 w-full flex-1">
            {/* Left Panel — Major Info */}
            <section className="relative min-w-0 min-h-screen flex flex-col bg-white border-2 border-gray-200 p-6 rounded-xl shadow-md">
              {isAuthenticated && (
                <button
                  className={`absolute top-6 right-6 rounded-full w-8 h-8 flex items-center justify-center text-center text-xl leading-none z-10 transition duration-300 ease-in-out text-white
                    ${
                      alreadyAdded
                        ? "bg-green-600 cursor-default"
                        : isAddingProgram ||
                          !selectedDegreeType ||
                          !activeWorksheetId
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-brand-blue hover:scale-110"
                    }`}
                  aria-label={
                    alreadyAdded ? "Already added" : "Add major to worksheet"
                  }
                  title={
                    alreadyAdded
                      ? "Already on this worksheet"
                      : !activeWorksheetId
                        ? "Select a worksheet first"
                        : !selectedDegreeType
                          ? "Select a degree type first"
                          : "Add major to worksheet"
                  }
                  disabled={
                    alreadyAdded ||
                    isAddingProgram ||
                    !selectedDegreeType ||
                    !activeWorksheetId
                  }
                  onClick={handleAddProgram}
                >
                  {alreadyAdded ? (
                    <Check size={18} />
                  ) : isAddingProgram ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Plus size={18} />
                  )}
                </button>
              )}
              {addError && (
                <div className="absolute top-16 right-6 z-10 max-w-[18rem] rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 shadow-sm">
                  {addError}
                </div>
              )}

              <div className="flex flex-col items-start min-w-0 pr-12">
                <h1 className="text-3xl font-bold text-gray-800 break-words">
                  {selectedMajorInfo.name}
                </h1>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-gray-500 whitespace-nowrap text-lg">
                    {selectedMajorInfo.abbr}
                  </span>
                  <span className="bg-purple-100 text-purple-600 text-sm px-2 py-1 rounded font-medium whitespace-nowrap">
                    {selectedMajorInfo.discipline}
                  </span>
                </div>
              </div>

              {/* Specialization toggle buttons */}
              {selectedMajorInfo.specializations?.length > 0 && (
                <div className="mt-4 flex items-center gap-1">
                  <span className="text-sm font-medium text-gray-600 mr-2">
                    Degree:
                  </span>
                  <div className="flex rounded-md overflow-hidden border border-gray-300">
                    {selectedMajorInfo.specializations.map((spec, i) => {
                      const label = specializationLabel(
                        spec,
                        selectedMajorInfo.id,
                      );
                      const isActive = selectedSpecialization === spec;
                      return (
                        <button
                          key={spec}
                          type="button"
                          onClick={() => setSelectedSpecialization(spec)}
                          className={`px-3 py-1 text-sm font-medium transition-colors duration-150 cursor-pointer
                            ${i > 0 ? "border-l border-gray-300" : ""}
                            ${
                              isActive
                                ? "bg-brand-blue text-white"
                                : "bg-white text-gray-700 hover:bg-gray-50"
                            }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-5">
                <h2 className="text-gray-700 font-semibold text-sm mb-2">
                  STATS
                </h2>
                <div className="grid grid-cols-3 text-center text-sm text-gray-600 gap-2">
                  <div className="bg-green-100 p-2 rounded-xl">
                    <p className="text-green-600 font-bold">
                      {selectedMajorInfo.rating > 0
                        ? `~${selectedMajorInfo.rating}`
                        : "N/A"}
                    </p>
                    Rating
                  </div>
                  <div className="bg-orange-100 p-2 rounded-xl">
                    <p className="text-orange-500 font-bold">
                      {selectedMajorInfo.workload > 0
                        ? `~${selectedMajorInfo.workload}`
                        : "N/A"}
                    </p>
                    Workload
                  </div>
                  <div className="bg-blue-100 p-2 rounded-xl">
                    <p className="text-blue-600 font-bold">
                      {selectedMajorInfo.students > 0
                        ? selectedMajorInfo.students
                        : "N/A"}
                    </p>
                    Students
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h2 className="text-gray-700 font-semibold text-sm mb-2">
                  ABOUT
                </h2>
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                  {selectedMajorInfo.about}
                </p>
              </div>

              <div className="mt-6 text-sm">
                <h2 className="text-gray-700 font-semibold mb-1">
                  Director of Undergraduate Studies
                </h2>
                <div className="text-brand-blue underline">
                  {selectedMajorInfo.dus.map(([name, email], i) => (
                    <p key={i}>
                      {name}, {email}
                    </p>
                  ))}
                </div>
                <div className="flex gap-2 mt-4 flex-wrap">
                  {selectedMajorInfo.catalogLink && (
                    <a
                      href={selectedMajorInfo.catalogLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border rounded px-3 py-1 text-sm hover:bg-gray-50"
                    >
                      MAJOR CATALOG
                    </a>
                  )}
                  {selectedMajorInfo.websiteLink && (
                    <a
                      href={selectedMajorInfo.websiteLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border rounded px-3 py-1 text-sm hover:bg-gray-50"
                    >
                      MAJOR WEBSITE
                    </a>
                  )}
                </div>
              </div>
            </section>

            {/* Right Panel — Requirements placeholder */}
            <section className="min-w-0 min-h-screen flex flex-col bg-white p-6 border-2 border-gray-200 rounded-xl shadow-md">
              <div className="flex justify-between gap-4 items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">
                  Requirements
                </h2>

                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-2 border rounded-md bg-white text-sm font-medium shadow-sm hover:bg-gray-50 max-w-[16rem]">
                    <span className="truncate">
                      {worksheets.find((w) => w.id === activeWorksheetId)
                        ?.name ?? "Select worksheet"}
                    </span>
                    <span className="text-gray-400 text-xs">▼</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="max-w-[16rem]"
                    align="end"
                    sideOffset={6}
                  >
                    {worksheets.map((w) => (
                      <DropdownMenuItem
                        key={w.id}
                        className={`text-sm cursor-pointer ${
                          w.id === activeWorksheetId
                            ? "bg-gray-100 font-medium"
                            : ""
                        }`}
                        onClick={() => setActiveWorksheet(w.id)}
                      >
                        <span className="truncate block">{w.name}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {!activePreview ? (
                <div className="flex items-center justify-center flex-1 text-gray-500 text-sm">
                  {isLoadingPreviews
                    ? "Loading requirements..."
                    : "No requirements available."}
                </div>
              ) : (
                <ul className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {activePreview.mql_file.requirements.map((req, i) => {
                    const result = reqResultsByDesc.get(req.description);
                    const satisfied = result?.satisfied ?? null;
                    return (
                      <li
                        key={i}
                        className={`rounded-md border-2 p-3 ${
                          satisfied === true
                            ? "border-green-300 bg-green-50"
                            : satisfied === false
                              ? "border-red-200 bg-red-50"
                              : "border-gray-200 bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-800">
                            {req.description}
                          </span>
                          <span className="text-xs text-gray-500">
                            pick {formatQuantity(req.query.quantity)}
                          </span>
                        </div>
                        <ul className="text-sm space-y-1 ml-2">
                          {req.query.selector.map((sel, j) => {
                            const label = formatSelector(sel);
                            const code =
                              "Class" in sel
                                ? `${sel.Class.department_id} ${sel.Class.course_number}`
                                : null;
                            const fulfilled = code
                              ? (result?.selected.includes(code) ?? false)
                              : false;
                            return (
                              <li
                                key={j}
                                className={
                                  fulfilled
                                    ? "text-green-700"
                                    : "text-gray-700"
                                }
                              >
                                • {label}
                                {fulfilled && " ✓"}
                              </li>
                            );
                          })}
                        </ul>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </main>
        )}
      </div>
    </SidebarLayout>
  );
}

export default Programs;
