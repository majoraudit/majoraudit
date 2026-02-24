import { err, ok, type Result } from "@/types/errors.js";
import type { CourseList } from "../courses.js";
import type { CoursesValidationError } from "./index.js";
import { Validator } from "../../index.js";

/**
 * @deprecated
 */
export class CourseValidator extends Validator<CourseList, CoursesValidationError[]> {
  private errors: CoursesValidationError[] = [];
  private currentPath: string[] = [];

  /**
   * Validates a raw JSON object against the Course schema
   */
  validate(data: unknown): Result<CourseList, CoursesValidationError[]> {
    this.errors = [];
    this.currentPath = [];

    if (!Array.isArray(data)) {
      const error: CoursesValidationError = { path: "root", message: "Root must be an array of courses" }
      return err([error]);
    }

    this.validateCourseList(data);

    if (this.errors.length === 0) {
      return ok(data as CourseList);
    } else {
      return err([...this.errors]);
    }
  }

  private validateCourseList(list: any[]): void {
    list.forEach((course, index) => {
      this.pushPath(`[${index}]`);
      this.validateCourse(course);
      this.popPath();
    });
  }

  private validateCourse(course: any): void {
    if (!this.isObject(course)) {
      this.addError("Course entry must be an object");
      return;
    }

    // Validate codes (Required)
    if (!("codes" in course)) {
      this.addError("Missing 'codes' field");
    } else if (!this.isStringArray(course.codes)) {
      this.addError("'codes' must be an array of strings");
    } else if (course.codes.length === 0) {
      this.addError("'codes' array cannot be empty");
    }

    // Validate title (Required)
    if (!("title" in course)) {
      this.addError("Missing 'title' field");
    } else if (typeof course.title !== "string") {
      this.addError("'title' must be a string");
    }

    // Validate credit (Required)
    if (!("credit" in course)) {
      this.addError("Missing 'credit' field");
    } else if (typeof course.credit !== "number" || course.credit < 0) {
      this.addError("'credit' must be a non-negative number");
    }

    // Validate dist (Optional)
    if ("dist" in course) {
      if (!this.isStringArray(course.dist)) {
        this.addError("'dist' must be an array of strings");
      }
    }

    // Validate seasons (Required)
    if (!("seasons" in course)) {
      this.addError("Missing 'seasons' field");
    } else if (!this.isStringArray(course.seasons)) {
      this.addError("'seasons' must be an array of strings");
    }

    // Validate season_codes (Required)
    if (!("season_codes" in course)) {
      this.addError("Missing 'season_codes' field");
    } else if (!this.isStringArray(course.season_codes)) {
      this.addError("'season_codes' must be an array of strings");
    }
  }

  // Helper methods
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
    this.errors.push({
      path: this.currentPath.join("."),
      message,
    });
  }
}

/**
 * Convenience function to validate Course JSON
 */
export function validateCourses(data: unknown): Result<CourseList, CoursesValidationError[]> {
  const validator = new CourseValidator();
  return validator.validate(data);
}

/**
 * Type guard that narrows unknown to CourseList if valid
 */
export function isCourseList(data: unknown): data is CourseList {
  const result = validateCourses(data);
  return result.ok;
}