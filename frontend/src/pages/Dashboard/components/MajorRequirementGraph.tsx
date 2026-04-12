import type { MajorProgress, GroupItemProgress, CourseItemTemplateType } from "@/types/type-program";
import type { StudentCourse } from "@/types/type-user";
import { formatCourseItemTypes } from "@/utils/formatHelpers";
import { useApp } from "@/contexts/AppContext";
import { useWorksheetActions } from "@/hooks/useWorksheetActions";
import { useWorksheetData } from "@/hooks/useWorksheetData";
import { useEffect, useMemo, useState } from "react";

type EditableRequirementModalState = {
  groupIdx: number;
  itemIdx: number;
  requirementLabel: string;
  currentCourse: StudentCourse | null;
  eligibleCourses: StudentCourse[];
  requirementCategories: string[];
};

function getStudentCourseKey(studentCourse: StudentCourse) {
  const primaryCode =
    studentCourse.course.codes?.[0] || studentCourse.course.title || "unknown";
  return `${primaryCode}@${studentCourse.term ?? "?"}`;
}

function getRequirementTemplate(
  item: GroupItemProgress["courseItems"][number],
): CourseItemTemplateType {
  const templateItem = Object.fromEntries(
    Object.entries(item).filter(
      ([key]) => key !== "isCompleted" && key !== "completedCourses",
    ),
  );
  return templateItem as CourseItemTemplateType;
}

function getRequirementCategories(item: GroupItemProgress["courseItems"][number]) {
  if (item.type === "category-choice") return item.category;
  if (item.type === "designation-choice") return item.category;
  return [];
}

function isEditableRequirement(item: GroupItemProgress["courseItems"][number]) {
  return item.type === "category-choice" || item.type === "designation-choice";
}

function formatSeasonCode(season: number) {
  const seasonStr = season.toString();
  const year = Number(seasonStr.slice(0, 4));
  const termCode = seasonStr.slice(-2);

  if (termCode === "01") return `Spring ${year}`;
  if (termCode === "02") return `Summer ${year}`;
  if (termCode === "03") return `Fall ${year}`;
  return `${season}`;
}

function getFulfillmentText(course: StudentCourse) {
  const courseLabel = course.course.codes?.[0] ?? course.course.title;

  if (course.manualFulfillInfo?.manualFulfill) {
    return {
      prefix: "fulfilled by unlisted course",
      courseLabel,
    };
  }

  return {
    prefix: "fulfilled by",
    courseLabel,
  };
}

interface RequirementFulfillmentModalProps {
  state: EditableRequirementModalState;
  onClose: () => void;
  onSavePreviousCourse: (courseKey: string) => { ok: boolean; error?: string };
  onSaveManualCourse: (label: string) => { ok: boolean; error?: string };
}

