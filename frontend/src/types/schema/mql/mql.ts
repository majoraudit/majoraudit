// MQL 0.2 semantic IR, with the legacy query shape kept optional while old
// programs are phased out.
export type U16 = number;
export type Literal = string | number | boolean | null;

export interface MQLQueryFile {
  version: string;
  requirements: MQLRequirement[];
  choices?: any[];
  facts?: any[];
}

export interface MQLMetadata {
  id: string;
  node_id?: string;
  description?: string;
  [key: string]: unknown;
}

export type MQLCondition =
  | { kind: "CONSTANT"; value: boolean }
  | { kind: "CHOICE_EQUALS"; choice_id: string; equals: Literal }
  | { kind: "FACT_PRESENT"; fact_id: string }
  | { kind: "AND" | "OR"; operands: MQLCondition[] }
  | { kind: "NOT"; operand: MQLCondition };

export type MQLBound =
  | { kind: "FIXED"; value: number }
  | { kind: "CHOICE_TABLE"; choice_id: string; cases: Record<string, number> };

export interface MQLFieldRef {
  target: "CATALOG_COURSE" | "OFFERING" | "TRANSCRIPT_ATTEMPT" | "STUDENT_PROFILE";
  field: string;
  type: string;
  course_code_match?: "CANONICAL" | "ENROLLED_AS" | "EITHER";
}

export type MQLPredicate =
  | { kind: "COMPARE"; field: MQLFieldRef; operator: string; value: Literal | Literal[] }
  | { kind: "IS_NULL" | "IS_UNKNOWN"; field: MQLFieldRef }
  | { kind: "AND" | "OR"; operands: MQLPredicate[] }
  | { kind: "NOT"; operand: MQLPredicate };

export type MQLSelector =
  | { kind: "PREDICATE"; predicate: MQLPredicate }
  | { kind: "COURSE_LIST"; canonical_course_ids: string[] }
  | { kind: "CHILD_REQUIREMENTS"; child_ids: string[] };

export interface MQLRequirement {
  requirement_id?: string;
  meta?: MQLMetadata;
  description?: string;
  roles?: string[];
  obligation?: "REQUIRED" | "OPTIONAL" | "ADVISORY";
  active_when?: MQLCondition;
  contribution?: { kind: string; unit: string; fixed_credit_units?: number };
  lower?: MQLBound;
  upper?: MQLBound | null;
  selector?: MQLSelector;
  children?: MQLRequirement[];
  constraint_ids?: string[];
  priority?: U16;
  query?: MQLQuery;
}

export interface MQLQuery { quantity: Quantity; type: MQLQueryType; selector: Selector[]; }
export type Quantity = { Single: U16 } | { Many: { from: U16; to: U16 } };
export type MQLQueryType = "Select" | "Limit";
export interface Class { department_id: string; course_number: U16; lab: boolean; }
export type Selector = { Class: Class } |
  { Placement: string } | { Tag: string } | { TagCode: { tag: string; code: string } } |
  { Dist: string } | { DistCode: { dist: string; code: string } } |
  { Range: { from: Class, to: Class }} | { RangeDist: { from: Class, to: Class, dist: string } } |
  { RangeTag: { from: Class, to: Class, tag: string }} | { Query: MQLQuery };
export type SelectorKind = keyof {[S in Selector as keyof S]: unknown};
