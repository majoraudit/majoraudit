import { err, ok, type Result } from "@/types/errors";
import type { Course, CourseList, ManualFulfillment } from "@/types/schema/courses/courses";
import type { MQLQuery, MQLQueryFile, MQLRequirement, Selector, SelectorKind } from "@/types/schema/mql/mql";

export abstract class CourseMatcher<M, T, E> {
    abstract match(courseList: CourseList, from: M): Result<T, E>;
}

export abstract class MatchingEngine<T, E> extends CourseMatcher<MQLQueryFile, T, E> {
    abstract match(courseList: CourseList, from: MQLQueryFile): Result<T, E>;
}

export abstract class QueryMatchingEngine<E> extends CourseMatcher<MQLQuery, CourseList, E> {
    abstract match(courseList: CourseList, from: MQLQuery): Result<CourseList, E>;
}

export interface MatchingError {
    requirement: string;
    message: string;
    expectedCount?: { min: number; max: number };
    actualCount?: number;
}

export interface QueryResult {
    requirement: MQLRequirement;
    selectedCourses: CourseList;
}

export interface MatchingEvaluationResult {
    results: QueryResult[];
    allSelectedCourses: CourseList;
}

type SelectorVTable = {
    [K in SelectorKind]: (mql: MQLQuery, s: Extract<Selector, Record<K, unknown>>, courseList: CourseList) => Result<CourseList, MatchingError>;
};

/**
 * Filter classes from a {@link CourseList} according to an {@link MQLQuery}.
 * Does not apply limit restrictions. This is a greedy selector. Limit restrictions
 * have to do with selection, not aggregation. This matcher creates a SSOT upon which
 * the selector can perform optimizations.
 */
export class QueryMatcher extends QueryMatchingEngine<MatchingError> {
    private readonly selectorVTable: SelectorVTable = {
        Class: this.queryClass,
        Placement: this.queryPlacement,
        Tag: this.queryTag,
        TagCode: this.queryTagCode,
        Dist: this.queryDist,
        DistCode: this.queryDistCode,
        Range: this.queryRange,
        RangeDist: this.queryRangeDist,
        RangeTag: this.queryRangeTag,
        Query: this.queryQuery,
    };

    match(courseList: CourseList, mql: MQLQuery, limitOne = false): Result<CourseList, MatchingError> {
        if (limitOne) return this.matchTop(courseList, mql)
        return this.matchFlatten(courseList, mql)
    }

    matchFlatten(courseList: CourseList, mql: MQLQuery): Result<CourseList, MatchingError> {
        const flattened = new Set<Course | ManualFulfillment | CourseList>();

        for (const query of mql.selector) {
            const [key] = Object.keys(query) as [SelectorKind];
            const handler = this.selectorVTable[key].bind(this);

            if (!handler) {
                return err({
                    requirement: JSON.stringify(mql),
                    message: `${key} is unimplemented`,
                });
            }

            const parsed = handler(mql, query as any, courseList);

            if (!parsed.ok) return parsed;

            for (const course of parsed.data) flattened.add(course);
        }

        return ok([...flattened])
    }


    matchTop(courseList: CourseList, mql: MQLQuery): Result<CourseList, MatchingError> {
        if (mql.selector.length != 1) return err({ requirement: 'MQL structure', message: 'top level MQL should have one query' });

        const rootQuery = mql.selector[0]!;

        const [key] = Object.keys(rootQuery) as [SelectorKind];
        const handler = this.selectorVTable[key].bind(this);

        if (!handler) {
            return err({
                requirement: JSON.stringify(mql),
                message: `${key} is unimplemented`,
            });
        }

        const parsed = handler(mql, rootQuery as any, courseList);

        if (!parsed.ok) {
            return parsed;
        }

        return parsed;
    }

