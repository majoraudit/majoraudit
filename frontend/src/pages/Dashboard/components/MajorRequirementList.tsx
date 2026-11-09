import type {
  MQLQueryFile,
  MQLRequirement,
  Quantity,
  Class,
  Selector,
} from "@/types/schema/mql/mql";
import type { AuditResult } from "@/api/majors";
import { useState } from "react";
import { RequirementExpression } from "@/components/requirements/RequirementExpression";
import { groupRequirements } from "@/utils/groupRequirements";

function formatClass(cls: Class): string {
  return `${cls.department_id} ${cls.course_number}${cls.lab ? " (Lab)" : ""}`;
}

function formatQuantity(q: Quantity): string {
  if ("Single" in q) return `${q.Single} course${q.Single !== 1 ? "s" : ""}`;
  return `${q.Many.from}–${q.Many.to} courses`;
}

function formatSelector(sel: Selector): string {
  if ("Class" in sel) return formatClass(sel.Class);
  if ("Placement" in sel) return sel.Placement;
  if ("Tag" in sel) return `Tag: ${sel.Tag}`;
  if ("TagCode" in sel) return `${sel.TagCode.tag}: ${sel.TagCode.code}`;
  if ("Dist" in sel) return `Dist: ${sel.Dist}`;
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

function buildSlots(req: MQLRequirement): string[] {
  if (!req.query) {
    const count = req.lower?.kind === "FIXED" ? Math.max(1, Math.min(req.lower.value, 12)) : 1;
    const label = req.selector?.kind === "COURSE_LIST"
      ? req.selector.canonical_course_ids.join(" or ")
      : req.selector?.kind === "CHILD_REQUIREMENTS"
        ? "Satisfied child requirement"
        : "Matches eligibility rules";
    return Array.from({ length: count }, () => label);
  }
  const count =
    "Single" in req.query.quantity
      ? req.query.quantity.Single
      : req.query.quantity.Many.from;
  const selectors = req.query.selector;
  const slots: string[] = [];
  for (let i = 0; i < count; i++) {
    const sel = selectors[i] ?? selectors[selectors.length - 1];
    slots.push(sel ? formatSelector(sel) : "Any course");
  }
  return slots;
}

interface RequirementDetailProps {
  req: MQLRequirement;
  auditReq?: AuditResult["per_requirement"][number];
}

function RequirementDetail({ req, auditReq }: RequirementDetailProps) {
  const slots = buildSlots(req);
  const selectedCourses = auditReq?.selected ?? [];

  return (
    <div className="p-2 mt-2">
      <div className="space-y-3">
        {req.selector && <RequirementExpression selector={req.selector} />}
        {slots.map((label, i) => {
          const fulfilledBy = selectedCourses[i]?.course_id;
          const isEvaluated = auditReq !== undefined;

          return (
            <div key={i} className="relative">
              <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-300" />
              <div className="ml-6 bg-white border border-gray-200 rounded-lg p-4 pt-3 shadow-sm relative">
                <div className="mb-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Requirement {i + 1}
                  </span>
                  <div className="text-sm text-gray-700 mt-1 flex items-center font-mono">
                    <span className="w-2 h-2 bg-gray-400 rounded-full mr-2 flex-shrink-0" />
                    {label}
                  </div>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Status
                  </span>
                  <div className="text-sm mt-1 flex items-center">
                    {!isEvaluated ? (
                      <>
                        <span className="w-2 h-2 rounded-full mr-2 flex-shrink-0 bg-gray-300" />
                        <span className="text-gray-400">Not yet evaluated</span>
                      </>
                    ) : fulfilledBy ? (
                      <>
                        <span className="w-2 h-2 rounded-full mr-2 flex-shrink-0 bg-green-500" />
                        <span className="text-green-700 font-medium">
                          Fulfilled by {fulfilledBy}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full mr-2 flex-shrink-0 bg-red-400" />
                        <span className="text-red-500">Not fulfilled</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const courseLabel = (courseId: string) => courseId.replace(/^([A-Z&]+)(\d)/, "$1 $2");

function ChoiceRequirementDetail({ branches, auditById }: { branches: MQLRequirement[]; auditById: Record<string, AuditResult["per_requirement"][number]> }) {
  return <div className="space-y-2 px-4 py-3">
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Complete either path</p>
    {branches.map((branch, branchIndex) => {
      const audit = auditById[branch.requirement_id ?? branch.meta?.id ?? ""];
      const courses = branch.selector?.kind === "COURSE_LIST" ? branch.selector.canonical_course_ids : [];
      const required = branch.lower?.kind === "FIXED" ? branch.lower.value : 1;
      return <div key={branch.requirement_id ?? branch.meta?.id}>
        {branchIndex > 0 && <div className="my-2 flex items-center gap-2"><span className="h-px flex-1 bg-gray-200" /><span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">OR</span><span className="h-px flex-1 bg-gray-200" /></div>}
        <div className={`rounded-lg border p-3 ${audit?.active ? "border-blue-300 bg-blue-50/50" : "border-gray-200 bg-white"}`}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-gray-800">{branch.meta?.description ?? branch.description}</span>
            {audit?.active && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700">Selected path</span>}
          </div>
          {courses.length > 0 ? <div className="flex flex-wrap items-center gap-2">{courses.map((course, index) => <div key={course} className="contents">
            {index > 0 && <span className={`text-[11px] font-bold ${required >= courses.length ? "text-blue-600" : "text-amber-600"}`}>{required >= courses.length ? "AND" : "OR"}</span>}
            <span className={`rounded-md border px-2.5 py-1.5 font-mono text-xs font-semibold ${audit?.selected.some((selected) => selected.course_id.replace(/\s/g, "") === course.replace(/\s/g, "")) ? "border-green-300 bg-green-50 text-green-700" : "border-gray-200 bg-gray-50 text-gray-700"}`}>{courseLabel(course)}</span>
          </div>)}</div> : branch.selector && <RequirementExpression selector={branch.selector} />}
        </div>
      </div>;
    })}
  </div>;
}

interface MajorRequirementListProps {
  mqlData: MQLQueryFile;
  auditResult?: AuditResult | null;
}

function MajorRequirementList({
  mqlData,
  auditResult,
}: MajorRequirementListProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<
    "requirements" | "progress" | "reminders"
  >("requirements");

  if (!mqlData?.requirements?.length) {
    return (
      <div className="flex items-center justify-center flex-1 text-gray-400 text-sm p-4">
        No requirements available.
      </div>
    );
  }

  const auditById = auditResult
    ? Object.fromEntries(
        auditResult.per_requirement.map((r) => [r.requirement_id, r]),
      )
    : {};
  const displayItems = groupRequirements(mqlData.requirements, mqlData.choices);

  const tabs = [
    { id: "requirements" as const, label: "Requirements" },
    { id: "progress" as const, label: "Progress" },
    { id: "reminders" as const, label: "Reminders" },
  ];

  return (
    <>
      <div className="flex border-b border-gray-200 bg-gray-50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setExpandedIndex(null);
            }}
            className={`flex-1 px-3 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "text-brand-blue border-b-2 border-brand-blue bg-white"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === "requirements" && (
          <ul className="flex-1 overflow-y-auto p-2">
            {displayItems.map((item, index) => {
              const req = item.kind === "requirement" ? item.requirement : item.branches[0];
              const isExpanded = expandedIndex === index;
              const quantityLabel = req.query
                ? formatQuantity(req.query.quantity)
                : req.lower?.kind === "FIXED"
                  ? `${req.lower.value} ${req.contribution?.unit?.toLowerCase().replace(/_/g, " ") ?? "items"}`
                  : "Varies by choice";
              const count = req.query
                ? "Single" in req.query.quantity ? req.query.quantity.Single : req.query.quantity.Many.from
                : req.lower?.kind === "FIXED" ? req.lower.value : 1;
              const branchAudits = item.kind === "choice" ? item.branches.map((branch) => auditById[branch.requirement_id ?? branch.meta?.id ?? ""]).filter(Boolean) : [];
              const auditReq = item.kind === "requirement" ? auditById[req.requirement_id ?? req.meta?.id ?? ""] : branchAudits.find((audit) => audit.active) ?? branchAudits.find((audit) => audit.satisfied);
              const satisfied = item.kind === "choice" ? branchAudits.some((audit) => audit.active && audit.satisfied) : auditReq?.satisfied;
              const isEvaluated = item.kind === "choice" ? branchAudits.length > 0 : auditReq !== undefined;

              const rowBg = !isEvaluated
                ? "bg-gray-100 border-gray-200"
                : satisfied
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200";

              return (
                <li key={item.id} className="m-2">
                  <div
                    className={`border-2 rounded-md cursor-pointer transition-colors p-2 ${rowBg} hover:opacity-80`}
                    onClick={() => setExpandedIndex(isExpanded ? null : index)}
                  >
                    <div className="flex flex-row gap-3 items-start w-full">
                      <div
                        className={`w-6 h-6 border-2 rounded-sm mt-1 ml-1 shrink-0 flex justify-center items-center text-xs font-bold
                          ${
                            isEvaluated
                              ? satisfied
                                ? "border-green-500 text-green-600 bg-white"
                                : "border-red-400 text-red-500 bg-white"
                              : "border-gray-400 text-gray-600 bg-white"
                          }`}
                      >
                        {isEvaluated ? (satisfied ? "✓" : "✗") : count}
                      </div>

                      <div className="flex flex-col flex-grow">
                        <span className="font-medium text-sm">
                          {item.kind === "choice" ? item.description : req.meta?.description ?? req.description ?? req.meta?.id ?? "Requirement"}
                        </span>
                        <span className="text-xs text-gray-500">
                          {item.kind === "choice" ? `${item.branches.length} alternative paths` : quantityLabel}
                        </span>
                        {auditReq && auditReq.selected.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {auditReq.selected.map((s, i) => (
                              <span
                                key={i}
                                className="text-xs bg-white border border-green-300 rounded px-1.5 py-0.5 text-green-700 font-medium"
                              >
                                {s.course_id}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div
                        className="text-gray-500 transition-transform duration-200 mt-1"
                        style={{
                          transform: isExpanded
                            ? "rotate(180deg)"
                            : "rotate(0deg)",
                        }}
                      >
                        ▼
                      </div>
                    </div>
                  </div>

                  {isExpanded && <div className="transition-all duration-300 ease-in-out">{item.kind === "choice"
                    ? <ChoiceRequirementDetail branches={item.branches} auditById={auditById} />
                    : <RequirementDetail req={req} auditReq={auditReq} />}</div>}
                </li>
              );
            })}
          </ul>
        )}

        {activeTab === "progress" && (
          <div className="p-4 text-center text-gray-400 text-sm flex-1 flex items-center justify-center">
            {auditResult ? (
              <div className="flex flex-col gap-2 w-full">
                <div className="text-2xl font-bold text-gray-700">
                  {
                    auditResult.per_requirement.filter((r) => r.satisfied)
                      .length
                  }
                  <span className="text-gray-400 font-normal text-lg">
                    /{auditResult.per_requirement.length}
                  </span>
                </div>
                <p className="text-sm text-gray-500">requirements satisfied</p>
                <div className="h-3 w-full rounded-full bg-gray-200 overflow-hidden mt-2">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${(auditResult.per_requirement.filter((r) => r.satisfied).length / auditResult.per_requirement.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ) : (
              "Run audit to see progress."
            )}
          </div>
        )}

        {activeTab === "reminders" && (
          <div className="p-4 text-center text-gray-400 text-sm flex-1 flex items-center justify-center">
            Reminders coming soon.
          </div>
        )}
      </div>
    </>
  );
}

export default MajorRequirementList;
