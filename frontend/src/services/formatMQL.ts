/**
 * formatMQL.ts — display-string helpers for MQL types.
 *
 * Pure functions that convert parsed MQL `Selector` and `Quantity` values
 * into short human-readable strings. Used by the Programs page to render
 * a major's requirement structure. No matching, no recursion into course
 * data — display only.
 */

import type { MQLQuery, Quantity, Selector } from "@/types/schema/mql/mql";

/** "5" for {Single: 5}, "2-4" for {Many: {from: 2, to: 4}}. */
export function formatQuantity(q: Quantity): string {
  if ("Single" in q) return String(q.Single);
  return `${q.Many.from}-${q.Many.to}`;
}

/** Render a single Selector as a one-line description. */
export function formatSelector(sel: Selector): string {
  if ("Class" in sel) {
    return `${sel.Class.department_id} ${sel.Class.course_number}`;
  }
  if ("Range" in sel) {
    const f = sel.Range.from;
    const t = sel.Range.to;
    return `any course in ${f.department_id} ${f.course_number}-${t.course_number}`;
  }
  if ("Tag" in sel) {
    return `tag: ${sel.Tag}`;
  }
  if ("TagCode" in sel) {
    return `${sel.TagCode.code} courses tagged "${sel.TagCode.tag}"`;
  }
  if ("Dist" in sel) {
    return `distribution: ${sel.Dist}`;
  }
  if ("DistCode" in sel) {
    return `${sel.DistCode.code} courses with ${sel.DistCode.dist}`;
  }
  if ("RangeDist" in sel) {
    const r = sel.RangeDist;
    return `${r.from.department_id} ${r.from.course_number}-${r.to.course_number} with ${r.dist}`;
  }
  if ("RangeTag" in sel) {
    const r = sel.RangeTag;
    return `${r.from.department_id} ${r.from.course_number}-${r.to.course_number} tagged "${r.tag}"`;
  }
  if ("Placement" in sel) {
    return `manual fulfillment: ${sel.Placement}`;
  }
  if ("Query" in sel) {
    return formatNestedQuery(sel.Query);
  }
  return "(unknown selector)";
}

/**
 * Render a nested Query selector. "Single: 1" → "one of: A, B, C";
 * everything else → "<quantity> of: A, B, C".
 */
function formatNestedQuery(q: MQLQuery): string {
  const parts = q.selector.map(formatSelector);
  if ("Single" in q.quantity && q.quantity.Single === 1) {
    return `one of: ${parts.join(", ")}`;
  }
  return `${formatQuantity(q.quantity)} of: ${parts.join(", ")}`;
}
