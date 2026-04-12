import type { MajorTemplate,  MajorProgress, GroupItemProgress, CourseItemTemplateType, CourseItemProgressType} from "../types/type-program";
import type { StudentCourse, Worksheet} from "../types/type-user";

import { CourseDatabase } from "./CourseDatabase";

import Heap from "heap";

export async function loadMajorTemplates(json_file : string)
{
    try {
        console.log(`Loading major templates from ${json_file}...`);
        const response = await fetch(json_file);

        if (!response.ok)
            throw new Error(`File not found: ${json_file}`);
        
        const major_templates = (await response.json()) as MajorTemplate[];

        const major_templates_normalized = major_templates.map((major_template) => ({
           ...major_template,
       }));

        console.log(`Succesfully loaded ${major_templates.length} major templates`)
        console.log(major_templates_normalized);
        return major_templates_normalized;

    } catch (error) {
        console.error('Error loading courses:', error);
        return [];
    }
}

type RequirementType =
  | "single-choice"
  | "combo-choice"
  | "multi-choice"
  | "range-choice"
  | "level-choice"
  | "designation-choice"
  | "category-choice";

type Node = {
  weight: number;
  groupIdx: number;
  itemIdx: number;
  req: CourseItemTemplateType;
};

export class MajorProcessor {
  private course_database: CourseDatabase;

  // Lower number = processed earlier (higher priority)
  private static readonly TYPE_ORDER = {
    "single-choice": 0,
    "combo-choice": 0,
    "multi-choice": 1,
    "range-choice": 2,
    "level-choice": 3,
    "designation-choice": 4,
    "category-choice": 5,
  } as const satisfies Record<RequirementType, number>;

  constructor(course_database: CourseDatabase) {
    this.course_database = course_database;
  }

  private getPrimaryCode(course: StudentCourse): string {
    // Assumes codes like "CPSC 323"
    return course.course.codes[0];
  }

  private getCourseKey(course: StudentCourse): string {
    // Stable identifier for "consume once" semantics
    // season + primary code usually suffices; add CRN if you have it
    if (course.manualFulfillInfo?.manualFulfill) {
      return `${this.getPrimaryCode(course)}@${course.term ?? "?"}#manual:${course.manualFulfillInfo.groupIdx}:${course.manualFulfillInfo.itemIdx}`;
    }
    return `${this.getPrimaryCode(course)}@${course.term ?? "?"}`;
  }

  private splitSubjectAndLevel(code: string): { subject: string; level: number | null } {
    const parts = code.split(" ");
    const subject = parts[0] ?? "";
    const level = parts[1] ? parseInt(parts[1], 10) : null;
    return { subject, level };
  }

  private courseHasCategory(course: StudentCourse, categories: string[]): boolean {
    // `course.course.dist` looks like distribution/attributes
    return course.course.dist?.some((d: string) => categories.includes(d)) ?? false;
  }

  private getOptionalCount(req: CourseItemTemplateType): number | undefined {
    return "count" in req && typeof req.count === "number" ? req.count : undefined;
  }

  private getOptionalMinCount(req: CourseItemTemplateType): number | undefined {
    return "minCount" in req && typeof req.minCount === "number"
      ? req.minCount
      : undefined;
  }

  /** ------------------------------
   * Matchers per requirement type
   * Return list of candidate course indices from 'available'
   * ------------------------------ */
  private matchSingleChoice(
    req: Extract<CourseItemTemplateType, { type: "single-choice" }>,
    available: StudentCourse[],
  ): number[] {
    return available
      .map((c, i) => ({ i, ok: c.course.codes.includes(req.courseCode) }))
      .filter(x => x.ok)
      .map(x => x.i);
  }

  private matchMultiChoice(
    req: Extract<CourseItemTemplateType, { type: "multi-choice" }>,
    available: StudentCourse[],
  ): number[] {
    // Usually means: "pick ONE from this set" unless req.count specified
    const set = new Set(req.courseCodes);
    return available
      .map((c, i) => ({ i, matchCode: set.has(c.course.codes[0]) || c.course.codes.some(code => set.has(code)) }))
      .filter(x => x.matchCode)
      .map(x => x.i);
  }

