import { formatC_P_UP } from "@/utils/formatHelpers";
import type { MajorProgress } from "../../types/type-program";

import { useUser } from "@/contexts/UserContext";

import MajorRequirementList from "./components/MajorRequirementList";
import MajorRequirementGraph from "./components/MajorRequirementGraph";
import DashboardInsightGrid from "./components/DashboardInsightGrid";

import checkIcon from "./assets/check.svg";
import trashcan from "./assets/trashcan.svg";

import { useMemo, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import { useWorksheetManager } from "@/hooks/useWorksheetManager";
import { useWorksheetActions } from "@/hooks/useWorksheetActions";
import { useWorksheetData } from "@/hooks/useWorksheetData";
import { useProgramNavigation } from "./hooks/useProgramNavigation";

import { apiFetchAudit, type MajorAudit } from "@/api/audit";
import { auditToMajorProgress } from "@/services/auditToMajorProgress";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

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

  // Solver-driven audit results, fetched from the backend whenever the
  // active worksheet or its courses change.
  const [audits, setAudits] = useState<MajorAudit[]>([]);

  const activeMajorProgress: MajorProgress[] = useMemo(() => {
    return audits
      .map((a) => auditToMajorProgress(a))
      .filter((m): m is MajorProgress => m !== null);
  }, [audits]);

  const totalCompletedCredits = completedCredits;

  const totalPlannedCredits = totalCredits - completedCredits;

  const totalCompletedCourses = completedCourseCount;
  const creditsRemaining = Math.max(
    0,
    graduationCreditsRequired - totalCompletedCredits - totalPlannedCredits,
  );

  const nav = useProgramNavigation({ majorCount, certificateCount });

  const activeProgram = useMemo(() => {
    if (nav.activeTab === "degree") return activeMajorProgress[0];
    return activeMajorProgress[nav.activeIndex] ?? null;
  }, [nav.activeTab, nav.activeIndex, activeMajorProgress]);

  const degreeProgram = useMemo(() => {
    return activeMajorProgress[0] ?? null;
  }, [activeMajorProgress]);

  const activeProgramCompletedGroups =
    activeProgram?.totalCompletedRequirementGroups ?? 0;
  const activeProgramInProgressGroups =
    activeProgram?.requirements.filter(
      (group) => !group.isCompleted && group.completedNum > 0,
    ).length ?? 0;
  const activeProgramRemainingGroups = Math.max(
    0,
    (activeProgram?.totalRequirementGroups ?? 0) -
      activeProgramCompletedGroups -
      activeProgramInProgressGroups,
  );

  // Resolve which raw audit corresponds to the currently visible program
  // (needed for remove, since `activeProgram` is a synthesized shim).
  const activeAudit = useMemo(() => {
    if (!activeProgram) return null;
    return (
      audits.find(
        (a) => `${a.major_id}_${a.degree_type}` === activeProgram.id,
      ) ?? null
    );
  }, [audits, activeProgram]);

  const handleRemoveMajor = async () => {
    if (!userData || !activeAudit) return;
    const res = await removeProgram(activeAudit.major_id, activeAudit.degree_type);
    if (!res.ok) return;
    nav.afterRemove({ majorCount, certificateCount });
  };

  // Fetch audit from the backend solver whenever the active worksheet or
  // its courses change. Replaces the legacy greedy MajorProcessor flow.
  useEffect(() => {
    if (!activeWorksheetId) {
      setAudits([]);
      return;
    }
    const wsId = Number(activeWorksheetId);
    if (Number.isNaN(wsId)) {
      setAudits([]);
      return;
    }
    let cancelled = false;
    apiFetchAudit(wsId)
      .then((result) => {
        if (!cancelled) setAudits(result);
      })
      .catch((e) => {
        console.error("audit fetch failed", e);
        if (!cancelled) setAudits([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeWorksheetId, userData?.FYP?.worksheets]);

  return (
    <>
      <div className=" h-[calc(100vh-5rem)] w-full flex flex-col bg-gray-50 p-6 gap-4 overflow-y-auto">
        {/* Requirements Progress */}
        {/*<section className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 w-full gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-md font-semibold mb-2">
              General Progress (Credits)
            </h3>

            <div className="mb-4 h-3 w-full flex overflow-hidden justify-center">
              <div
                style={{
                  width: `${
                    (totalCompletedCredits / graduationCreditsRequired) * 100
                  }%`,
                }}
                className="rounded-lg bg-green-700 transition-all duration-500 ease-out"
              />
              <div
                style={{
                  width: `${
                    (totalPlannedCredits / graduationCreditsRequired) * 100
                  }%`,
                }}
                className="rounded-lg bg-yellow-500 transition-all duration-500 ease-out"
              />
              <div
                style={{
                  width: `${
                    ((graduationCreditsRequired -
                      totalCompletedCredits -
                      totalPlannedCredits) /
                      graduationCreditsRequired) *
                    100
                  }%`,
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
            <h3 className="text-md font-semibold mb-2">Active Program Progress</h3>

            <div className="mb-4 h-3 w-full flex overflow-hidden">
              <div
                style={{
                  width: `${
                    activeProgram && activeProgram.totalRequirementGroups > 0
                      ? (activeProgramCompletedGroups /
                          activeProgram.totalRequirementGroups) *
                        100
                      : 0
                  }%`,
                }}
                className="rounded-lg bg-green-700 transition-all duration-500 ease-out"
              />
              <div
                style={{
                  width: `${
                    activeProgram && activeProgram.totalRequirementGroups > 0
                      ? (activeProgramInProgressGroups /
                          activeProgram.totalRequirementGroups) *
                        100
                      : 0
                  }%`,
                }}
                className="rounded-lg bg-yellow-500 transition-all duration-500 ease-out"
              />
              <div
                style={{
                  width: `${
                    activeProgram && activeProgram.totalRequirementGroups > 0
                      ? (activeProgramRemainingGroups /
                          activeProgram.totalRequirementGroups) *
                        100
                      : 100
                  }%`,
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
        </section>*/}

        <DashboardInsightGrid
          activeWorksheetId={activeWorksheetId}
          graduationCreditsRequired={graduationCreditsRequired}
          totalCredits={totalCredits}
          completedCredits={completedCredits}
          completedCourseCount={totalCompletedCourses}
          totalCourseCount={allStudentCourses.length}
          semesters={semesters}
          activeProgram={activeProgram}
          degreeProgram={degreeProgram}
        />

        {/* Major List and Major Graph container */}
        <section className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 w-full flex flex-col flex-1 min-h-[26rem]">
          <div className="flex flex-row items-center border-b mb-2">
            <div className="flex gap-4">
              <button
                className={`py-2 px-4 font-medium ${
                  nav.activeTab === "degree"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-500"
                }`}
                onClick={() => nav.goToTab("degree")}
              >
                Degree
              </button>
              <button
                className={`py-2 px-4 font-medium ${
                  nav.activeTab === "major"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-500"
                } ${majorCount === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={() => nav.goToTab("major")}
                disabled={majorCount === 0}
              >
                Major{" "}
                {majorCount > 1 &&
                  `(${nav.selectedMajorIndex + 1}/${majorCount})`}
              </button>
              <button
                className={`py-2 px-4 font-medium ${
                  nav.activeTab === "certificate"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-500"
                } ${
                  certificateCount === 0 ? "opacity-50 cursor-not-allowed" : ""
                }`}
                onClick={() => nav.goToTab("certificate")}
                disabled={certificateCount === 0}
              >
                Certificates{" "}
                {certificateCount > 1 &&
                  `(${nav.selectedCertificateIndex + 1}/${certificateCount})`}
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

            {/* Navigation and Title */}
            <div className="flex-1 flex justify-center items-center gap-4">
              {/* Previous button for majors/certificates */}
              {((nav.activeTab === "major" && majorCount > 1) ||
                (nav.activeTab === "certificate" && certificateCount > 1)) && (
                <button
                  onClick={() => nav.prev()}
                  disabled={
                    (nav.activeTab === "major" &&
                      nav.selectedMajorIndex === 0) ||
                    (nav.activeTab === "certificate" &&
                      nav.selectedCertificateIndex === 0)
                  }
                  className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ←
                </button>
              )}

              {/* Program name */}
              <div>
                <span className="font-bold text-2xl">
                  {activeProgram?.name || "Loading..."}
                </span>
              </div>

              {/* Next button for majors/certificates */}
              {((nav.activeTab === "major" && majorCount > 1) ||
                (nav.activeTab === "certificate" && certificateCount > 1)) && (
                <button
                  onClick={() => nav.next()}
                  disabled={
                    (nav.activeTab === "major" &&
                      nav.selectedMajorIndex === majorCount - 1) ||
                    (nav.activeTab === "certificate" &&
                      nav.selectedCertificateIndex === certificateCount - 1)
                  }
                  className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  →
                </button>
              )}
            </div>

            {/* Trash only for majors/certificates */}
            {(nav.activeTab === "major" || nav.activeTab === "certificate") &&
              activeProgram && (
                <div className="ml-auto py-2 px-4">
                  <button
                    onClick={handleRemoveMajor}
                    aria-label="Remove program"
                    title="Remove from worksheet"
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

          {/* NEW: List + Graph row */}
          <div className="flex flex-row flex-1 gap-4 min-h-0  p-0 mt-2">
            {/* LEFT: MajorRequirementList */}
            <div className="flex flex-col w-[26rem] flex-shrink-0 h-full min-h-full bg-white border-gray-200 border-2 shadow overflow-hidden">
              {activeProgram ? (
                <MajorRequirementList major_progress={activeProgram} />
              ) : (
                <div>Loading degree requirements...</div>
              )}
            </div>
            <div className="flex flex-col flex-1 h-full min-h-0 bg-white border-gray-200 border-2 p-2 shadow overflow-hidden min-w-0">
              {activeProgram ? (
                <MajorRequirementGraph major_progress={activeProgram} />
              ) : (
                <div>Loading degree requirements...</div>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

export default Dashboard;
