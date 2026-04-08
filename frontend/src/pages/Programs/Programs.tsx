import { useUser } from "@/contexts/UserContext";
import { useApp } from "@/contexts/AppContext";

import bookIcon from "./assets/book.svg";

import { useWorksheetManager } from "@/hooks/useWorksheetManager";
import { useWorksheetActions } from "@/hooks/useWorksheetActions";
import { useWorksheetData } from "@/hooks/useWorksheetData";

import { useState, useEffect, useMemo, useCallback } from "react";
import SidebarLayout from "@/components/shared-components/SidebarLayout";

import { useAuth } from "@/contexts/AuthContext";
import {
  apiFetchMajorTemplate,
  apiFetchMajorMQL,
  apiRunAudit,
} from "@/api/majors";
import type { AuditResult, SelectedCourse } from "@/api/majors";

import type {
  MQLQueryFile,
  MQLRequirement,
  Quantity,
  Class,
  Selector,
} from "@/types/schema/mql/mql";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import { Plus, Check } from "lucide-react";

// ---------- Formatters ----------

function formatClass(cls: Class): string {
  return `${cls.department_id} ${cls.course_number}${cls.lab ? " (Lab)" : ""}`;
}

function formatQuantity(q: Quantity): string {
  if ("Single" in q) return `${q.Single} course${q.Single !== 1 ? "s" : ""}`;
  return `${q.Many.from}–${q.Many.to} courses`;
}

function formatSelector(sel: Selector): string {
  if ("Class" in sel) return formatClass(sel.Class);
  if ("Placement" in sel) return `Placement: ${sel.Placement}`;
  if ("Tag" in sel) return `Tag: ${sel.Tag}`;
  if ("TagCode" in sel) return `${sel.TagCode.tag}: ${sel.TagCode.code}`;
  if ("Dist" in sel) return `Distribution: ${sel.Dist}`;
  if ("DistCode" in sel) return `${sel.DistCode.dist}: ${sel.DistCode.code}`;
  if ("Range" in sel)
    return `${formatClass(sel.Range.from)} – ${formatClass(sel.Range.to)}`;
  if ("RangeDist" in sel)
    return `${formatClass(sel.RangeDist.from)} – ${formatClass(sel.RangeDist.to)} (${sel.RangeDist.dist})`;
  if ("RangeTag" in sel)
    return `${formatClass(sel.RangeTag.from)} – ${formatClass(sel.RangeTag.to)} [${sel.RangeTag.tag}]`;
  if ("Query" in sel) {
    const inner = sel.Query;
    return `${formatQuantity(inner.quantity)} from: ${inner.selector.map(formatSelector).join(" or ")}`;
  }
  return "";
}

function specializationLabel(
  specializationFile: string,
  majorId: string,
): string {
  const withoutMajor = specializationFile
    .replace(`${majorId}_`, "")
    .replace(".mql", "");
  return withoutMajor
    .split("_")
    .map((s) => s.toUpperCase())
    .join("/");
}

// ---------- Major info shape ----------

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

// ---------- Requirement card with audit ----------

function SelectorItem({ sel }: { sel: Selector }) {
  if ("Query" in sel) {
    const inner = sel.Query;
    return (
      <li className="text-xs text-gray-700 bg-white border border-gray-200 rounded px-2 py-1">
        <span className="font-medium text-blue-700">
          {formatQuantity(inner.quantity)} from:
        </span>
        <ul className="mt-1 ml-3 flex flex-col gap-1">
          {inner.selector.map((s, k) => (
            <SelectorItem key={k} sel={s} />
          ))}
        </ul>
      </li>
    );
  }
  return (
    <li className="text-xs text-gray-700 bg-white border border-gray-200 rounded px-2 py-1 font-mono">
      {formatSelector(sel)}
    </li>
  );
}

interface RequirementCardProps {
  req: MQLRequirement;
  auditReq?: AuditResult["per_requirement"][number];
}

