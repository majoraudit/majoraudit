import type { WorksheetMajor } from "@/api/worksheetMajors";
import type { AuditResult } from "@/api/majors";

import { useUser } from "@/contexts/UserContext";
import { useApp } from "@/contexts/AppContext";

import MajorRequirementList from "./components/MajorRequirementList";
import MajorRequirementGraph from "./components/MajorRequirementGraph";
import DashboardInsightGrid from "./components/DashboardInsightGrid";

import trashcan from "./assets/trashcan.svg";

import { useMemo, useEffect, useState, useCallback } from "react";

import { useWorksheetManager } from "@/hooks/useWorksheetManager";
import { useWorksheetActions } from "@/hooks/useWorksheetActions";
import { useWorksheetData } from "@/hooks/useWorksheetData";
import {
  apiFetchMajorTemplate,
  apiFetchMajorMQL,
  apiRunAudit,
} from "@/api/majors";

import type { MQLQueryFile } from "@/types/schema/mql/mql";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

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
  const { appData } = useApp();

  const { worksheets, activeWorksheetId, activeWorksheet, setActiveWorksheet } =
    useWorksheetManager();
  const { removeProgram } = useWorksheetActions();
  const {
    totalCredits,
    completedCredits,
    completedCourseCount,
    allStudentCourses,
    semesters,
    majorCount,
    uniqueCourses,
  } = useWorksheetData();

  const graduationCreditsRequired = 36;
  const totalCompletedCourses = completedCourseCount;

  const [activeTab, setActiveTab] = useState<ActiveTab>("degree");
  const [selectedMajorIndex, setSelectedMajorIndex] = useState(0);

  const [majorInfoCache, setMajorInfoCache] = useState<
    Record<string, MajorInfo>
  >({});
  const [mqlCache, setMqlCache] = useState<Record<string, MQLQueryFile>>({});
  const [activeMajorInfo, setActiveMajorInfo] = useState<MajorInfo | null>(
    null,
  );
  const [activeMqlData, setActiveMqlData] = useState<MQLQueryFile | null>(null);
  const [isLoadingMajor, setIsLoadingMajor] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  const worksheetMajors = activeWorksheet?.majors ?? [];

  const degreeMajor: WorksheetMajor | null = useMemo(() => {
    return (
      worksheetMajors.find((m) => m.major_id === "general_degree") ?? null
    );
  }, [worksheetMajors]);

  const declaredMajors: WorksheetMajor[] = useMemo(() => {
    return worksheetMajors.filter(
      (m) => m.major_id !== "general_degree",
    );
  }, [worksheetMajors]);

  const activeMajor: WorksheetMajor | null = useMemo(() => {
    if (activeTab !== "major") return null;
    return declaredMajors[selectedMajorIndex] ?? null;
  }, [activeTab, selectedMajorIndex, declaredMajors]);

  // ---------- Audit ----------
  const runAudit = useCallback(
    async (mql: MQLQueryFile) => {
      if (!appData) return;
      setIsLoadingAudit(true);
      setAuditResult(null);
      try {
        const result = await apiRunAudit(
          uniqueCourses,
          appData.course_database.getAllCourses(),
          mql,
        );
        setAuditResult(result);
      } catch (e) {
        console.error("Audit failed:", e);
      } finally {
        setIsLoadingAudit(false);
      }
    },
    [uniqueCourses, appData],
  );

  // ---------- Load major data ----------
  const loadMajorData = useCallback(
    async (majorId: string) => {
      setIsLoadingMajor(true);
      setAuditResult(null);
      try {
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
        runAudit(mql);
      } catch (e) {
        console.error("Failed to load major data:", e);
        setActiveMqlData(null);
      } finally {
        setIsLoadingMajor(false);
      }
    },
    [majorInfoCache, mqlCache, runAudit],
  );

  const preloadMajorData = useCallback(
    async (majorId: string) => {
      try {
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
        /* silent fail */
      }
    },
    [majorInfoCache, mqlCache],
  );

  useEffect(() => {
    declaredMajors.forEach((m) => preloadMajorData(m.major_id));
    if (degreeMajor) preloadMajorData("general_degree");
  }, []);

  useEffect(() => {
    if (activeTab === "degree") {
      if (degreeMajor) loadMajorData("general_degree");
      else {
        setActiveMajorInfo(null);
        setActiveMqlData(null);
        setAuditResult(null);
      }
      return;
    }
    if (!activeMajor) {
      setActiveMajorInfo(null);
      setActiveMqlData(null);
      setAuditResult(null);
      return;
    }
    loadMajorData(activeMajor.major_id);
  }, [activeMajor?.major_id, activeTab, degreeMajor?.id]);

  // Re-run audit when worksheet courses change
  useEffect(() => {
    if (!activeMqlData) return;
    runAudit(activeMqlData);
  }, [activeWorksheetId, uniqueCourses.length]);

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
    if (declaredMajors.length <= 1) setActiveTab("degree");
  };

  const displayName = useMemo(() => {
    if (activeTab === "degree")
      return activeMajorInfo?.name ?? "General Degree Requirements";
    return activeMajorInfo?.name ?? activeMajor?.major_id ?? "";
  }, [activeTab, activeMajorInfo, activeMajor]);

  const auditProgramMetrics = useMemo(() => {
    if (!auditResult) return { completed: 0, total: 0, inProgress: 0 };
    const total = auditResult.per_requirement.length;
    const completed = auditResult.per_requirement.filter(
      (r) => r.satisfied,
    ).length;
    const inProgress = auditResult.per_requirement.filter(
      (r) => !r.satisfied && r.selected.length > 0,
    ).length;
    return { completed, total, inProgress };
  }, [auditResult]);

  return (
    <div className="h-[calc(100vh-5rem)] w-full flex flex-col bg-gray-50 p-6 gap-4 overflow-y-auto">
      {/* Widgets temporarily disabled
      <DashboardInsightGrid
        activeWorksheetId={activeWorksheetId}
        graduationCreditsRequired={graduationCreditsRequired}
        totalCredits={totalCredits}
        completedCredits={completedCredits}
        completedCourseCount={totalCompletedCourses}
        totalCourseCount={allStudentCourses.length}
        semesters={semesters}
        auditProgramMetrics={auditProgramMetrics}
        activeProgramName={displayName}
      />
      */}

      <section className="bg-white rounded-lg shadow p-4 w-full flex flex-col flex-1 min-h-[26rem]">
        <div className="flex flex-row items-center border-b mb-2">
          <div className="flex gap-4">
            <button
              className={`py-2 px-4 font-medium ${activeTab === "degree" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500"}`}
              onClick={() => setActiveTab("degree")}
            >
              Degree
            </button>
            <button
              className={`py-2 px-4 font-medium ${activeTab === "major" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500"} ${majorCount === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
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

          <div className="flex-1 flex justify-center items-center gap-4">
            {activeTab === "major" && majorCount > 1 && (
              <button
                onClick={() => setSelectedMajorIndex((i) => Math.max(0, i - 1))}
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
              {auditResult && !isLoadingAudit && (
                <span
                  className={`text-xs font-medium mt-0.5 px-2 py-0.5 rounded-full ${
                    auditProgramMetrics.completed === auditProgramMetrics.total
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {auditProgramMetrics.completed}/{auditProgramMetrics.total}{" "}
                  requirements satisfied
                </span>
              )}
              {isLoadingAudit && (
                <span className="text-xs text-gray-400 mt-0.5">
                  Running audit...
                </span>
              )}
            </div>

            {activeTab === "major" && majorCount > 1 && (
              <button
                onClick={() =>
                  setSelectedMajorIndex((i) => Math.min(majorCount - 1, i + 1))
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

        <div className="flex flex-row flex-1 gap-4 min-h-0 p-0 mt-2">
          <div className="flex flex-col w-[26rem] flex-shrink-0 h-full min-h-full bg-white border-gray-200 border-2 shadow overflow-hidden">
            {isLoadingMajor ? (
              <div className="text-gray-400 text-sm flex items-center justify-center flex-1">
                Loading requirements...
              </div>
            ) : activeMqlData ? (
              <MajorRequirementList
                mqlData={activeMqlData}
                auditResult={auditResult}
              />
            ) : (
              <div className="text-gray-400 text-sm flex items-center justify-center flex-1">
                No requirements available.
              </div>
            )}
          </div>

          <div className="flex flex-col flex-1 h-full min-h-0 bg-white border-gray-200 border-2 p-2 shadow overflow-hidden min-w-0">
            {isLoadingMajor ? (
              <div className="text-gray-400 text-sm flex items-center justify-center flex-1">
                Loading...
              </div>
            ) : activeMqlData ? (
              <MajorRequirementGraph
                mqlData={activeMqlData}
                auditResult={auditResult}
              />
            ) : (
              <div className="text-gray-400 text-sm flex items-center justify-center flex-1">
                No requirements available.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
