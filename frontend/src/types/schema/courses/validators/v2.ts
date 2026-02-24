import { err, ok, type Result } from "@/types/errors.js";
import { Validator } from "../../index.js";
import type { CourseList, Course } from "../courses.js";
import type { CoursesValidationError } from "./index.js";

export class CourseValidator extends Validator<CourseList, CoursesValidationError[]> {
  private errors: CoursesValidationError[] = [];
  private currentPath: string[] = [];

  validate(data: unknown): Result<CourseList, CoursesValidationError[]> {
    this.errors = [];
    this.currentPath = [];

    if (!Array.isArray(data)) {
      return err([{ path: "root", message: "Root must be an array of courses" }]);
    }

    const mapped = this.validateAndMapCourseList(data);

    return this.errors.length === 0 ? ok(mapped as CourseList) : err([...this.errors]);
  }

  private validateAndMapCourseList(list: any[]): Course[] {
    return list.map((entry, index) => {
      this.pushPath(`[${index}]`);
      const mapped = this.validateAndMapCourse(entry);
      this.popPath();
      return mapped;
    });
  }

  private validateAndMapCourse(course: any): Course {
    if (!this.isObject(course)) {
      this.addError("Course entry must be an object");
      return {} as Course;
    }

    // external_id (Optional)
    if ("external_id" in course && (typeof course.external_id !== "number" || !Number.isInteger(course.external_id))) {
      this.addError("'external_id' must be an integer");
    }

    // title (Required)
    if (!("title" in course)) {
      this.addError("Missing 'title' field");
    } else if (typeof course.title !== "string") {
      this.addError("'title' must be a string");
    }

    // description (Optional)
    if ("description" in course && typeof course.description !== "string") {
      this.addError("'description' must be a string");
    }

    // credits → credit (Required, numeric string → number)
    let credit: number = 0;
    if (!("credits" in course)) {
      this.addError("Missing 'credits' field");
    } else if (typeof course.credits !== "string" || isNaN(parseFloat(course.credits))) {
      this.addError("'credits' must be a numeric string (e.g. \"1.0\")");
    } else {
      credit = parseFloat(course.credits);
    }

    // distributionals → dist (Optional)
    if ("distributionals" in course && !this.isStringArray(course.distributionals)) {
      this.addError("'distributionals' must be an array of strings");
    }

    // course_tag → tags (Optional, default [])
    if ("course_tag" in course && !this.isStringArray(course.course_tag)) {
      this.addError("'course_tag' must be an array of strings");
    }

    // course_codes → codes (Required, flatten { department, number } → "DEPT NUMBER")
    let codes: string[] = [];
    if (!("course_codes" in course)) {
      this.addError("Missing 'course_codes' field");
    } else if (!Array.isArray(course.course_codes)) {
      this.addError("'course_codes' must be an array");
    } else {
      course.course_codes.forEach((code: any, index: number) => {
        this.pushPath(`course_codes[${index}]`);
        const flat = this.validateAndMapCourseCode(code);
        if (flat) codes.push(flat);
        this.popPath();
      });
    }

    return {
      codes,
      tags: this.isStringArray(course.course_tag) ? course.course_tag : [],
      title: typeof course.title === "string" ? course.title : "",
      credit,
      ...(this.isStringArray(course.distributionals) && { dist: course.distributionals }),
      // v2 source has no seasons/season_codes — default to empty arrays
      seasons: [],
      season_codes: [],
      version: "v2",
      ...(Number.isInteger(course.external_id) && { external_id: course.external_id }),
      ...(typeof course.description === "string" && { description: course.description }),
    };
  }

  private validateAndMapCourseCode(code: any): string | null {
    if (!this.isObject(code)) {
      this.addError("Course code entry must be an object");
      return null;
    }

    if (!("department" in code)) {
      this.addError("Missing 'department' field");
      return null;
    } else if (typeof code.department !== "string") {
      this.addError("'department' must be a string");
      return null;
    }

    if (!("number" in code)) {
      this.addError("Missing 'number' field");
      return null;
    } else if (typeof code.number !== "string") {
      this.addError("'number' must be a string");
      return null;
    }

    return `${code.department} ${code.number}`;
  }

  // Helpers
  private isObject(value: unknown): value is Record<string, any> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((i) => typeof i === "string");
  }

  private pushPath(segment: string): void {
    this.currentPath.push(segment);
  }

  private popPath(): void {
    this.currentPath.pop();
  }

  private addError(message: string): void {
    this.errors.push({ path: this.currentPath.join("."), message });
  }
}

export function validateCourses(data: unknown): Result<CourseList, CoursesValidationError[]> {
  const validator = new CourseValidator();
  return validator.validate(data);
}

export function isCourseList(data: unknown): data is CourseList {
  return validateCourses(data).ok;
}