  private matchComboChoice(
    req: Extract<CourseItemTemplateType, { type: "combo-choice" }>,
    available: StudentCourse[],
  ): number[] {
    // Usually means: "you need ALL of these codes" (or at least minCount)
    // We'll return candidates that are in the set; the caller will take as many as needed.
    const set = new Set(req.courseCodes);
    return available
      .map((c, i) => ({ i, matchCode: set.has(c.course.codes[0]) || c.course.codes.some(code => set.has(code)) }))
      .filter(x => x.matchCode)
      .map(x => x.i);
  }

  private matchRangeChoice(
    req: Extract<CourseItemTemplateType, { type: "range-choice" }>,
    available: StudentCourse[],
  ): number[] {
    // subjectCode: string[]; minLevel, maxLevel: number
    const subjects = new Set(req.subjectCode);
    return available
      .map((c, i) => {
        // A course may have multiple codes; accept if ANY code meets range
        const ok = c.course.codes.some(code => {
          const { subject, level } = this.splitSubjectAndLevel(code);
          if (level == null) return false;
          return subjects.has(subject) && level >= req.minLevel && level <= req.maxLevel;
        });
        return { i, ok };
      })
      .filter(x => x.ok)
      .map(x => x.i);
  }

  private matchLevelChoice(
    req: Extract<CourseItemTemplateType, { type: "level-choice" }>,
    available: StudentCourse[],
  ): number[] {
    // subjectCode: string[]; level: number (min level)
    const subjects = new Set(req.subjectCode);
    return available
      .map((c, i) => {
        const ok = c.course.codes.some(code => {
          const { subject, level } = this.splitSubjectAndLevel(code);
          if (level == null) return false;
          return subjects.has(subject) && level >= req.level;
        });
        return { i, ok };
      })
      .filter(x => x.ok)
      .map(x => x.i);
  }

  private matchCategoryChoice(
    req: Extract<CourseItemTemplateType, { type: "category-choice" }>,
    available: StudentCourse[],
  ): number[] {
    return available
      .map((c, i) => ({ i, ok: this.courseHasCategory(c, req.category) }))
      .filter(x => x.ok)
      .map(x => x.i);
  }

  private matchDesignationChoice(
    req: Extract<CourseItemTemplateType, { type: "designation-choice" }>,
    available: StudentCourse[],
  ): number[] {
    // If "designation" is a special subset of dist/attributes, you can check a different field here.
    return available
      .map((c, i) => ({ i, ok: this.courseHasCategory(c, req.category) }))
      .filter(x => x.ok)
      .map(x => x.i);
  }

  private getCandidates(req: CourseItemTemplateType, available: StudentCourse[]): number[] {
    switch (req.type) {
      case "single-choice": return this.matchSingleChoice(req, available);
      case "multi-choice": return this.matchMultiChoice(req, available);
      case "combo-choice": return this.matchComboChoice(req, available);
      case "range-choice": return this.matchRangeChoice(req, available);
      case "level-choice": return this.matchLevelChoice(req, available);
      case "category-choice": return this.matchCategoryChoice(req, available);
      case "designation-choice": return this.matchDesignationChoice(req, available);
      default:
        throw new Error("Unknown requirement type");
    }
  }

  public getMatchingCoursesForRequirement(
    req: CourseItemTemplateType,
    available: StudentCourse[],
  ): StudentCourse[] {
    const candidateIdxs = this.getCandidates(req, available);
    if (candidateIdxs.length === 0) return [];

    const sortedIdxs = this.chooseBest(candidateIdxs, available, candidateIdxs.length);
    return sortedIdxs.map((idx) => available[idx]);
  }

