import {
  type MajorProgress,
  type GroupItemProgress,
} from "@/types/type-program";
import { formatCourseItemTypes } from "@/utils/formatHelpers";

import { useState } from "react";

import { Check } from "lucide-react";

interface ClassRequirementMapProps {
  reqProgressGroup: GroupItemProgress;
  groupIdx: number; // NEW
  onManualFulfillItem?: (groupIdx: number, itemIdx: number) => void; // NEW
}

function ClassRequirementMap({
  reqProgressGroup,
  groupIdx,
  onManualFulfillItem,
}: ClassRequirementMapProps) {
  const requirements = formatCourseItemTypes(reqProgressGroup);

  // Pair requirement label with first fulfilled course (if any)
  const maxLength = Math.max(
    requirements.length,
    reqProgressGroup.completedNum
  );
  const pairs: {
    requirement: string | null;
    fulfillment:
      | (typeof reqProgressGroup.courseItems)[number]["completedCourses"][number]
      | null;
  }[] = [];

  for (let i = 0; i < maxLength; i++) {
    pairs.push({
      requirement: requirements[i] || null,
      fulfillment: reqProgressGroup.courseItems[i]?.completedCourses[0] || null,
    });
  }

  return (
    <div className="p-2 mt-2">
      <div className="space-y-3">
        {pairs.map((pair, itemIdx) => {
          const isCompleted = !!pair.fulfillment;
          return (
            <div key={itemIdx} className="relative">
              <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-300" />

              <div className="ml-6 bg-white border border-gray-200 rounded-lg p-4 pt-3 shadow-sm relative">
                {/* Per-item Manually fulfill button (top-right of the item card) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onManualFulfillItem?.(groupIdx, itemIdx);
                  }}
                  className={`absolute right-3 top-3 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium border transition-colors
                    ${
                      isCompleted
                        ? "border-gray-300 text-gray-400 cursor-not-allowed"
                        : "border-brand-blue text-brand-blue hover:bg-blue-50 active:bg-blue-100"
                    }`}
                  disabled={isCompleted}
                  aria-label={`Manually fulfill requirement item ${
                    itemIdx + 1
                  }`}
                  title={
                    isCompleted
                      ? "Already fulfilled"
                      : "Manually fulfill this item"
                  }
                >
                  ✓ Manually fulfill
                </button>

                {pair.requirement && (
                  <div className="mb-2">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Requirement
                    </span>
                    <div className="text-sm text-gray-700 mt-2 flex items-center">
                      <span className="w-2 h-2 bg-gray-500 rounded-full mr-2 flex-shrink-0" />
                      {pair.requirement}
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Status
                  </span>
                  <div className="text-sm mt-2 flex items-center">
                    {pair.fulfillment && pair.fulfillment.course ? (
                      <>
                        <span className="w-2 h-2 rounded-full mr-2 flex-shrink-0 bg-green-700" />
                        <span className="text-green-700 font-medium">
                          Fulfilled by {pair.fulfillment.course.codes[0]}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full mr-2 flex-shrink-0 bg-red-600" />
                        <span className="text-red-600">Not fulfilled yet</span>
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

// Placeholder components for the new tabs
function ProgressTab() {
  return (
    <div className="p-4 text-center text-gray-500">
      Progress content will be displayed here
    </div>
  );
}

function RemindersTab() {
  return (
    <div className="p-4 text-center text-gray-500">
      Reminders content will be displayed here
    </div>
  );
}

interface MajorReqListProps {
  major_progress: MajorProgress;
  onManualFulfillItem?: (groupIdx: number) => void; // NEW
}

function MajorRequirementList({
  major_progress,
  onManualFulfillItem,
}: MajorReqListProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<
    "requirements" | "progress" | "reminders"
  >("requirements");

  const toggleExpanded = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const tabs = [
    { id: "requirements" as const, label: "Requirements 📋" },
    { id: "progress" as const, label: "Progress 📈" },
    { id: "reminders" as const, label: "Reminders 🔔" },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "requirements":
        return (
          <ul className="flex-1 overflow-y-auto p-2">
            {major_progress.requirements.map((reqProgressGroup, index) => {
              const isExpanded = expandedIndex === index;
              let remainingRequirements = 0;
              let descriptionText = "";

              if (
                reqProgressGroup.requiredNum ==
                reqProgressGroup.courseItems.length
              )
                descriptionText = "Must complete all requirements within";
              else if (reqProgressGroup.requiredNum > 1)
                descriptionText = `Must complete ${reqProgressGroup.requiredNum} requiremets`;
              else descriptionText = "Must complete 1 requirement";

              remainingRequirements =
                reqProgressGroup.requiredNum - reqProgressGroup.completedNum;

              return (
                <li key={index} className="m-2">
                  <div
                    className="bg-gray-100 border-gray-200 border-2 rounded-md cursor-pointer hover:bg-gray-200 transition-colors text-center flex-row items-center justify-center p-1"
                    onClick={() => toggleExpanded(index)}
                  >
                    <div className="flex flex-row gap-4 items-start w-full">
                      <div
                        className={`w-6 h-6 border-2 rounded-sm mt-1 ml-1 shrink-0 flex justify-center items-center text-center${
                          reqProgressGroup.isCompleted
                            ? "bg-gray-100 border-green-700  text-green-700"
                            : "bg-gray-100 border-red-600 text-red-600 font-medium"
                        }`}
                      >
                        {remainingRequirements > 0 ? (
                          remainingRequirements
                        ) : (
                          <Check />
                        )}
                      </div>

                      <div className="flex flex-col flex-grow">
                        <span className="font-medium">
                          {reqProgressGroup.description}
                        </span>
                        <span className="text-sm text-gray-500">
                          {descriptionText}
                        </span>
                      </div>

                      <div
                        className="text-gray-500 transition-transform duration-200"
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

                  {isExpanded && (
                    <div className="transition-all duration-300 ease-in-out">
                      <ClassRequirementMap
                        reqProgressGroup={reqProgressGroup}
                        groupIdx={index}
                        onManualFulfillItem={onManualFulfillItem}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        );
      case "progress":
        return <ProgressTab />;
      case "reminders":
        return <RemindersTab />;
    }
  };

  return (
    <>
      {/* Tab Bar */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setExpandedIndex(null); // Reset expanded state when switching tabs
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

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {renderTabContent()}
      </div>
    </>
  );
}

export default MajorRequirementList;
