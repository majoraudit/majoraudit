import { calcTotalCredits, calcTotalCourses } from "@/utils/userDataHelpers";
import { formatC_P_UP } from "@/utils/formatHelpers";
import { removeMajor } from "../../utils/userDataHelpers";
import type { MajorProgress } from "../../types/type-program";

import { useUser } from "@/contexts/UserContext";
import { useApp } from "@/contexts/AppContext";

import MajorRequirementList from "./components/MajorRequirementList";
import MajorRequirementGraph from "./components/MajorRequirementGraph";

import checkIcon from "./assets/check.svg";
import trashcan from "./assets/trashcan.svg";

import { useMemo, useState, useEffect } from "react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

function Dashboard() {
  const { userData, setUserData } = useUser();
  const { appData } = useApp();
  const [activeTab, setActiveTab] = useState("degree");
  const [tabIndex, setTabIndex] = useState(0);
  const [selectedMajorIndex, setSelectedMajorIndex] = useState(0);
  const [selectedCertificateIndex, setSelectedCertificateIndex] = useState(0);

  const graduationCreditsRequired = 36;

  const worksheets = useMemo(
    () => userData?.FYP?.worksheets ?? [],
    [userData?.FYP?.worksheets]
  );

  const activeWorksheetId = useMemo(
    () => userData?.FYP?.activeWorksheetID ?? worksheets[0]?.id ?? "baseline",
    [userData?.FYP?.activeWorksheetID, worksheets]
  );

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

  const activeMajorProgress: MajorProgress[] = useMemo(() => {
    if (!userData) return [];
    const dP = userData.FYP.degreeProgress2.find(
      (w) => w.worksheetID === activeWorksheetId
    );
    return dP?.majors ?? [];
  }, [activeWorksheetId]);

  const totalCompletedCredits = useMemo(
    () => (userData ? calcTotalCredits(userData, true) : 0),
    [userData]
  );

  const totalPlannedCredits = useMemo(
    () => (userData ? calcTotalCredits(userData, false) : 0),
    [userData]
  );

  const totalCompletedCourses = useMemo(
    () => (userData ? calcTotalCourses(userData, true) : 0),
    [userData]
  );

  // Calculate counts
  const majorCount = userData?.FYP?.statCount?.majorNum ?? 0;
  const certificateCount = userData?.FYP?.statCount?.certificateNum ?? 0;

  // Helper functions for navigation
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);

    switch (tab) {
      case "degree":
        setTabIndex(0);
        break;
      case "major":
        if (majorCount > 0) {
          setTabIndex(1 + selectedMajorIndex);
        }
        break;
      case "certificate":
        if (certificateCount > 0) {
          setTabIndex(1 + majorCount + selectedCertificateIndex);
        }
        break;
    }
  };

  const handleMajorNavigation = (direction: "prev" | "next") => {
    if (direction === "prev" && selectedMajorIndex > 0) {
      const newIndex = selectedMajorIndex - 1;
      setSelectedMajorIndex(newIndex);
      setTabIndex(1 + newIndex);
    } else if (direction === "next" && selectedMajorIndex < majorCount - 1) {
      const newIndex = selectedMajorIndex + 1;
      setSelectedMajorIndex(newIndex);
      setTabIndex(1 + newIndex);
    }
  };

  const handleCertificateNavigation = (direction: "prev" | "next") => {
    if (direction === "prev" && selectedCertificateIndex > 0) {
      const newIndex = selectedCertificateIndex - 1;
      setSelectedCertificateIndex(newIndex);
      setTabIndex(1 + majorCount + newIndex);
    } else if (
      direction === "next" &&
      selectedCertificateIndex < certificateCount - 1
    ) {
      const newIndex = selectedCertificateIndex + 1;
      setSelectedCertificateIndex(newIndex);
      setTabIndex(1 + majorCount + newIndex);
    }
  };

  const handleRemoveMajor = () => {
    console.log("Removing major/certificate...");
    if (!userData || !activeMajorProgress[tabIndex]) return;

    // The program currently shown (major or certificate)
    const programToRemove = activeMajorProgress[tabIndex];
    console.log("To remove:", programToRemove);

    // Compute the next user snapshot after removal
    const nextUser = removeMajor(userData, programToRemove);

    // Updated counts after removal
    const nextMajorCount = nextUser.FYP?.statCount?.majorNum ?? 0;
    const nextCertCount = nextUser.FYP?.statCount?.certificateNum ?? 0;

    if (activeTab === "major") {
      if (nextMajorCount === 0) {
        // No majors left -> go to Degree
        setActiveTab("degree");
        setSelectedMajorIndex(0);
        setTabIndex(0);
      } else {
        // Show the previous major (index - 1), clamped
        const newMajorIdx = Math.max(0, selectedMajorIndex - 1);
        setSelectedMajorIndex(newMajorIdx);
        setTabIndex(1 + newMajorIdx);
      }
    } else if (activeTab === "certificate") {
      if (nextCertCount === 0) {
        // No certificates left -> go to Degree
        setActiveTab("degree");
        setSelectedCertificateIndex(0);
        setTabIndex(0);
      } else {
        // Show the previous certificate (index - 1), clamped
        const newCertIdx = Math.max(0, selectedCertificateIndex - 1);
        setSelectedCertificateIndex(newCertIdx);
        // Certificates start after Degree (0) + all majors
        setTabIndex(1 + nextMajorCount + newCertIdx);
      }
    } else {
      // Safety: on Degree tab, just keep degree selected
      setTabIndex(0);
    }

    // Finally commit the user update
    setUserData(nextUser);
  };

  useEffect(() => {
    if (
      userData?.FYP?.degreeProgress2 &&
      userData?.FYP?.worksheets &&
      appData?.major_processor
    ) {
      const updatedDegreeProgress2 = userData.FYP.degreeProgress2.map(
        (entry) => {
          const worksheet = userData.FYP.worksheets.find(
            (ws) => ws.id === entry.worksheetID
          );
          if (!worksheet) return entry;
          const updatedMajors = entry.majors
            .map((major) =>
              appData.major_processor.updateMajorProgress(major, worksheet)
            )
            .filter((m): m is MajorProgress => m !== undefined);

          return {
            ...entry,
            majors: updatedMajors,
          };
        }
      );

      setUserData({
        ...userData,
        FYP: {
          ...userData.FYP,
          degreeProgress2: updatedDegreeProgress2,
        },
      });
    }
  }, [userData?.FYP?.worksheets, appData?.major_processor, activeWorksheetId]);

  return (
    <>
      <div className=" h-[calc(100vh-5rem)] w-full flex flex-col bg-gray-50 p-6 gap-4 overflow-y-auto">
        {/* Header */}
        <header className="ml-2 flex gap-3 items-center">
          <h1 className="text-3xl font-bold text-gray-800">
            {userData?.first_name}'s Dashboard {/* get first name*/}
          </h1>
          <img src={checkIcon} alt="check icon" className="w-9 h-9" />
        </header>

        {/* Requirements Progress */}
        <section className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 w-full gap-4">
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
              graduationCreditsRequired -
                totalCompletedCredits -
                totalPlannedCredits
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-md font-semibold mb-2">
              Major Progress (Courses)
            </h3>

            <div className="mb-4 h-3 w-full flex overflow-hidden">
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
              graduationCreditsRequired -
                totalCompletedCredits -
                totalPlannedCredits
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
            <p className="text-3xl font-semibold">30</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-gray-500">Distributional Requirements</h2>
            <p className="text-3xl font-semibold">5 / 7</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-gray-500">Current GPA</h2>
            <p className="text-3xl font-semibold">3.8</p>
          </div>
        </section>

        {/* Major List and Major Graph container */}
        <section className="bg-white rounded-lg shadow p-4 w-full flex flex-col flex-1 min-h-[26rem]">
          <div className="flex flex-row items-center border-b mb-2">
            <div className="flex gap-4">
              <button
                className={`py-2 px-4 font-medium ${
                  activeTab === "degree"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-500"
                }`}
                onClick={() => handleTabChange("degree")}
              >
                Degree
              </button>
              <button
                className={`py-2 px-4 font-medium ${
                  activeTab === "major"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-500"
                } ${majorCount === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={() => majorCount > 0 && handleTabChange("major")}
                disabled={majorCount === 0}
              >
                Major{" "}
                {majorCount > 1 && `(${selectedMajorIndex + 1}/${majorCount})`}
              </button>
              <button
                className={`py-2 px-4 font-medium ${
                  activeTab === "certificate"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-500"
                } ${
                  certificateCount === 0 ? "opacity-50 cursor-not-allowed" : ""
                }`}
                onClick={() =>
                  certificateCount > 0 && handleTabChange("certificate")
                }
                disabled={certificateCount === 0}
              >
                Certificates{" "}
                {certificateCount > 1 &&
                  `(${selectedCertificateIndex + 1}/${certificateCount})`}
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
              {((activeTab === "major" && majorCount > 1) ||
                (activeTab === "certificate" && certificateCount > 1)) && (
                <button
                  onClick={() =>
                    activeTab === "major"
                      ? handleMajorNavigation("prev")
                      : handleCertificateNavigation("prev")
                  }
                  disabled={
                    (activeTab === "major" && selectedMajorIndex === 0) ||
                    (activeTab === "certificate" &&
                      selectedCertificateIndex === 0)
                  }
                  className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ←
                </button>
              )}

              {/* Program name */}
              <div>
                <span className="font-bold text-2xl">
                  {activeMajorProgress[tabIndex]?.name || "Loading..."}
                </span>
              </div>

              {/* Next button for majors/certificates */}
              {((activeTab === "major" && majorCount > 1) ||
                (activeTab === "certificate" && certificateCount > 1)) && (
                <button
                  onClick={() =>
                    activeTab === "major"
                      ? handleMajorNavigation("next")
                      : handleCertificateNavigation("next")
                  }
                  disabled={
                    (activeTab === "major" &&
                      selectedMajorIndex === majorCount - 1) ||
                    (activeTab === "certificate" &&
                      selectedCertificateIndex === certificateCount - 1)
                  }
                  className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  →
                </button>
              )}
            </div>

            {/* Trash only for majors/certificates */}
            {(activeTab === "major" || activeTab === "certificate") &&
              activeMajorProgress[tabIndex] && (
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
              {activeMajorProgress[tabIndex] ? (
                <MajorRequirementList
                  major_progress={activeMajorProgress[tabIndex]}
                />
              ) : (
                <div>Loading degree requirements...</div>
              )}
            </div>
            <div className="flex flex-col flex-1 h-full min-h-0 bg-white border-gray-200 border-2 p-2 shadow overflow-hidden min-w-0">
              {activeMajorProgress[tabIndex] ? (
                <MajorRequirementGraph
                  major_progress={activeMajorProgress[tabIndex]}
                />
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
