// Full TypeScript port of the Rust MQL structs/enums

export type U16 = number;

export interface MQLQueryFile {
  version: string;
  requirements: MQLRequirement[];
}

export interface MQLRequirement {
  query: MQLQuery;
  description: string;
  priority: U16;
}

export interface MQLQuery {
  quantity: Quantity;
  type: MQLQueryType;
  selector: Selector[];
}

export type Quantity =
  | { Single: U16 }
  | { Many: { from: U16; to: U16 } };

export type MQLQueryType = "Select" | "Limit";

export interface Class {
  department_id: string;
  course_number: U16;
  lab: boolean;
}

export type Selector = { Class: Class } |
  { Placement: string } |
  { Tag: string } |
  { TagCode: { tag: string; code: string } } |
  { Dist: string } |
  { DistCode: { dist: string; code: string } } |
  { Range: { from: Class, to: Class }} |
  { RangeDist: { from: Class, to: Class, dist: string } } |
  { RangeTag: { from: Class, to: Class, tag: string }} |
  { Query: MQLQuery };

export type SelectorKind = keyof {[S in Selector as keyof S]: unknown};