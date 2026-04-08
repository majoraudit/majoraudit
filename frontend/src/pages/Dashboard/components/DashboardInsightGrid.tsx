import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { StudentSemester } from "@/types/type-user";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertTriangle, GraduationCap, Sparkles } from "lucide-react";

export type DashboardWidgetId =
  | "risk-status"
  | "next-recommendation"
  | "progress-velocity"
  | "flexibility-meter"
  | "credits-progress"
  | "program-progress"
  | "courses-completed"
  | "credits-remaining"
  | "gpa-overview";

type AuditProgramMetrics = {
  completed: number;
  total: number;
  inProgress: number;
};

type DashboardInsightGridProps = {
  activeWorksheetId: string | null;
  graduationCreditsRequired: number;
  totalCredits: number;
  completedCredits: number;
  completedCourseCount: number;
  totalCourseCount: number;
  semesters: StudentSemester[];
  auditProgramMetrics?: AuditProgramMetrics;
  activeProgramName?: string;
};

type DashboardMetrics = {
  graduationCreditsRequired: number;
  completedCredits: number;
  plannedCredits: number;
  creditsRemaining: number;
  completedCreditRatio: number;
  programCompletionRatio: number;
  completedCourseCount: number;
  plannedCourseCount: number;
  totalCourseCount: number;
  averageCreditsPerCompletedSemester: number;
  targetCreditsPerSemester: number;
  recentSemesterCredits: Array<{
    key: string;
    shortLabel: string;
    credits: number;
    isCompleted: boolean;
  }>;
  riskLevel: "on-track" | "at-risk" | "off-track";
  riskHeadline: string;
  riskDetail: string;
  activeProgramName: string;
  activeProgramCompletedGroups: number;
  activeProgramTotalGroups: number;
  activeProgramInProgressGroups: number;
};

type WidgetDefinition = {
  id: DashboardWidgetId;
  label: string;
  description: string;
  render: (metrics: DashboardMetrics) => ReactNode;
};

const WIDGET_STORAGE_KEY = "dashboard-insight-slots-v2";

const DEFAULT_WIDGETS: DashboardWidgetId[] = [
  "risk-status",
  "progress-velocity",
  "credits-progress",
  "program-progress",
];

function clampPercentage(value: number) {
  return Math.max(0, Math.min(100, value));
}

function getWidgetSelections(): Record<string, DashboardWidgetId[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(WIDGET_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, DashboardWidgetId[]>;
  } catch {
    return {};
  }
}

function getSlotWidgets(
  widgetSelections: Record<string, DashboardWidgetId[]>,
  worksheetId: string | null,
) {
  const selectedWidgets = worksheetId
    ? widgetSelections[worksheetId]
    : undefined;
  const fallbackWidgets = [...DEFAULT_WIDGETS];
  if (!selectedWidgets || selectedWidgets.length === 0) return fallbackWidgets;
  return fallbackWidgets.map((d, i) => selectedWidgets[i] ?? d);
}

function getShortSemesterLabel(label: string) {
  if (!label) return "Term";
  const [first] = label.split(" ");
  if (!first) return "Term";
  return first.slice(0, 3);
}

