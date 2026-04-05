export interface Course {
  codes: string[];
  tags: string[];
  title: string;
  credit: number;
  dist?: string[];
  seasons: string[];
  season_codes: string[];

  /** default to v1 if empty */
  version?: string;
  external_id?: number;
  description?: string;
}

export interface ManualFulfillment<ID extends string | number = ReturnType<Crypto["randomUUID"]>> {
  filled: boolean,
  id: ID,
  description: string,
}

export type CourseList = Array<Course | ManualFulfillment | CourseList>;