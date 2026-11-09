import { useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import type { Literal, MQLCondition, MQLPredicate, MQLSelector } from "@/types/schema/mql/mql";

const words = (value: string) => value.toLowerCase().replace(/_/g, " ");
function literal(value: Literal | Literal[]): string {
  if (Array.isArray(value)) return value.map((item) => literal(item)).join(", ");
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}
const fieldName = (field: { target: string; field: string }) => `${words(field.target)} · ${words(field.field)}`;

function ExpandableTab({ label, summary, tone = "slate", children }: { label: string; summary?: string; tone?: "blue" | "amber" | "violet" | "slate"; children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const tones = {
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    violet: "border-violet-200 bg-violet-50 text-violet-800",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  };
  return <div className="min-w-0">
    <button type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)} className={`flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left text-xs transition hover:brightness-[0.98] ${tones[tone]}`}>
      <ChevronRight aria-hidden="true" className={`h-3.5 w-3.5 shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} />
      <span className="rounded bg-white/80 px-1.5 py-0.5 font-mono font-semibold tracking-wide">{label}</span>
      {summary && <span className="min-w-0 truncate opacity-75">{summary}</span>}
    </button>
    {expanded && <div className="ml-3 mt-1.5 border-l border-slate-200 pl-3">{children}</div>}
  </div>;
}

function PredicateNode({ predicate }: { predicate: MQLPredicate }) {
  if ("operands" in predicate) return <ExpandableTab label={predicate.kind} summary={`${predicate.operands.length} ${predicate.operands.length === 1 ? "rule" : "rules"}`} tone={predicate.kind === "AND" ? "blue" : "amber"}><div className="flex flex-col gap-1.5">{predicate.operands.map((operand, index) => <PredicateNode key={index} predicate={operand} />)}</div></ExpandableTab>;
  if (predicate.kind === "NOT") return <ExpandableTab label="NOT" summary="negated rule" tone="violet"><PredicateNode predicate={predicate.operand} /></ExpandableTab>;
  if (predicate.kind === "COMPARE") return <ExpandableTab label={predicate.operator} summary={`${fieldName(predicate.field)} · ${literal(predicate.value)}`}><dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 py-1 text-xs text-slate-600"><dt className="font-medium text-slate-400">Field</dt><dd>{fieldName(predicate.field)}</dd><dt className="font-medium text-slate-400">Operation</dt><dd>{words(predicate.operator)}</dd><dt className="font-medium text-slate-400">Value</dt><dd className="font-mono">{literal(predicate.value)}</dd></dl></ExpandableTab>;
  return <ExpandableTab label={predicate.kind} summary={fieldName(predicate.field)}><p className="py-1 text-xs text-slate-600">{fieldName(predicate.field)}</p></ExpandableTab>;
}

function ConditionNode({ condition }: { condition: MQLCondition }) {
  if ("operands" in condition) return <ExpandableTab label={condition.kind} summary={`${condition.operands.length} conditions`} tone={condition.kind === "AND" ? "blue" : "amber"}><div className="flex flex-col gap-1.5">{condition.operands.map((operand, index) => <ConditionNode key={index} condition={operand} />)}</div></ExpandableTab>;
  if (condition.kind === "NOT") return <ExpandableTab label="NOT" tone="violet"><ConditionNode condition={condition.operand} /></ExpandableTab>;
  if (condition.kind === "CHOICE_EQUALS") return <ExpandableTab label="EQ" summary={`${condition.choice_id} · ${literal(condition.equals)}`}><p className="py-1 text-xs text-slate-600">Choice <span className="font-mono">{condition.choice_id}</span> equals <span className="font-mono">{literal(condition.equals)}</span></p></ExpandableTab>;
  if (condition.kind === "FACT_PRESENT") return <ExpandableTab label="FACT" summary={condition.fact_id}><p className="py-1 text-xs text-slate-600">Fact <span className="font-mono">{condition.fact_id}</span> is present.</p></ExpandableTab>;
  return <span className="text-xs text-slate-500">Always {condition.value ? "active" : "inactive"}</span>;
}

export function RequirementExpression({ selector }: { selector: MQLSelector }) {
  if (selector.kind === "PREDICATE") return <PredicateNode predicate={selector.predicate} />;
  const values = selector.kind === "COURSE_LIST" ? selector.canonical_course_ids : selector.child_ids;
  return <ExpandableTab label={selector.kind === "COURSE_LIST" ? "COURSES" : "CHILDREN"} summary={`${values.length} ${values.length === 1 ? "option" : "options"}`} tone="blue"><div className="flex flex-wrap gap-1.5 py-1">{values.map((value) => <span key={value} className="rounded border border-slate-200 bg-white px-2 py-1 font-mono text-xs text-slate-700">{value}</span>)}</div></ExpandableTab>;
}

export function ActivationExpression({ condition }: { condition: MQLCondition }) { return <ConditionNode condition={condition} />; }