function computeMetrics({
  graduationCreditsRequired,
  totalCredits,
  completedCredits,
  completedCourseCount,
  totalCourseCount,
  semesters,
  auditProgramMetrics,
  activeProgramName,
}: Omit<DashboardInsightGridProps, "activeWorksheetId">): DashboardMetrics {
  const plannedCredits = Math.max(0, totalCredits - completedCredits);
  const creditsRemaining = Math.max(
    0,
    graduationCreditsRequired - totalCredits,
  );
  const completedCreditRatio =
    graduationCreditsRequired > 0
      ? completedCredits / graduationCreditsRequired
      : 0;
  const plannedCourseCount = Math.max(
    0,
    totalCourseCount - completedCourseCount,
  );

  const completedSemesters = semesters.filter((s) => s.isCompleted);
  const targetCreditsPerSemester = graduationCreditsRequired / 8;
  const averageCreditsPerCompletedSemester =
    completedSemesters.length > 0
      ? completedCredits / completedSemesters.length
      : 0;

  const recentSemesterCredits = semesters.slice(-6).map((semester) => ({
    key: `${semester.season}`,
    shortLabel: getShortSemesterLabel(semester.title),
    credits: semester.studentCourses.reduce(
      (total, sc) => total + Number(sc.course?.credit ?? 0),
      0,
    ),
    isCompleted: semester.isCompleted,
  }));

  const expectedCompletionRatio =
    completedSemesters.length > 0 ? completedSemesters.length / 8 : 0;
  const creditGap = completedCreditRatio - expectedCompletionRatio;

  let riskLevel: DashboardMetrics["riskLevel"] = "on-track";
  let riskHeadline = "Your current pace is healthy";

  if (creditsRemaining === 0) {
    riskHeadline = "Credit goal reached";
  } else if (creditGap <= -0.18 || averageCreditsPerCompletedSemester < 3.5) {
    riskLevel = "off-track";
    riskHeadline = "Your pace needs intervention";
  } else if (
    creditGap <= -0.08 ||
    (completedSemesters.length > 0 &&
      averageCreditsPerCompletedSemester < targetCreditsPerSemester)
  ) {
    riskLevel = "at-risk";
    riskHeadline = "You are slightly behind pace";
  }

  const riskDetail =
    completedSemesters.length === 0
      ? `${totalCredits.toFixed(0)} of ${graduationCreditsRequired} credits are already planned.`
      : `Average pace is ${averageCreditsPerCompletedSemester.toFixed(1)} credits per completed term against a ${targetCreditsPerSemester.toFixed(1)} target.`;

  const activeProgramCompletedGroups = auditProgramMetrics?.completed ?? 0;
  const activeProgramTotalGroups = auditProgramMetrics?.total ?? 0;
  const activeProgramInProgressGroups = auditProgramMetrics?.inProgress ?? 0;
  const programCompletionRatio =
    activeProgramTotalGroups > 0
      ? activeProgramCompletedGroups / activeProgramTotalGroups
      : 0;

  return {
    graduationCreditsRequired,
    completedCredits,
    plannedCredits,
    creditsRemaining,
    completedCreditRatio,
    programCompletionRatio,
    completedCourseCount,
    plannedCourseCount,
    totalCourseCount,
    averageCreditsPerCompletedSemester,
    targetCreditsPerSemester,
    recentSemesterCredits,
    riskLevel,
    riskHeadline,
    riskDetail,
    activeProgramName: activeProgramName ?? "Active Program",
    activeProgramCompletedGroups,
    activeProgramTotalGroups,
    activeProgramInProgressGroups,
  };
}

function WidgetShell({
  eyebrow,
  title,
  subcopy,
  children,
  accentClass = "from-slate-100 via-white to-slate-50",
}: {
  eyebrow: string;
  title: string;
  subcopy: string;
  children: ReactNode;
  accentClass?: string;
}) {
  return (
    <div
      className={`relative flex h-[16rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br ${accentClass} p-4 shadow-sm`}
    >
      <div className="mb-4 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {eyebrow}
        </p>
        <h3 className="mt-2 text-xl font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-600">{subcopy}</p>
      </div>
      <div className="flex flex-1 flex-col justify-center">{children}</div>
    </div>
  );
}

function getRiskClasses(riskLevel: DashboardMetrics["riskLevel"]) {
  switch (riskLevel) {
    case "on-track":
      return {
        pill: "bg-emerald-100 text-emerald-700",
        accent: "from-emerald-50 via-white to-emerald-100",
      };
    case "at-risk":
      return {
        pill: "bg-amber-100 text-amber-700",
        accent: "from-amber-50 via-white to-amber-100",
      };
    case "off-track":
      return {
        pill: "bg-rose-100 text-rose-700",
        accent: "from-rose-50 via-white to-rose-100",
      };
    default:
      return {
        pill: "bg-slate-100 text-slate-700",
        accent: "from-slate-50 via-white to-slate-100",
      };
  }
}