  /** Pick 'take' courses from candidate indices, preferring:
   *  - earlier semesters (or leave as-is if no semester order)
   *  - lower level (to reserve higher-level for stricter reqs)
   */
  private chooseBest(
    candidates: number[],
    available: StudentCourse[],
    take: number,
  ): number[] {
    const sorted = candidates.slice().sort((ia, ib) => {
      const a = available[ia];
      const b = available[ib];

      // Heuristics: earlier semester first
      const sa = a.term ?? 0;
      const sb = b.term ?? 0;
      if (sa !== sb) return sa - sb;

      // Then by level (lower first)
      const la = this.bestLevel(a);
      const lb = this.bestLevel(b);
      if (la !== lb) return la - lb;

      // Then lexicographic by primary code
      return this.getPrimaryCode(a).localeCompare(this.getPrimaryCode(b));
    });
    return sorted.slice(0, take);
  }

  private bestLevel(c: StudentCourse): number {
    // Minimal numeric level across codes; fallback big number if none
    let best = Number.POSITIVE_INFINITY;
    for (const code of c.course.codes) {
      const { level } = this.splitSubjectAndLevel(code);
      if (typeof level === "number") best = Math.min(best, level);
    }
    return Number.isFinite(best) ? best : 9999;
  }

  /** How many courses does this item want?
   * Defaults: single/multi want 1 unless count/minCount present.
   * combo often wants all listed (or minCount if provided).
   */
  private requestedCount(req: CourseItemTemplateType): number {
    switch (req.type) {
      case "single-choice":
        return 1;

      case "multi-choice":
        return Math.max(1, this.getOptionalCount(req) ?? 1);

      case "combo-choice":
        return this.getOptionalMinCount(req) ?? req.courseCodes.length;

      case "range-choice":
      case "level-choice":
      case "category-choice":
      case "designation-choice":
        return Math.max(1, this.getOptionalCount(req) ?? 1);

      default:
        return 1;
    }
  }