    queryClass(mql: MQLQuery, selector: Selector, courseList: CourseList): Result<CourseList, MatchingError> {
        if (!('Class' in selector)) return err({ requirement: String(mql), message: 'TypeError: Expected .kind = "Class"' });

        const fmt = `${selector.Class.department_id} ${selector.Class.course_number}`;

        const maybeCourses = courseList.filter((course) => 'codes' in course && course.codes.includes(fmt));

        if (maybeCourses.length === 0) {
            return err({ requirement: JSON.stringify(mql), message: `${fmt} not found in catalog` });
        }

        return ok(maybeCourses);
    }

    queryPlacement(mql: MQLQuery, selector: Selector, _courseList: CourseList): Result<CourseList, MatchingError> {
        if (!('Placement' in selector)) return err({ requirement: String(mql), message: 'TypeError: Expected .kind = "Placement"' });

        const placement: ManualFulfillment = {
            filled: false,
            id: crypto.randomUUID(),
            description: selector.Placement,
        };

        return ok([placement]);
    }

    queryDist(mql: MQLQuery, selector: Selector, courseList: CourseList): Result<CourseList, MatchingError> {
        if (!('Dist' in selector)) return err({ requirement: String(mql), message: 'TypeError: Expected .kind = "Dist"' });

        const dist = selector.Dist.toLowerCase();

        const maybeCourses = courseList.filter((course) => 'dist' in course && course.dist?.map(d => d.toLowerCase())?.includes?.(dist));

        if (maybeCourses.length === 0) {
            return err({ requirement: JSON.stringify(mql), message: `DIST(${selector.Dist}) not found in catalog` });
        }

        return ok(maybeCourses);
    }

    queryDistCode(mql: MQLQuery, selector: Selector, courseList: CourseList): Result<CourseList, MatchingError> {
        if (!('DistCode' in selector)) return err({ requirement: String(mql), message: 'TypeError: Expected .kind = "DistCode"' });

        const dist = selector.DistCode.dist.toLowerCase()
        const dep = selector.DistCode.code;

        const courseFilter = (course: typeof courseList[number]) => {
            if (!('dist' in course)) {
                return false;
            }

            return course.codes.some((code) => code.split(' ')[0] === dep) &&
                course.dist?.map(d => d.toLowerCase())?.includes?.(dist);
        }

        const maybeCourses = courseList.filter(courseFilter);

        if (maybeCourses.length === 0) {
            return err({ requirement: JSON.stringify(mql), message: `DIST_DEPT(${selector.DistCode.dist}, ${selector.DistCode.code}) not found in catalog` });
        }

        return ok(maybeCourses);
    }

    queryRange(mql: MQLQuery, selector: Selector, courseList: CourseList): Result<CourseList, MatchingError> {
        if (!('Range' in selector)) return err({ requirement: String(mql), message: 'TypeError: Expected .kind = "Range"' });

        const { from, to } = selector.Range;

        if (from.department_id != to.department_id) {
            return err({
                requirement: String(mql),
                message: `RANGE on different department IDs: ${from.department_id} != ${to.department_id}`
            });
        }

        const maybeCourses = courseList.flatMap((course) => {
            if (!('codes' in course)) return [];

            for (const maybeSplit of course.codes.map(code => code.split(' '))) {
                if (!maybeSplit || maybeSplit.length != 2) {
                    console.warn(course);
                    return [];
                } // soft error

                const [dep, numStr] = maybeSplit;
                const num = Number(numStr);

                if (dep != from.department_id) continue;

                if (from.course_number <= num && num <= to.course_number) {
                    return [course];
                }
            }

            return [];
        });

        if (maybeCourses.length === 0) {
            return err({ requirement: JSON.stringify(mql), message: `RANGE(${from.department_id}${from.course_number}, ${to.department_id}${to.course_number}) not found in catalog` });
        }

        return ok(maybeCourses);
    }

    queryRangeDist(mql: MQLQuery, selector: Selector, _courseList: CourseList): Result<CourseList, MatchingError> {
        console.warn("queryRangeDist is deprecated: all `queryRangeX` functions are not stable");
        if (!('RangeDist' in selector)) return err({ requirement: String(mql), message: 'TypeError: Expected .kind = "RangeDist"' });
        return err({ requirement: String(mql), message: 'queryRangeDist: unimplemented' });
    }