const widgetDefinitions: WidgetDefinition[] = [
  {
    id: "risk-status",
    label: "On-Track Status",
    description: "Pace and warning signal",
    render: (metrics) => {
      const riskClasses = getRiskClasses(metrics.riskLevel);
      return (
        <WidgetShell
          eyebrow="Status"
          title={metrics.riskHeadline}
          subcopy={metrics.riskDetail}
          accentClass={riskClasses.accent}
        >
          <div className="flex items-center justify-between gap-4">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${riskClasses.pill}`}
            >
              {metrics.riskLevel}
            </span>
            <AlertTriangle className="h-5 w-5 text-slate-500" />
          </div>
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Credit progress</span>
              <span>
                {(metrics.completedCreditRatio * 100).toFixed(0)}% complete
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-slate-900 transition-all duration-500"
                style={{
                  width: `${clampPercentage(metrics.completedCreditRatio * 100)}%`,
                }}
              />
            </div>
          </div>
        </WidgetShell>
      );
    },
  },
  {
    id: "progress-velocity",
    label: "Progress Velocity",
    description: "Semester pace and momentum",
    render: (metrics) => {
      const maxCredits = Math.max(
        metrics.targetCreditsPerSemester,
        ...metrics.recentSemesterCredits.map((s) => s.credits),
        1,
      );
      return (
        <WidgetShell
          eyebrow="Velocity"
          title={`${metrics.averageCreditsPerCompletedSemester.toFixed(1)} credits / completed term`}
          subcopy={`Target pace is ${metrics.targetCreditsPerSemester.toFixed(1)} credits per term.`}
          accentClass="from-indigo-50 via-white to-slate-100"
        >
          <div className="mt-5">
            <div className="flex h-28 items-end gap-3">
              {metrics.recentSemesterCredits.map((semester) => (
                <div
                  key={semester.key}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                  <div className="flex h-20 w-full items-end">
                    <div className="w-full rounded-t-xl bg-slate-200">
                      <div
                        className={`w-full rounded-t-xl transition-all duration-500 ${semester.isCompleted ? "bg-indigo-600" : "bg-indigo-300"}`}
                        style={{
                          height: `${clampPercentage((semester.credits / maxCredits) * 100)}%`,
                          minHeight: semester.credits > 0 ? "12px" : "0px",
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium text-slate-700">
                      {semester.shortLabel}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {semester.credits.toFixed(0)} cr
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </WidgetShell>
      );
    },
  },
  {
    id: "credits-progress",
    label: "Credits Progress",
    description: "Completed, planned, and remaining credits",
    render: (metrics) => (
      <WidgetShell
        eyebrow="Credits"
        title={`${metrics.completedCredits.toFixed(0)} / ${metrics.graduationCreditsRequired} complete`}
        subcopy={`${metrics.plannedCredits.toFixed(0)} more credits are already planned.`}
        accentClass="from-emerald-50 via-white to-sky-50"
      >
        <div className="mt-5 h-4 overflow-hidden rounded-full bg-slate-200">
          <div className="flex h-full">
            <div
              className="h-full bg-emerald-600"
              style={{
                width: `${clampPercentage((metrics.completedCredits / metrics.graduationCreditsRequired) * 100)}%`,
              }}
            />
            <div
              className="h-full bg-amber-400"
              style={{
                width: `${clampPercentage((metrics.plannedCredits / metrics.graduationCreditsRequired) * 100)}%`,
              }}
            />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-emerald-100">
            <p className="text-slate-500">Completed</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              {metrics.completedCredits.toFixed(0)}
            </p>
          </div>
          <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-amber-100">
            <p className="text-slate-500">Planned</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              {metrics.plannedCredits.toFixed(0)}
            </p>
          </div>
          <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-slate-200">
            <p className="text-slate-500">Remaining</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              {metrics.creditsRemaining.toFixed(0)}
            </p>
          </div>
        </div>
      </WidgetShell>
    ),
  },
  {
    id: "program-progress",
    label: "Program Progress",
    description: "Requirement completion from audit",
    render: (metrics) => (
      <WidgetShell
        eyebrow="Program"
        title={metrics.activeProgramName}
        subcopy={
          metrics.activeProgramTotalGroups > 0
            ? `${metrics.activeProgramCompletedGroups} of ${metrics.activeProgramTotalGroups} requirements satisfied.`
            : "Run audit to see progress."
        }
        accentClass="from-slate-50 via-white to-blue-100"
      >
        <div className="mt-5 flex items-center gap-5">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-slate-100">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(#0f172a ${clampPercentage(metrics.programCompletionRatio * 100)}%, #e2e8f0 0)`,
              }}
            />
            <div className="absolute inset-3 rounded-full bg-white" />
            <div className="relative text-center">
              <p className="text-2xl font-semibold text-slate-900">
                {(metrics.programCompletionRatio * 100).toFixed(0)}%
              </p>
            </div>
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Satisfied</span>
              <span>{metrics.activeProgramCompletedGroups}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>In progress</span>
              <span>{metrics.activeProgramInProgressGroups}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Remaining</span>
              <span>
                {Math.max(
                  0,
                  metrics.activeProgramTotalGroups -
                    metrics.activeProgramCompletedGroups -
                    metrics.activeProgramInProgressGroups,
                )}
              </span>
            </div>
          </div>
        </div>
      </WidgetShell>
    ),
  },
  {
    id: "courses-completed",
    label: "Courses Completed",
    description: "Completed and planned course count",
    render: (metrics) => {
      const totalCourses = Math.max(
        metrics.totalCourseCount,
        metrics.completedCourseCount,
        1,
      );
      return (
        <WidgetShell
          eyebrow="Courses"
          title={`${metrics.completedCourseCount} completed`}
          subcopy={`${metrics.plannedCourseCount} additional course${metrics.plannedCourseCount === 1 ? "" : "s"} are on the plan.`}
          accentClass="from-violet-50 via-white to-sky-50"
        >
          <div className="mt-5 grid grid-cols-6 gap-2">
            {Array.from({ length: Math.min(18, totalCourses) }).map(
              (_, index) => {
                const threshold = Math.round(
                  (metrics.completedCourseCount / totalCourses) *
                    Math.min(18, totalCourses),
                );
                return (
                  <div
                    key={index}
                    className={`h-7 rounded-xl ${index < threshold ? "bg-violet-600" : "bg-slate-200"}`}
                  />
                );
              },
            )}
          </div>
        </WidgetShell>
      );
    },
  },
  {
    id: "credits-remaining",
    label: "Credits Remaining",
    description: "Countdown to the graduation target",
    render: (metrics) => (
      <WidgetShell
        eyebrow="Runway"
        title={`${metrics.creditsRemaining.toFixed(0)} credits left`}
        subcopy={`${metrics.plannedCredits.toFixed(0)} of those are already accounted for in future terms.`}
        accentClass="from-amber-50 via-white to-orange-100"
      >
        <div className="mt-5 flex items-end gap-2">
          {Array.from({ length: 8 }).map((_, index) => {
            const completion = Math.max(
              0,
              metrics.creditsRemaining -
                index * (metrics.graduationCreditsRequired / 8),
            );
            const barHeight = Math.max(
              16,
              Math.min(
                88,
                (completion / (metrics.graduationCreditsRequired / 2)) * 88,
              ),
            );
            return (
              <div
                key={index}
                className="flex flex-1 flex-col items-center gap-2"
              >
                <div
                  className="w-full rounded-t-2xl bg-gradient-to-t from-orange-500 to-amber-300"
                  style={{
                    height: `${barHeight}px`,
                    opacity: 1 - index * 0.08,
                  }}
                />
                <span className="text-[11px] text-slate-500">S{index + 1}</span>
              </div>
            );
          })}
        </div>
      </WidgetShell>
    ),
  },
  {
    id: "flexibility-meter",
    label: "Major Flexibility Meter",
    description: "Ratio of satisfied vs unsatisfied requirements",
    render: (metrics) => {
      const satisfied = metrics.activeProgramCompletedGroups;
      const total = metrics.activeProgramTotalGroups;
      const unsatisfied = Math.max(
        0,
        total - satisfied - metrics.activeProgramInProgressGroups,
      );
      const flexPercent = total > 0 ? satisfied / total : 0;
      const label =
        total === 0
          ? "No data"
          : flexPercent >= 0.8
            ? "Almost there"
            : flexPercent >= 0.5
              ? "Halfway"
              : "Just getting started";
      return (
        <WidgetShell
          eyebrow="Requirements"
          title={label}
          subcopy={
            total > 0
              ? `${satisfied} satisfied, ${metrics.activeProgramInProgressGroups} in progress, ${unsatisfied} remaining.`
              : "Run audit to see data."
          }
          accentClass="from-fuchsia-50 via-white to-rose-100"
        >
          <div className="mt-5">
            <div className="h-4 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 transition-all duration-500"
                style={{ width: `${clampPercentage(flexPercent * 100)}%` }}
              />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-fuchsia-100">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                  Satisfied
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-900">
                  {satisfied}
                </p>
              </div>
              <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-fuchsia-100">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                  In Progress
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-900">
                  {metrics.activeProgramInProgressGroups}
                </p>
              </div>
              <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-fuchsia-100">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                  Remaining
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-900">
                  {unsatisfied}
                </p>
              </div>
            </div>
          </div>
        </WidgetShell>
      );
    },
  },
  {
    id: "next-recommendation",
    label: "Next Best Recommendation",
    description: "Most actionable unmet requirement",
    render: (metrics) => (
      <WidgetShell
        eyebrow="Next Move"
        title={
          metrics.activeProgramTotalGroups > 0
            ? `${metrics.activeProgramTotalGroups - metrics.activeProgramCompletedGroups} requirements left`
            : "No data yet"
        }
        subcopy={
          metrics.activeProgramTotalGroups > 0
            ? "Focus on unsatisfied requirements first."
            : "Run an audit to get recommendations."
        }
        accentClass="from-sky-50 via-white to-cyan-100"
      >
        <div className="mt-1 rounded-2xl bg-white/80 p-3 shadow-sm ring-1 ring-sky-100">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
            Recommended focus
          </p>
          <p className="mt-1 text-xs text-slate-700">
            Check the Requirements tab in the major viewer to see which specific
            courses are needed.
          </p>
        </div>
      </WidgetShell>
    ),
  },
  {
    id: "gpa-overview",
    label: "Current GPA",
    description: "Reserved for transcript-backed GPA data",
    render: () => (
      <WidgetShell
        eyebrow="GPA"
        title="Awaiting transcript data"
        subcopy="The current frontend does not have a reliable GPA source yet."
        accentClass="from-slate-50 via-white to-slate-100"
      >
        <div className="mt-5 flex items-center justify-between rounded-2xl bg-white/80 p-4 ring-1 ring-slate-200">
          <div>
            <p className="text-sm font-medium text-slate-700">Current GPA</p>
            <p className="mt-1 text-xs text-slate-500">Data unavailable</p>
          </div>
          <GraduationCap className="h-6 w-6 text-slate-400" />
        </div>
      </WidgetShell>
    ),
  },
];