function RequirementCard({ req, auditReq }: RequirementCardProps) {
  const quantityLabel = formatQuantity(req.query.quantity);
  const isLimit = req.query.type === "Limit";
  const satisfied = auditReq?.satisfied;
  const selectedCourses = auditReq?.selected ?? [];

  return (
    <div
      className={`border rounded-lg p-4 flex flex-col gap-2 ${
        auditReq === undefined
          ? "border-gray-200 bg-gray-50"
          : satisfied
            ? "border-green-200 bg-green-50"
            : "border-red-200 bg-red-50"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {auditReq !== undefined && (
            <span
              className={`text-sm ${satisfied ? "text-green-600" : "text-red-500"}`}
            >
              {satisfied ? "✓" : "✗"}
            </span>
          )}
          <p className="font-semibold text-gray-800 text-sm">
            {req.description}
          </p>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
            isLimit
              ? "bg-orange-100 text-orange-700"
              : "bg-blue-100 text-blue-700"
          }`}
        >
          {isLimit ? "Limit" : "Select"} · {quantityLabel}
        </span>
      </div>

      {/* Show fulfilled courses if audit ran */}
      {auditReq !== undefined && selectedCourses.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {selectedCourses.map((s, i) => (
            <span
              key={i}
              className="text-xs bg-white border border-green-200 rounded px-2 py-0.5 text-green-700 font-medium"
            >
              {s.course_id}
            </span>
          ))}
        </div>
      )}

      {/* Show selectors if not yet audited or not satisfied */}
      {(auditReq === undefined || !satisfied) && (
        <ul className="flex flex-col gap-1">
          {req.query.selector.map((sel, j) => (
            <SelectorItem key={j} sel={sel} />
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------- Main component ----------

function Programs() {
  const { userData, setUserData } = useUser();
  const { appData } = useApp();
  const { isAuthenticated } = useAuth();
  const { worksheets, activeWorksheetId, activeWorksheet } =
    useWorksheetManager();
  const { addProgram } = useWorksheetActions();
  const { uniqueCourses } = useWorksheetData();

  const [selectedMajorInfo, setSelectedMajorInfo] = useState<MajorInfo | null>(
    null,
  );
  const [selectedSpecialization, setSelectedSpecialization] = useState<
    string | null
  >(null);
  const [templateCache, setTemplateCache] = useState<Record<string, MajorInfo>>(
    {},
  );
  const [mqlCache, setMqlCache] = useState<Record<string, MQLQueryFile>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [mqlData, setMqlData] = useState<MQLQueryFile | null>(null);
  const [isLoadingMQL, setIsLoadingMQL] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  const sortedMajors = useMemo(() => {
    if (!appData?.major_templates) return [];
    return [...appData.major_templates].sort((a, b) =>
      a.name.localeCompare(b.name, "en", { sensitivity: "base" }),
    );
  }, [appData?.major_templates]);

  const filteredMajors = useMemo(() => {
    if (!searchTerm.trim()) return sortedMajors;
    const normalized = searchTerm.toLowerCase();
    return sortedMajors.filter(
      (m) =>
        m.name.toLowerCase().includes(normalized) ||
        m.id.toLowerCase().includes(normalized),
    );
  }, [sortedMajors, searchTerm]);

  const runAudit = useCallback(
    async (majorId: string, specialization: string, mql: MQLQueryFile) => {
      setIsLoadingAudit(true);
      setAuditResult(null);
      try {
        const result = await apiRunAudit(
          majorId,
          specialization,
          uniqueCourses,
          mql,
        );
        setAuditResult(result);
      } catch (e) {
        console.error("Audit failed:", e);
      } finally {
        setIsLoadingAudit(false);
      }
    },
    [uniqueCourses],
  );

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

  const majorExists = useMemo(() => {
    if (!userData || !selectedMajorInfo || !selectedSpecialization)
      return false;
    return (userData.FYP.majors ?? []).some(
      (m) =>
        m.major_id === selectedMajorInfo.id &&
        m.specialization === selectedSpecialization.replace(".mql", ""),
    );
  }, [userData?.FYP.majors, selectedMajorInfo?.id, selectedSpecialization]);

  const handleAddMajor = async () => {
    if (!selectedMajorInfo || !selectedSpecialization) return;
    await addProgram(
      selectedMajorInfo.id,
      selectedSpecialization.replace(".mql", ""),
    );
  };

  // Fetch MQL whenever major or specialization changes
  useEffect(() => {
    if (!selectedMajorInfo || !selectedSpecialization) {
      setMqlData(null);
      setAuditResult(null);
      return;
    }

    const specName = selectedSpecialization.replace(".mql", "");
    const cacheKey = `${selectedMajorInfo.id}/${specName}`;

    if (mqlCache[cacheKey]) {
      setMqlData(mqlCache[cacheKey]);
      runAudit(selectedMajorInfo.id, specName, mqlCache[cacheKey]); // ← add this
    } else {
      setIsLoadingMQL(true);
      apiFetchMajorMQL(selectedMajorInfo.id, specName)
        .then((d) => {
          const parsed = typeof d === "string" ? JSON.parse(d) : d;
          setMqlCache((prev) => ({ ...prev, [cacheKey]: parsed }));
          setMqlData(parsed);
          runAudit(selectedMajorInfo.id, specName, parsed); // ← pass parsed MQL
        })
        .catch((e) => {
          console.error("Failed to fetch MQL:", e);
          setMqlData(null);
        })
        .finally(() => setIsLoadingMQL(false));
    }

    // Run audit whenever major/specialization changes
  }, [selectedMajorInfo?.id, selectedSpecialization]);

  // Re-run audit when worksheet courses change
  useEffect(() => {
    if (!selectedMajorInfo || !selectedSpecialization || !mqlData) return;
    const specName = selectedSpecialization.replace(".mql", "");
    runAudit(selectedMajorInfo.id, specName, mqlData);
  }, [activeWorksheetId, uniqueCourses.length]);

  // Load first major by default
  useEffect(() => {
    if (!appData || sortedMajors.length === 0 || selectedMajorInfo) return;
    handleSelectMajor(sortedMajors[0].id);
  }, [appData, sortedMajors]);

  const setActiveWorksheet = (id: string | null) => {
    if (!userData) return;
    setUserData({
      ...userData,
      FYP: { ...userData.FYP, activeWorksheetID: id ?? "" },
    });
  };

  // Map audit results by description for quick lookup
  const auditByDescription = useMemo(() => {
    if (!auditResult) return {};
    return Object.fromEntries(
      auditResult.per_requirement.map((r) => [r.description, r]),
    );
  }, [auditResult]);

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
                  className={`absolute top-6 right-6 rounded-full w-8 h-8 flex items-center justify-center text-center text-xl leading-none z-10 transition duration-300 ease-in-out
                    ${
                      majorExists
                        ? "bg-green-500 text-white cursor-default"
                        : "bg-brand-blue text-white hover:scale-110 cursor-pointer"
                    }`}
                  aria-label={majorExists ? "Added" : "Add"}
                  title={majorExists ? "Already added" : "Add major"}
                  onClick={handleAddMajor}
                  disabled={majorExists}
                >
                  {majorExists ? <Check size={18} /> : <Plus size={18} />}
                </button>
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
                            ${isActive ? "bg-brand-blue text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
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

            {/* Right Panel — Requirements + Audit */}
            <section className="min-w-0 min-h-screen flex flex-col bg-white p-6 border-2 border-gray-200 rounded-xl shadow-md">
              <div className="flex justify-between gap-4 items-center mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-gray-800">
                    Requirements
                  </h2>
                  {/* Audit summary */}
                  {auditResult && (
                    <span
                      className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                        auditResult.total_satisfied ===
                        auditResult.per_requirement.length
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {auditResult.total_satisfied}/
                      {auditResult.per_requirement.length} satisfied
                    </span>
                  )}
                  {isLoadingAudit && (
                    <span className="text-xs text-gray-400">
                      Running audit...
                    </span>
                  )}
                </div>

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
                        className={`text-sm cursor-pointer ${w.id === activeWorksheetId ? "bg-gray-100 font-medium" : ""}`}
                        onClick={() => setActiveWorksheet(w.id)}
                      >
                        <span className="truncate block">{w.name}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {isLoadingMQL ? (
                <div className="flex items-center justify-center flex-1 text-gray-400 text-sm">
                  Loading requirements...
                </div>
              ) : !mqlData ? (
                <div className="flex items-center justify-center flex-1 text-gray-400 text-sm">
                  No requirements available.
                </div>
              ) : (
                <div className="flex flex-col gap-3 overflow-y-auto">
                  {mqlData.requirements.map((req, i) => (
                    <RequirementCard
                      key={i}
                      req={req}
                      auditReq={auditByDescription[req.description]}
                    />
                  ))}
                </div>
              )}
            </section>
          </main>
        )}
      </div>
    </SidebarLayout>
  );
}

export default Programs;