function RequirementFulfillmentModal({
  state,
  onClose,
  onSavePreviousCourse,
  onSaveManualCourse,
}: RequirementFulfillmentModalProps) {
  const [mode, setMode] = useState<"previous" | "manual">(
    state.eligibleCourses.length > 0 ? "previous" : "manual",
  );
  const [selectedCourseKey, setSelectedCourseKey] = useState(
    state.currentCourse ? getStudentCourseKey(state.currentCourse) : "",
  );
  const [manualCourseLabel, setManualCourseLabel] = useState(
    state.currentCourse?.manualFulfillInfo?.manualFulfill
      ? state.currentCourse.course.codes?.[0] ?? state.currentCourse.course.title
      : "",
  );
  const [error, setError] = useState("");

  useEffect(() => {
    setMode(state.eligibleCourses.length > 0 ? "previous" : "manual");
    setSelectedCourseKey(
      state.currentCourse ? getStudentCourseKey(state.currentCourse) : "",
    );
    setManualCourseLabel(
      state.currentCourse?.manualFulfillInfo?.manualFulfill
        ? state.currentCourse.course.codes?.[0] ?? state.currentCourse.course.title
        : "",
    );
    setError("");
  }, [state]);

  const handleSave = () => {
    if (mode === "previous") {
      if (!selectedCourseKey) {
        setError("Select a completed course.");
        return;
      }

      const result = onSavePreviousCourse(selectedCourseKey);
      if (!result.ok) {
        setError(result.error ?? "Unable to save the selected course.");
        return;
      }

      onClose();
      return;
    }

    if (!manualCourseLabel.trim()) {
      setError("Enter the course that fulfilled this requirement.");
      return;
    }

    const result = onSaveManualCourse(manualCourseLabel);
    if (!result.ok) {
      setError(result.error ?? "Unable to save the manual course.");
      return;
    }

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Update requirement fulfillment
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {state.requirementLabel}
            </p>
          </div>
          <button
            type="button"
            className="cursor-pointer text-2xl leading-none text-gray-400 hover:text-gray-600"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          <div className="font-medium text-gray-900">Current fulfillment</div>
          <div className="mt-1">
            {state.currentCourse
              ? state.currentCourse.course.codes?.[0] ?? state.currentCourse.course.title
              : "No course selected"}
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-4">
            <input
              type="radio"
              name="requirement-fulfillment-mode"
              className="mt-1"
              checked={mode === "previous"}
              onChange={() => {
                setMode("previous");
                setError("");
              }}
              disabled={state.eligibleCourses.length === 0}
            />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-900">Previous course</div>
              <p className="mt-1 text-sm text-gray-500">
                Choose from completed courses that match this requirement.
              </p>
              {state.eligibleCourses.length > 0 ? (
                <select
                  className="mt-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  value={selectedCourseKey}
                  onChange={(event) => {
                    setSelectedCourseKey(event.target.value);
                    setError("");
                  }}
                  disabled={mode !== "previous"}
                >
                  <option value="" disabled>
                    Select a completed course
                  </option>
                  {state.eligibleCourses.map((course) => (
                    <option key={getStudentCourseKey(course)} value={getStudentCourseKey(course)}>
                      {(course.course.codes?.[0] ?? course.course.title) +
                        " • " +
                        formatSeasonCode(course.term)}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="mt-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-3 text-sm text-gray-500">
                  No completed courses on this worksheet currently satisfy this requirement.
                </div>
              )}
            </div>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-4">
            <input
              type="radio"
              name="requirement-fulfillment-mode"
              className="mt-1"
              checked={mode === "manual"}
              onChange={() => {
                setMode("manual");
                setError("");
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-900">Manual entry</div>
              <p className="mt-1 text-sm text-gray-500">
                Use this if the requirement was satisfied by an unlisted course.
              </p>
              <input
                className="mt-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. HIST 115"
                value={manualCourseLabel}
                onChange={(event) => {
                  setManualCourseLabel(event.target.value);
                  setError("");
                }}
                disabled={mode !== "manual"}
              />
              {state.requirementCategories.length > 0 && (
                <p className="mt-2 text-xs text-gray-500">
                  This will be saved under {state.requirementCategories.join("/")} for matching.
                </p>
              )}
            </div>
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="cursor-pointer rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

interface ClassRequirementMapProps {
  reqProgressGroup: GroupItemProgress;
  groupIdx: number;
  onEditFulfillment: (state: EditableRequirementModalState) => void;
}

function ClassRequirementMap({
  reqProgressGroup,
  groupIdx,
  onEditFulfillment,
}: ClassRequirementMapProps) {
  let requirements: string[] = [];

  requirements = formatCourseItemTypes(reqProgressGroup);

  // Pair requirements with their fulfillment status
  const maxLength = Math.max(
    requirements.length,
    reqProgressGroup.completedNum
  );
  const pairs = [];

  for (let i = 0; i < maxLength; i++) {
    pairs.push({
      requirement: requirements[i] || null,
      fulfillment: reqProgressGroup.courseItems[i]?.completedCourses[0] || null,
      remaining: reqProgressGroup.requiredNum - reqProgressGroup.completedNum,
    });
  }

  return (
    <div className="flex flex-col w-full h-full overflow-y-auto">
      {pairs.map((pair, idx) => (
        (() => {
          const courseItem = reqProgressGroup.courseItems[idx];
          const isEditable =
            !!pair.fulfillment &&
            !!pair.fulfillment.course &&
            !!courseItem &&
            isEditableRequirement(courseItem);
          const fulfillmentText = pair.fulfillment
            ? getFulfillmentText(pair.fulfillment)
            : null;

          return (
            <div
              key={idx}
              className={`h-28 not-even:p-2 m-2 rounded-md flex items-center justify-center flex-none ${
                pair.fulfillment && pair.fulfillment.course
                  ? "bg-gray-200 border-gray-300 border-2 text-green-700"
                  : "bg-gray-200 border-gray-300 border-2 text-gray-400 border-dashed"
              } ${
                isEditable
                  ? "cursor-pointer"
                  : ""
              }`}
              onClick={() => {
                if (!pair.fulfillment || !pair.fulfillment.course || !courseItem || !isEditable) {
                  return;
                }

                onEditFulfillment({
                  groupIdx,
                  itemIdx: idx,
                  requirementLabel: pair.requirement ?? reqProgressGroup.description,
                  currentCourse: pair.fulfillment,
                  eligibleCourses: [],
                  requirementCategories: getRequirementCategories(courseItem),
                });
              }}
            >
              <div className="text-sm text-center">
                {pair.requirement &&
                  (pair.fulfillment && pair.fulfillment.course ? (
                    <div>
                      {pair.requirement} {fulfillmentText?.prefix}{" "}
                      <span className="font-bold">
                        {fulfillmentText?.courseLabel}
                      </span>
                    </div>
                  ) : (
                    <div>{pair.requirement} required</div>
                  ))}
              </div>
            </div>
          );
        })()
      ))}
    </div>
  );
}

interface MajorRequirementGraphProps {
  major_progress: MajorProgress;
}

function MajorRequirementGraph({ major_progress }: MajorRequirementGraphProps) {
  const { appData } = useApp();
  const { completedStudentCourses } = useWorksheetData();
  const {
    assignExistingCourseToRequirement,
    assignManualRequirementFulfillment,
  } = useWorksheetActions();
  const [editingRequirement, setEditingRequirement] =
    useState<EditableRequirementModalState | null>(null);

  const completedCourses = useMemo(
    () =>
      completedStudentCourses
        .map(({ sc }) => sc)
        .filter((studentCourse) => !studentCourse.manualFulfillInfo?.manualFulfill),
    [completedStudentCourses],
  );

  const handleOpenEditor = (state: EditableRequirementModalState) => {
    const requirementItem = major_progress.requirements[state.groupIdx]?.courseItems[state.itemIdx];
    if (!requirementItem || !appData?.major_processor) return;

    const eligibleCourses = appData.major_processor.getMatchingCoursesForRequirement(
      getRequirementTemplate(requirementItem),
      completedCourses,
    );

    setEditingRequirement({
      ...state,
      eligibleCourses,
    });
  };

  return (
    <>
      <div className="flex flex-row items-stretch gap-2 w-full flex-1 min-h-0 overflow-x-auto">
        {major_progress.requirements.map((reqProgressGroup, index) => (
          <div
            key={index}
            className="bg-gray-100 border-gray-200 border-2 p-2 flex flex-col flex-1 min-h-0 min-w-48"
          >
            <span className="font-medium mb-1 mt-1 shrink-0 flex items-center justify-center">
              <span className="truncate whitespace-nowrap overflow-hidden text-ellipsis max-w-[70%] text-center">
                {reqProgressGroup.description}
              </span>

              <span className="ml-1">–</span>

              <span
                className={
                  reqProgressGroup.requiredNum - reqProgressGroup.completedNum ===
                  0
                    ? "text-green-700 ml-1"
                    : "text-red-600 ml-1"
                }
              >
                {reqProgressGroup.requiredNum - reqProgressGroup.completedNum}
              </span>
            </span>

            <div className="flex-1 min-h-0">
              <ClassRequirementMap
                reqProgressGroup={reqProgressGroup}
                groupIdx={index}
                onEditFulfillment={handleOpenEditor}
              />
            </div>
          </div>
        ))}
      </div>

      {editingRequirement && (
        <RequirementFulfillmentModal
          state={editingRequirement}
          onClose={() => setEditingRequirement(null)}
          onSavePreviousCourse={(courseKey) =>
            assignExistingCourseToRequirement(
              editingRequirement.groupIdx,
              editingRequirement.itemIdx,
              courseKey,
            )
          }
          onSaveManualCourse={(label) =>
            assignManualRequirementFulfillment(
              editingRequirement.groupIdx,
              editingRequirement.itemIdx,
              {
                label,
                categories: editingRequirement.requirementCategories,
                credits: editingRequirement.currentCourse?.course.credit ?? 1,
              },
            )
          }
        />
      )}
    </>
  );
}
export default MajorRequirementGraph;
