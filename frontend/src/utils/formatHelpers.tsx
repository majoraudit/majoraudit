import DistributionOutput from "../components/shared-components/DistributionOutput";
import type { GroupItemProgress } from "../types/type-program";

export function formatSeason(seasons: string[]) {
  let output = "";
  seasons.forEach((season, index) => {
    index === 0 ? (output += season) : (output += ", " + season);
  });

  return output;
}

export function formatCredits(credit: number) {
  let output = "";
  credit === 1 ? (output += "1 Credit") : (output += credit + " Credits");
  return output;
}

export function formatDistributions(distributions: string[]) {
  return (
    <div className="flex flex-row gap-2">
      {distributions.map((distribution) => (
        <DistributionOutput key={distribution} distribution={distribution} />
      ))}
    </div>
  );
}

// format taken completed, planned, unplanned
export function formatC_P_UP(
  completed: number,
  planned: number,
  unplanned: number
) {
  return (
    <div className="flex flex-row gap-2 text-xs font-normal">
      <div className="bg-green-100 text-green-700 rounded-md p-1">
        {completed} COMPLETED
      </div>
      <div className="bg-orange-100 text-orange-400 rounded-md p-1">
        {planned} PLANNED
      </div>
      <div className="bg-gray-100 text-black rounded-md p-1">
        {unplanned} UNPLANNED
      </div>
    </div>
  );
}

export function formatCourseItemTypes(group: GroupItemProgress) {
  let requirements = group.courseItems.map((item) => {
    switch (item.type) {
      case "single-choice":
        return `${item.courseCode}`;
      case "multi-choice":
        const codes = item.courseCodes;
        if (codes.length === 2) {
          return `${codes[0]} or ${codes[1]}`;
        } else if (codes.length > 2) {
          const allButLast = codes.slice(0, -1).join(", ");
          const last = codes[codes.length - 1];
          return `${allButLast}, or ${last}`;
        } else {
          return codes[0] || "";
        }

      case "combo-choice":
        // Show as "MATH 1100 + MATH 1110 (counts as 1)"
        const codes2 = item.courseCodes;
        if (codes2.length === 2) {
          return `${codes2[0]} and ${codes2[1]}`;
        } else if (codes2.length > 2) {
          const allButLast = codes2.slice(0, -1).join(", ");
          const last = codes2[codes2.length - 1];
          return `${allButLast}, and ${last}`;
        } else {
          return `${codes2[0]}` || "";
        }

      case "range-choice":
        // Show as "2 courses from ECON 4400-4491"
        const subjects = item.subjectCode.join("/");
        return `${subjects} course ${item.minLevel}-${item.maxLevel}`;

      case "level-choice":
        // Show as "Any MATH course ≥ level 2000"
        const subjectCodes = item.subjectCode.join("/");
        return `${subjectCodes} course ≥ ${item.level}`;

      case "category-choice":
        // Show as "2 Writing Intensive courses"
        const categories = item.category.join("/");
        return `${categories} course`;

      case "designation-choice":
        // Show as "2 Spanish language courses from SPAN"
        const langCategories = item.category.join("/");
        const langSubjects = item.subjectCodes.join("/");
        return `${langCategories} course from ${langSubjects}`;

      default:
        console.error(`Unknown course item type`);
        return "Unknown requirement type";
    }
  });

  return requirements;
}