  /** ------------------------------
   * Public processing entrypoint
   * ------------------------------ */
  processMajorTemplate(template: MajorTemplate, ws: Worksheet): MajorProgress {
    // Flatten available courses (planned + completed)
    const allCourses: StudentCourse[] = ws.studentSemesters.flatMap(s => s.studentCourses);
    // Work on a mutable copy for "consuming"
    const available = allCourses.slice();
    const consumed = new Set<string>();

    // mark down the courses that were manually added by the user in a list
    const manuallyAddedCourses = allCourses.filter(c => c.manualFulfillInfo?.manualFulfill);
    const overriddenCourses = allCourses.filter(c => c.requirementOverrideInfo);

    [...manuallyAddedCourses, ...overriddenCourses].forEach(c => {
      consumed.add(this.getCourseKey(c));
    });

    // Build a heap of every course item, prioritized by type
    const heap = new Heap<Node>((a: Node, b: Node) => a.weight - b.weight);
    template.requirements.forEach((group, gi) => {
      group.courseItems.forEach((item, ii) => {
        const weight = MajorProcessor.TYPE_ORDER[item.type as RequirementType] ?? 10;
        // if this item was manually fulfilled (based on groupIdx and itemIdx) --> don't add to heap
        const wasManuallyFulfilled = manuallyAddedCourses.some(c => 
          c.manualFulfillInfo?.groupIdx === gi && 
          c.manualFulfillInfo?.itemIdx === ii
        );
        const wasOverridden = overriddenCourses.some(c =>
          c.requirementOverrideInfo?.groupIdx === gi &&
          c.requirementOverrideInfo?.itemIdx === ii
        );

        if(!wasManuallyFulfilled && !wasOverridden) {
          heap.push({ weight, groupIdx: gi, itemIdx: ii, req: item });
        }
        else {
          heap.push({ weight: 100, groupIdx: gi, itemIdx: ii, req: item }); // pinned items get lowest priority
        }
      });
    });

    // We’ll accumulate progress here, then compute isCompleted flags
    const groupProgress: GroupItemProgress[] = template.requirements.map(g => ({
      description: g.description,
      requiredNum: g.requiredNum,
      // placeholder; we’ll fill the items in a second pass
      courseItems: [] as CourseItemProgressType[],
      isCompleted: false,
      completedNum: 0,
    }));

    // Also prepare a mirror of items as progress nodes (before assignment)
    const itemsProgress: CourseItemProgressType[][] = template.requirements.map(g =>
      g.courseItems.map(it => ({
        ...it,
        isCompleted: false,
        completedCourses: [] as StudentCourse[],
      })),
    );

    // Greedy assignment loop
    while (!heap.empty()) {
      const { groupIdx, itemIdx, req } = heap.pop()!;

      const manual = manuallyAddedCourses.find(c => 
        c.manualFulfillInfo?.groupIdx === groupIdx && 
        c.manualFulfillInfo?.itemIdx === itemIdx
      );
      const overriddenCourse = overriddenCourses.find(c =>
        c.requirementOverrideInfo?.groupIdx === groupIdx &&
        c.requirementOverrideInfo?.itemIdx === itemIdx
      );
      
      if(manual) {
        itemsProgress[groupIdx][itemIdx].isCompleted = true;
        itemsProgress[groupIdx][itemIdx].completedCourses.push(manual);
        continue;
      }

      if(overriddenCourse) {
        itemsProgress[groupIdx][itemIdx].isCompleted = true;
        itemsProgress[groupIdx][itemIdx].completedCourses.push(overriddenCourse);
        continue;
      }

      const need = this.requestedCount(req);

      // Filter available courses to those not yet consumed
      const filtered = available.filter(c => !consumed.has(this.getCourseKey(c)));
      if (filtered.length === 0) continue;

      const candidateIdxs = this.getCandidates(req, filtered);
      if (candidateIdxs.length === 0) continue;

      const chosenIdxs = this.chooseBest(candidateIdxs, filtered, need);
      const chosenCourses = chosenIdxs.map(i => filtered[i]);

      // Mark consumed and update progress
      for (const c of chosenCourses) {
        consumed.add(this.getCourseKey(c));
        itemsProgress[groupIdx][itemIdx].completedCourses.push(c);
      }

      // Determine completion of the item
      if (itemsProgress[groupIdx][itemIdx].completedCourses.length >= need) {
        itemsProgress[groupIdx][itemIdx].isCompleted = true;
      }
    }

    // Populate groupProgress from itemsProgress
    for (let gi = 0; gi < groupProgress.length; gi++) {
      const items = itemsProgress[gi];
      groupProgress[gi].courseItems = items;
      groupProgress[gi].completedNum = items.filter(it => it.isCompleted).length;
      groupProgress[gi].isCompleted = groupProgress[gi].completedNum >= groupProgress[gi].requiredNum;
    }

    const totalCompletedRequirementGroups = groupProgress.filter(g => g.isCompleted).length;
    const totalCompletedCourses = Array.from(consumed).length;

    const majorProgress: MajorProgress = {
      ...template,
      requirements: groupProgress,
      totalCompletedRequirementGroups,
      totalCompletedCourses,
    };

    return majorProgress;
  }

  updateMajorProgress(majorProgress: MajorProgress, ws: Worksheet): MajorProgress
  {
    console.log("RUNNING UPDATE MAJOR PROGRESS");
    // Turn majorProgress into a MajorTemplate and re-process
    const template: MajorTemplate = {
      id: majorProgress.id,
      name: majorProgress.name,
      totalCourses: majorProgress.totalCourses,
      totalRequirementGroups: majorProgress.totalRequirementGroups,
      requirements: majorProgress.requirements.map(r => ({
        description: r.description,
        requiredNum: r.requiredNum,
        courseItems: r.courseItems.map(ci => {
          // Strip progress fields to get template
          const rest = Object.fromEntries(
            Object.entries(ci).filter(
              ([key]) => key !== "isCompleted" && key !== "completedCourses",
            ),
          );
          return rest as CourseItemTemplateType;
        }),
      })),
      info: majorProgress.info,
    };

    console.log("Major Progress: ", majorProgress);
    console.log("Major Template: ", template);

    return this.processMajorTemplate(template, ws);
  }
}
