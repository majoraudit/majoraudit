import { formatC_P_UP } from "@/utils/formatHelpers";
import type { UserMajor } from "@/api/user_info";

import { useUser } from "@/contexts/UserContext";

import MajorRequirementList from "./components/MajorRequirementList";
import MajorRequirementGraph from "./components/MajorRequirementGraph";
import DashboardInsightGrid from "./components/DashboardInsightGrid";

import checkIcon from "./assets/check.svg";
import trashcan from "./assets/trashcan.svg";

import { useMemo, useEffect, useState, useCallback } from "react";

import { useWorksheetManager } from "@/hooks/useWorksheetManager";
import { useWorksheetActions } from "@/hooks/useWorksheetActions";
import { useWorksheetData } from "@/hooks/useWorksheetData";
import { apiFetchMajorTemplate, apiFetchMajorMQL } from "@/api/majors";

import type { MQLQueryFile } from "@/types/schema/mql/mql";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

// ---------- Major info shape ----------
interface MajorInfo {
  name: string;
  id: string;
  abbr: string;
  discipline: string;
  rating: number;
  workload: number;
  students: number;
  specializations: string[];
}

type ActiveTab = "degree" | "major";

function Dashboard() {
  const { userData } = useUser();

  const { worksheets, activeWorksheetId, setActiveWorksheet } =
    useWorksheetManager();
  const { removeProgram } = useWorksheetActions();
  const {
    totalCredits,
    completedCredits,
    completedCourseCount,
    allStudentCourses,
    semesters,
    majorCount,
    certificateCount,
  } = useWorksheetData();

  const graduationCreditsRequired = 36;
  const totalCompletedCredits = completedCredits;
  const totalPlannedCredits = totalCredits - completedCredits;
  const totalCompletedCourses = completedCourseCount;
  const creditsRemaining = Math.max(
    0,
    graduationCreditsRequired - totalCompletedCredits - totalPlannedCredits,
  );

  // ---------- Tab + navigation state ----------
  const [activeTab, setActiveTab] = useState<ActiveTab>("degree");
  const [selectedMajorIndex, setSelectedMajorIndex] = useState(0);

  // ---------- Major template + MQL cache ----------
  const [majorInfoCache, setMajorInfoCache] = useState<
    Record<string, MajorInfo>
  >({});
  const [mqlCache, setMqlCache] = useState<Record<string, MQLQueryFile>>({});
  const [activeMajorInfo, setActiveMajorInfo] = useState<MajorInfo | null>(
    null,
  );
  const [activeMqlData, setActiveMqlData] = useState<MQLQueryFile | null>(null);
  const [isLoadingMajor, setIsLoadingMajor] = useState(false);

  const degreeMajor: UserMajor | null = useMemo(() => {
    return userData?.FYP?.majors?.find((m) => m.major_id === "general") ?? null;
  }, [userData?.FYP?.majors]);

  // All declared majors excluding "general"
  const declaredMajors: UserMajor[] = useMemo(() => {
    return (userData?.FYP?.majors ?? []).filter(
      (m) => m.major_id !== "general_degree",
    );
  }, [userData?.FYP?.majors]);

  const activeMajor: UserMajor | null = useMemo(() => {
    if (activeTab !== "major") return null;
    return declaredMajors[selectedMajorIndex] ?? null;
  }, [activeTab, selectedMajorIndex, declaredMajors]);

  const loadMajorData = useCallback(
    async (majorId: string) => {
      setIsLoadingMajor(true);
      try {
        // Get info from cache or fetch
        const infoPromise = majorInfoCache[majorId]
          ? Promise.resolve(majorInfoCache[majorId])
          : apiFetchMajorTemplate(majorId);

        const info = await infoPromise;
        if (!majorInfoCache[majorId]) {
          setMajorInfoCache((prev) => ({ ...prev, [majorId]: info }));
        }
        setActiveMajorInfo(info);

        const firstSpec = info.specializations?.[0];
        if (!firstSpec) {
          setActiveMqlData(null);
          return;
        }

        const specName = firstSpec.replace(".mql", "");
        const cacheKey = `${majorId}/${specName}`;

        // Fetch MQL in parallel with template if both not cached
        const mqlPromise = mqlCache[cacheKey]
          ? Promise.resolve(mqlCache[cacheKey])
          : apiFetchMajorMQL(majorId, specName).then((raw) =>
              typeof raw === "string" ? JSON.parse(raw) : raw,
            );

        const mql = await mqlPromise;
        if (!mqlCache[cacheKey]) {
          setMqlCache((prev) => ({ ...prev, [cacheKey]: mql }));
        }
        setActiveMqlData(mql);
      } catch (e) {
        console.error("Failed to load major data:", e);
        setActiveMqlData(null);
      } finally {
        setIsLoadingMajor(false);
      }
    },
    [majorInfoCache, mqlCache],
  );

  const preloadMajorData = useCallback(
    async (majorId: string) => {
      try {
        // Only populate caches, don't touch active state
        if (!majorInfoCache[majorId]) {
          const info = await apiFetchMajorTemplate(majorId);
          setMajorInfoCache((prev) => ({ ...prev, [majorId]: info }));

          const firstSpec = info.specializations?.[0];
          if (firstSpec) {
            const specName = firstSpec.replace(".mql", "");
            const cacheKey = `${majorId}/${specName}`;
            if (!mqlCache[cacheKey]) {
              const raw = await apiFetchMajorMQL(majorId, specName);
              const mql = typeof raw === "string" ? JSON.parse(raw) : raw;
              setMqlCache((prev) => ({ ...prev, [cacheKey]: mql }));
            }
          }
        }
      } catch (e) {
        // Silent fail — preloading is best effort
      }
    },
    [majorInfoCache, mqlCache],
  );

  // Preload all declared majors silently on mount
  useEffect(() => {
    declaredMajors.forEach((m) => preloadMajorData(m.major_id));
    if (degreeMajor) preloadMajorData("general");
  }, []);
  useEffect(() => {
    if (activeTab === "degree") {
      if (degreeMajor) loadMajorData("general");
      else {
        setActiveMajorInfo(null);
        setActiveMqlData(null);
      }
      return;
    }
    if (!activeMajor) {
      setActiveMajorInfo(null);
      setActiveMqlData(null);
      return;
    }
    loadMajorData(activeMajor.major_id);
  }, [activeMajor?.major_id, activeTab, degreeMajor?.id]);

  // Reset index when majors list changes
  useEffect(() => {
    if (selectedMajorIndex >= declaredMajors.length) {
      setSelectedMajorIndex(Math.max(0, declaredMajors.length - 1));
    }
  }, [declaredMajors.length]);

  const handleRemoveMajor = async () => {
    if (!activeMajor) return;
    await removeProgram(activeMajor.id);
    if (selectedMajorIndex >= declaredMajors.length - 1) {
      setSelectedMajorIndex(Math.max(0, selectedMajorIndex - 1));
    }
    if (declaredMajors.length <= 1) {
      setActiveTab("degree");
    }
  };

  const displayName = useMemo(() => {
    if (activeTab === "degree") {
      return isLoadingMajor
        ? "Loading..."
        : (activeMajorInfo?.name ?? "General Degree Requirements");
    }
    if (isLoadingMajor) return "Loading...";
    return activeMajorInfo?.name ?? activeMajor?.major_id ?? "Loading...";
  }, [activeTab, isLoadingMajor, activeMajorInfo, activeMajor]);

  return (
    <>
      <div className="h-[calc(100vh-5rem)] w-full flex flex-col bg-gray-50 p-6 gap-4 overflow-y-auto">
        {/* Progress bars */}
        <section className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 w-full gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-md font-semibold mb-2">
              General Progress (Credits)
            </h3>
            <div className="mb-4 h-3 w-full flex overflow-hidden justify-center">
              <div
                style={{
                  width: `${(totalCompletedCredits / graduationCreditsRequired) * 100}%`,
                }}
                className="rounded-lg bg-green-700 transition-all duration-500 ease-out"
              />
              <div
                style={{
                  width: `${(totalPlannedCredits / graduationCreditsRequired) * 100}%`,
                }}
                className="rounded-lg bg-yellow-500 transition-all duration-500 ease-out"
              />
              <div
                style={{
                  width: `${((graduationCreditsRequired - totalCompletedCredits - totalPlannedCredits) / graduationCreditsRequired) * 100}%`,
                }}
                className="rounded-lg bg-gray-300 transition-all duration-500 ease-out"
              />
            </div>
            {formatC_P_UP(
              totalCompletedCredits,
              totalPlannedCredits,
              creditsRemaining,
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-md font-semibold mb-2">
              Major Progress (Courses)
            </h3>
            <div className="mb-4 h-3 w-full flex overflow-hidden">
              <div
                style={{
                  width: `${(totalCompletedCredits / graduationCreditsRequired) * 100}%`,
                }}
                className="rounded-lg bg-green-700 transition-all duration-500 ease-out"
              />
              <div
                style={{
                  width: `${(totalPlannedCredits / graduationCreditsRequired) * 100}%`,
                }}
                className="rounded-lg bg-yellow-500 transition-all duration-500 ease-out"
              />
              <div
                style={{
                  width: `${((graduationCreditsRequired - totalCompletedCredits - totalPlannedCredits) / graduationCreditsRequired) * 100}%`,
                }}
                className="rounded-lg bg-gray-300 transition-all duration-500 ease-out"
              />
            </div>
            {formatC_P_UP(
              activeProgramCompletedGroups,
              activeProgramInProgressGroups,
              activeProgramRemainingGroups,
            )}
          </div>
        </section>

        {/* Summary Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-gray-500">Courses Completed</h2>
            <p className="text-3xl font-semibold">{totalCompletedCourses}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-gray-500">Credits Remaining</h2>
            <p className="text-3xl font-semibold">
              {Math.max(
                0,
                graduationCreditsRequired -
                  totalCompletedCredits -
                  totalPlannedCredits,
              )}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-gray-500">Declared Majors</h2>
            <p className="text-3xl font-semibold">{majorCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-gray-500">Certificates</h2>
            <p className="text-3xl font-semibold">{certificateCount}</p>
          </div>
        </section>

        {/* Major viewer */}
        <section className="bg-white rounded-lg shadow p-4 w-full flex flex-col flex-1 min-h-[26rem]">
          <div className="flex flex-row items-center border-b mb-2">
            <div className="flex gap-4">
              <button
                className={`py-2 px-4 font-medium ${
                  activeTab === "degree"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-500"
                }`}
                onClick={() => setActiveTab("degree")}
              >
                Degree
              </button>

              <button
                className={`py-2 px-4 font-medium ${
                  activeTab === "major"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-500"
                } ${majorCount === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={() => setActiveTab("major")}
                disabled={majorCount === 0}
              >
                Major{" "}
                {majorCount > 1 && `(${selectedMajorIndex + 1}/${majorCount})`}
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger className="max-w-[16rem] px-3 py-2 flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
                  <span className="text-gray-700 truncate">
                    {worksheets.find((w) => w.id === activeWorksheetId)?.name ??
                      "Select worksheet"}
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
                      className={`text-sm cursor-pointer ${w.id === activeWorksheetId ? "bg-gray-100 font-medium" : ""}`}
                      onClick={() => setActiveWorksheet(w.id)}
                    >
                      <span className="truncate block">{w.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Navigation and title */}
            <div className="flex-1 flex justify-center items-center gap-4">
              {activeTab === "major" && majorCount > 1 && (
                <button
                  onClick={() =>
                    setSelectedMajorIndex((i) => Math.max(0, i - 1))
                  }
                  disabled={selectedMajorIndex === 0}
                  className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ←
                </button>
              )}

              <div className="flex flex-col items-center">
                <span className="font-bold text-2xl">
                  {displayName}
                  {activeTab === "major" && activeMajor?.specialization && (
                    <span className="text-gray-500 font-normal text-lg ml-2">
                      (
                      {activeMajor.specialization
                        .replace(`${activeMajor.major_id}_`, "")
                        .replace(".mql", "")
                        .split("_")
                        .map((s) => s.toUpperCase())
                        .join("/")}
                      )
                    </span>
                  )}
                </span>
              </div>

              {activeTab === "major" && majorCount > 1 && (
                <button
                  onClick={() =>
                    setSelectedMajorIndex((i) =>
                      Math.min(majorCount - 1, i + 1),
                    )
                  }
                  disabled={selectedMajorIndex === majorCount - 1}
                  className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  →
                </button>
              )}
            </div>

            {activeTab === "major" && activeMajor && (
              <div className="ml-auto py-2 px-4">
                <button
                  onClick={handleRemoveMajor}
                  aria-label="Remove major"
                  title="Remove major"
                >
                  <img
                    src={trashcan}
                    alt="Remove"
                    className="h-5 w-5 float-right active:scale-125 transition duration-300 ease-in-out"
                  />
                </button>
              </div>
            )}
          </div>

          {/* Content area */}
          <div className="flex flex-row flex-1 gap-4 min-h-0 p-0 mt-2">
            {/* Left panel — requirement list */}
            <div className="flex flex-col w-[26rem] flex-shrink-0 h-full min-h-full bg-white border-gray-200 border-2 shadow overflow-hidden">
              {isLoadingMajor ? (
                <div className="text-gray-400 text-sm flex items-center justify-center flex-1">
                  Loading requirements...
                </div>
              ) : activeMqlData ? (
                <MajorRequirementList mqlData={activeMqlData} />
              ) : (
                <div className="text-gray-400 text-sm flex items-center justify-center flex-1">
                  No requirements available.
                </div>
              )}
            </div>

            {/* Right panel — requirement graph */}
            <div className="flex flex-col flex-1 h-full min-h-0 bg-white border-gray-200 border-2 p-2 shadow overflow-hidden min-w-0">
              {isLoadingMajor ? (
                <div className="text-gray-400 text-sm flex items-center justify-center flex-1">
                  Loading...
                </div>
              ) : activeMqlData ? (
                <MajorRequirementGraph mqlData={activeMqlData} />
              ) : (
                <div className="text-gray-400 text-sm flex items-center justify-center flex-1">
                  No requirements available.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

export default Dashboard;