    queryRangeTag(mql: MQLQuery, selector: Selector, _courseList: CourseList): Result<CourseList, MatchingError> {
        console.warn("queryRangeTag is deprecated: all `queryRangeX` functions are not stable");
        if (!('RangeTag' in selector)) return err({ requirement: String(mql), message: 'TypeError: Expected .kind = "RangeTag"' });
        return err({ requirement: String(mql), message: 'queryRangeTag: unimplemented' })
    }

    queryTag(mql: MQLQuery, selector: Selector, courseList: CourseList): Result<CourseList, MatchingError> {
        if (!('Tag' in selector)) return err({ requirement: String(mql), message: 'TypeError: Expected .kind = "Tag"' });

        const tag = selector.Tag;

        const maybeCourses = courseList.filter(course => 'tags' in course && course.tags.includes(tag));

        if (maybeCourses.length === 0) {
            return err({ requirement: JSON.stringify(mql), message: `TAG(${tag}) not found in catalog` });
        }

        return ok(maybeCourses);
    }

    queryTagCode(mql: MQLQuery, selector: Selector, courseList: CourseList): Result<CourseList, MatchingError> {
        if (!('TagCode' in selector)) return err({ requirement: String(mql), message: 'TypeError: Expected .kind = "TagCode"' });

        const { tag, code: dep } = selector.TagCode;

        const maybeCourses = courseList.filter((course) => {
            if (!('tags' in course)) return false;
            return course.codes.some((code) => code.split(' ')[0] === dep) && course.tags.includes(tag);
        });

        if (maybeCourses.length === 0) {
            return err({ requirement: JSON.stringify(mql), message: `TAG_DEPT(${tag}, ${dep}) not found in catalog` });
        }

        return ok(maybeCourses);
    }

    queryQuery(mql: MQLQuery, selector: Selector, courseList: CourseList): Result<CourseList, MatchingError> {
        if (!('Query' in selector)) return err({ requirement: String(mql), message: 'TypeError: Expected .kind = "Range"' });

        const query = selector.Query;

        const result = this.match(courseList, query, false)
        if (!result.ok) {
            console.trace()
            return result;
        } else {
            return ok([result.data])
        }
    }
}

export class MQLMatcher extends MatchingEngine<MatchingEvaluationResult, MatchingError[]> {
    /**
     * Matches courses against MQL requirements
     */
    match(courseList: CourseList, mql: MQLQueryFile): Result<MatchingEvaluationResult, MatchingError[]> {
        const queryMatcher = new QueryMatcher();

        const errors = [];
        const usedCourses: Set<typeof courseList[number]> = new Set();

        const results: QueryResult[] = [];

        // Sort requirements by priority (higher priority first)
        const sortedRequirements = [...mql.requirements].sort(
            (a, b) => b.priority - a.priority
        );

        for (const requirement of sortedRequirements) {
            const selectedCourses = queryMatcher.match(courseList, requirement.query);

            if (!selectedCourses.ok) {
                errors.push(selectedCourses.error);
                continue;
            }

            results.push({
                requirement,
                selectedCourses: selectedCourses.data,
            });

            for (const course of selectedCourses.data) {
                usedCourses.add(course)
            }
        }

        const evaluationResult: MatchingEvaluationResult = {
            results,
            allSelectedCourses: Array.from(usedCourses),
        };

        if (errors.length === 0) {
            return ok(evaluationResult);
        } else {
            return err([...errors]);
        }
    }
}

/**
 * Convenience function to match courses against MQL requirements
 */
export function matchCourses(
    courseList: CourseList,
    mql: MQLQueryFile
): Result<MatchingEvaluationResult, MatchingError[]> {
    const engine = new MQLMatcher();
    return engine.match(courseList, mql);
}