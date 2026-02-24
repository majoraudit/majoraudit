import type { Result } from "@/types/errors.js";

export abstract class Validator<T, E> {
    abstract validate(data: unknown): Result<T, E>;
}

export type * as courses from "./courses/courses.js";
export type * as mql from "./mql/mql.js";