function getWidgetDefinition(widgetId: DashboardWidgetId) {
  return (
    widgetDefinitions.find((w) => w.id === widgetId) ?? widgetDefinitions[0]
  );
}

function WidgetPicker({
  value,
  onChange,
}: {
  value: DashboardWidgetId;
  onChange: (v: DashboardWidgetId) => void;
}) {
  const selectedWidget = getWidgetDefinition(value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-center text-sm font-normal text-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
        <Sparkles className="h-4 w-4 text-slate-400" />
        <span className="truncate text-center">{selectedWidget.label}</span>
        <span className="text-xs text-slate-400">▼</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(v) => onChange(v as DashboardWidgetId)}
        >
          {widgetDefinitions.map((widget) => (
            <DropdownMenuRadioItem
              key={widget.id}
              value={widget.id}
              className="items-center"
            >
              <div className="flex flex-col">
                <span className="font-medium text-slate-800">
                  {widget.label}
                </span>
                <span className="text-xs text-slate-500">
                  {widget.description}
                </span>
              </div>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function DashboardInsightGrid(props: DashboardInsightGridProps) {
  const {
    activeWorksheetId,
    graduationCreditsRequired,
    totalCredits,
    completedCredits,
    completedCourseCount,
    totalCourseCount,
    semesters,
    auditProgramMetrics,
    activeProgramName,
  } = props;

  const [widgetSelections, setWidgetSelections] = useState<
    Record<string, DashboardWidgetId[]>
  >(() => getWidgetSelections());

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      WIDGET_STORAGE_KEY,
      JSON.stringify(widgetSelections),
    );
  }, [widgetSelections]);

  const slotWidgets = getSlotWidgets(widgetSelections, activeWorksheetId);

  const metrics = useMemo(
    () =>
      computeMetrics({
        graduationCreditsRequired,
        totalCredits,
        completedCredits,
        completedCourseCount,
        totalCourseCount,
        semesters,
        auditProgramMetrics,
        activeProgramName,
      }),
    [
      graduationCreditsRequired,
      totalCredits,
      completedCredits,
      completedCourseCount,
      totalCourseCount,
      semesters,
      auditProgramMetrics,
      activeProgramName,
    ],
  );

  const handleWidgetChange = (
    slotIndex: number,
    nextWidget: DashboardWidgetId,
  ) => {
    if (!activeWorksheetId) return;
    setWidgetSelections((current) => {
      const previousSlots = current[activeWorksheetId] ?? DEFAULT_WIDGETS;
      const nextSlots = [...previousSlots];
      nextSlots[slotIndex] = nextWidget;
      return { ...current, [activeWorksheetId]: nextSlots };
    });
  };

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {slotWidgets.map((widgetId, slotIndex) => {
          const widget = getWidgetDefinition(widgetId);
          return (
            <div
              key={`${slotIndex}-${widgetId}`}
              className="flex h-full flex-col gap-3"
            >
              <div className="flex justify-center">
                <WidgetPicker
                  value={widgetId}
                  onChange={(nextWidget) =>
                    handleWidgetChange(slotIndex, nextWidget)
                  }
                />
              </div>
              {widget.render(metrics)}
            </div>
          );
        })}
      </div>
    </section>
  );
}
