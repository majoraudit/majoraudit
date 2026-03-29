import type { MajorProgress, GroupItemProgress } from "@/types/type-program";
import { formatCourseItemTypes } from "@/utils/formatHelpers";

interface ClassRequirementMapProps {
  reqProgressGroup: GroupItemProgress;
}

function ClassRequirementMap({ reqProgressGroup }: ClassRequirementMapProps) {
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
        <div
          key={idx}
          className={`h-28 not-even:p-2 m-2 rounded-md flex items-center justify-center flex-none ${
            pair.fulfillment && pair.fulfillment.course
              ? "bg-gray-200 border-gray-300 border-2 text-green-700"
              : "bg-gray-200 border-gray-300 border-2 text-gray-400 border-dashed"
          }`}
        >
          <div className="text-sm text-center">
            {pair.requirement &&
              (pair.fulfillment && pair.fulfillment.course ? (
                <div>
                  {pair.requirement} fulfilled by{" "}
                  <span className="font-bold">
                    {pair.fulfillment.course.codes[0]}
                  </span>
                </div>
              ) : (
                <div>{pair.requirement} required</div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface MajorRequirementGraphProps {
  major_progress: MajorProgress;
}

function MajorRequirementGraph({ major_progress }: MajorRequirementGraphProps) {
  return (
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
            <ClassRequirementMap reqProgressGroup={reqProgressGroup} />
          </div>
        </div>
      ))}
    </div>
  );
}
export default MajorRequirementGraph;
