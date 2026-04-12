import type {
  MQLQueryFile,
  MQLRequirement,
  Quantity,
  Class,
  Selector,
} from "@/types/schema/mql/mql";
import type { AuditResult } from "@/api/majors";

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

interface RequirementColumnProps {
  req: MQLRequirement;
  auditReq?: AuditResult["per_requirement"][number];
}

function RequirementColumn({ req, auditReq }: RequirementColumnProps) {
  const slots = buildSlots(req);
  const quantityLabel = formatQuantity(req.query.quantity);
  const satisfied = auditReq?.satisfied;
  const selectedCourses = auditReq?.selected ?? [];

  const headerBg =
    auditReq === undefined
      ? "bg-gray-100 border-gray-200"
      : satisfied
        ? "bg-green-50 border-green-200"
        : "bg-red-50 border-red-200";

  return (
    <div
      className={`border-2 p-2 flex flex-col flex-1 min-h-0 min-w-48 ${headerBg}`}
    >
      <div className="font-medium mb-1 mt-1 shrink-0 flex items-center justify-center gap-1">
        {auditReq !== undefined && (
          <span
            className={`text-sm ${satisfied ? "text-green-600" : "text-red-500"}`}
          >
            {satisfied ? "✓" : "✗"}
          </span>
        )}
        <span className="truncate whitespace-nowrap overflow-hidden text-ellipsis max-w-[70%] text-center text-sm">
          {req.description}
        </span>
        <span className="text-gray-400 text-xs whitespace-nowrap">
          · {quantityLabel}
        </span>
      </div>

      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto gap-2">
        {slots.map((label, i) => {
          const fulfilledBy = selectedCourses[i]?.course_id;
          return (
            <div
              key={i}
              className={`h-20 p-2 m-1 rounded-md flex flex-col items-center justify-center flex-none border-2 text-xs text-center
                ${
                  fulfilledBy
                    ? "bg-green-100 border-green-300 text-green-800"
                    : auditReq !== undefined
                      ? "bg-red-50 border-dashed border-red-200 text-red-400"
                      : "bg-gray-200 border-dashed border-gray-300 text-gray-400"
                }`}
            >
              {fulfilledBy ? (
                <>
                  <span className="font-bold">{fulfilledBy}</span>
                  <span className="font-mono opacity-60 mt-0.5">{label}</span>
                </>
              ) : (
                <span className="font-mono">{label}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface MajorRequirementGraphProps {
  mqlData: MQLQueryFile;
  auditResult?: AuditResult | null;
}

function MajorRequirementGraph({
  mqlData,
  auditResult,
}: MajorRequirementGraphProps) {
  if (!mqlData?.requirements?.length) {
    return (
      <div className="flex items-center justify-center flex-1 text-gray-400 text-sm">
        No requirements available.
      </div>
    );
  }

  const auditByDescription = auditResult
    ? Object.fromEntries(
        auditResult.per_requirement.map((r) => [r.description, r]),
      )
    : {};

  return (
    <div className="flex flex-row items-stretch gap-2 w-full flex-1 min-h-0 overflow-x-auto">
      {mqlData.requirements.map((req, i) => (
        <RequirementColumn
          key={i}
          req={req}
          auditReq={auditByDescription[req.description]}
        />
      ))}
    </div>
  );
}

export default MajorRequirementGraph;
