import { err, ok, type Result } from "@/types/errors.js";
import { Validator } from "../../index.js";
import type {
  MQLQueryFile,
  MQLQueryType,
  U16,
} from "../mql.js";
import { type MQLValidationError } from "./index.js";

export class MQLValidator extends Validator<MQLQueryFile, MQLValidationError[]> {
  private errors: MQLValidationError[] = [];
  private currentPath: string[] = [];

  /**
   * Validates a raw JSON object against the MQL schema
   */
  validate(data: unknown): Result<MQLQueryFile, MQLValidationError[]> {
    this.errors = [];
    this.currentPath = [];

    if (!this.isObject(data)) {
      const error: MQLValidationError = { path: 'root', message: "Root must be an object" };
      return err([error]);
    }

    this.validateQueryFile(data);

    if (this.errors.length === 0) {
      return ok(data as MQLQueryFile);
    } else {
      return err([...this.errors])
    }
  }

  private validateQueryFile(data: any): void {
    this.pushPath("root");

    // Validate version
    if (!("version" in data)) {
      this.addError("Missing 'version' field");
    } else if (typeof data.version !== "string") {
      this.addError("'version' must be a string");
    } else if (!this.isValidVersion(data.version)) {
      this.addError(`Invalid version format: ${data.version}`);
    }

    // Validate requirements
    if (!("requirements" in data)) {
      this.addError("Missing 'requirements' field");
    } else if (!Array.isArray(data.requirements)) {
      this.addError("'requirements' must be an array");
    } else {
      this.validateRequirements(data.requirements);
    }

    this.popPath();
  }

  private validateRequirements(requirements: any[]): void {
    this.pushPath("requirements");

    if (requirements.length === 0) {
      return;
      // this.addError("Requirements array cannot be empty");
    }

    requirements.forEach((req, index) => {
      this.pushPath(`[${index}]`);
      this.validateRequirement(req);
      this.popPath();
    });

    this.popPath();
  }

  private validateRequirement(req: any): void {
    if (!this.isObject(req)) {
      this.addError("Requirement must be an object");
      return;
    }

    // Validate query
    if (!("query" in req)) {
      this.addError("Missing 'query' field");
    } else {
      this.pushPath("query");
      this.validateQuery(req.query);
      this.popPath();
    }

    // Validate description
    if (!("description" in req)) {
      this.addError("Missing 'description' field");
    } else if (typeof req.description !== "string") {
      this.addError("'description' must be a string");
    } else if (req.description.trim() === "") {
      this.addError("'description' cannot be empty");
    }

    // Validate priority
    if (!("priority" in req)) {
      this.addError("Missing 'priority' field");
    } else if (!this.isU16(req.priority)) {
      this.addError("'priority' must be a valid U16 (0-65535)");
    }
  }

  private validateQuery(query: any): void {
    if (!this.isObject(query)) {
      this.addError("Query must be an object");
      return;
    }

    // Validate quantity
    if (!("quantity" in query)) {
      this.addError("Missing 'quantity' field");
    } else {
      this.pushPath("quantity");
      this.validateQuantity(query.quantity);
      this.popPath();
    }

    // Validate type
    if (!("type" in query)) {
      this.addError("Missing 'type' field");
    } else if (!this.isValidQueryType(query.type)) {
      this.addError(`Invalid query type: ${query.type}. Must be 'Select' or 'Limit'`);
    }

    // Validate selector
    if (!("selector" in query)) {
      this.addError("Missing 'selector' field");
    } else if (!Array.isArray(query.selector)) {
      this.addError("'selector' must be an array");
    } else {
      this.pushPath("selector");
      this.validateSelectors(query.selector);
      this.popPath();
    }
  }

  private validateQuantity(quantity: any): void {
    if (!this.isObject(quantity)) {
      this.addError("Quantity must be an object");
      return;
    }

    if ("Single" in quantity) {
      if (!this.isU16(quantity.Single)) {
        this.addError("'Single' must be a valid U16 (0-65535)");
      }
      if (quantity.Single === 0) {
        this.addError("'Single' quantity must be greater than 0");
      }
    } else if ("Many" in quantity) {
      const many = quantity.Many;
      if (!this.isObject(many)) {
        this.addError("'Many' must be an object with 'from' and 'to' fields");
        return;
      }
      if (!("from" in many) || !this.isU16(many.from)) {
        this.addError("'Many.from' must be a valid U16");
      }
      if (!("to" in many) || !this.isU16(many.to)) {
        this.addError("'Many.to' must be a valid U16");
      }
      if (this.isU16(many.from) && this.isU16(many.to) && many.from > many.to) {
        this.addError(`'Many.from' (${many.from}) cannot be greater than 'Many.to' (${many.to})`);
      }
    } else {
      this.addError("Quantity must have either 'Single' or 'Many' field");
    }
  }

  private validateSelectors(selectors: any[]): void {
    if (selectors.length === 0) {
      this.addError("Selector array cannot be empty");
    }

    selectors.forEach((selector, index) => {
      this.pushPath(`[${index}]`);
      this.validateSelector(selector);
      this.popPath();
    });
  }

  private validateSelector(selector: any): void {
    if (!this.isObject(selector)) {
      this.addError("Selector must be an object");
      return;
    }

    const keys = Object.keys(selector);
    if (keys.length !== 1) {
      this.addError("Selector must have exactly one field");
      return;
    }

    const key = keys[0];

    switch (key) {
      case "Class":
        this.validateClass(selector.Class);
        break;
      case "Placement":
        if (typeof selector.Placement !== "string") {
          this.addError("'Placement' must be a string");
        }
        break;
      case "Tag":
        if (typeof selector.Tag !== "string") {
          this.addError("'Tag' must be a string");
        }
        break;
      case "TagCode":
        this.validateTagCode(selector.TagCode);
        break;
      case "Dist":
        if (typeof selector.Dist !== "string") {
          this.addError("'Dist' must be a string");
        }
        break;
      case "DistCode":
        this.validateDistCode(selector.DistCode);
        break;
      case "Range":
        this.validateRange(selector.Range);
        break;
      case "RangeDist":
        this.validateRangeDist(selector.RangeDist);
        break;
      case "RangeTag":
        this.validateRangeTag(selector.RangeTag);
        break;
      case "Query":
        this.pushPath("Query");
        this.validateQuery(selector.Query);
        this.popPath();
        break;
      default:
        this.addError(`Unknown selector type: ${key}`);
    }
  }

  private validateClass(cls: any): void {
    if (!this.isObject(cls)) {
      this.addError("Class must be an object");
      return;
    }

    if (!("department_id" in cls)) {
      this.addError("Missing 'department_id' field");
    } else if (typeof cls.department_id !== "string") {
      this.addError("'department_id' must be a string");
    } else if (!/^[A-Z]{2,4}$/.test(cls.department_id)) {
      this.addError(`Invalid department_id format: ${cls.department_id}`);
    }

    if (!("course_number" in cls)) {
      this.addError("Missing 'course_number' field");
    } else if (!this.isU16(cls.course_number)) {
      this.addError("'course_number' must be a valid U16");
    }

    if (!("lab" in cls)) {
      this.addError("Missing 'lab' field");
    } else if (typeof cls.lab !== "boolean") {
      this.addError("'lab' must be a boolean");
    }
  }

  private validateTagCode(tagCode: any): void {
    if (!this.isObject(tagCode)) {
      this.addError("TagCode must be an object");
      return;
    }
    if (!("tag" in tagCode) || typeof tagCode.tag !== "string") {
      this.addError("'tag' must be a string");
    }
    if (!("code" in tagCode) || typeof tagCode.code !== "string") {
      this.addError("'code' must be a string");
    }
  }

  private validateDistCode(distCode: any): void {
    if (!this.isObject(distCode)) {
      this.addError("DistCode must be an object");
      return;
    }
    if (!("dist" in distCode) || typeof distCode.dist !== "string") {
      this.addError("'dist' must be a string");
    }
    if (!("code" in distCode) || typeof distCode.code !== "string") {
      this.addError("'code' must be a string");
    }
  }

  private validateRange(range: any): void {
    if (!this.isObject(range)) {
      this.addError("Range must be an object");
      return;
    }

    if (!("from" in range)) {
      this.addError("Missing 'from' field");
    } else {
      this.pushPath("from");
      this.validateClass(range.from);
      this.popPath();
    }

    if (!("to" in range)) {
      this.addError("Missing 'to' field");
    } else {
      this.pushPath("to");
      this.validateClass(range.to);
      this.popPath();
    }

    // Validate range ordering
    if (
      this.isObject(range.from) &&
      this.isObject(range.to) &&
      range.from.department_id === range.to.department_id &&
      this.isU16(range.from.course_number) &&
      this.isU16(range.to.course_number)
    ) {
      if (range.from.course_number > range.to.course_number) {
        this.addError(
          `Range 'from' course_number (${range.from.course_number}) cannot be greater than 'to' (${range.to.course_number})`
        );
      }
    }
  }

  private validateRangeDist(rangeDist: any): void {
    if (!this.isObject(rangeDist)) {
      this.addError("RangeDist must be an object");
      return;
    }

    this.validateRange(rangeDist);

    if (!("dist" in rangeDist)) {
      this.addError("Missing 'dist' field");
    } else if (typeof rangeDist.dist !== "string") {
      this.addError("'dist' must be a string");
    }
  }

  private validateRangeTag(rangeTag: any): void {
    if (!this.isObject(rangeTag)) {
      this.addError("RangeTag must be an object");
      return;
    }

    this.validateRange(rangeTag);

    if (!("tag" in rangeTag)) {
      this.addError("Missing 'tag' field");
    } else if (typeof rangeTag.tag !== "string") {
      this.addError("'tag' must be a string");
    }
  }

  // Helper methods
  private isObject(value: unknown): value is Record<string, any> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private isU16(value: unknown): value is U16 {
    return (
      typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 0 &&
      value <= 65535
    );
  }

  private isValidQueryType(type: unknown): type is MQLQueryType {
    return type === "Select" || type === "Limit";
  }

  private isValidVersion(version: string): boolean {
    // Validate semantic versioning format
    return /^\d+\.\d+\.\d+$/.test(version);
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
 * Convenience function to validate MQL JSON
 */
export function validateMQL(data: unknown): Result<MQLQueryFile, MQLValidationError[]> {
  const validator = new MQLValidator();
  return validator.validate(data);
}

/**
 * Type guard that narrows unknown to MQLQueryFile if valid
 */
export function isMQLQueryFile(data: unknown): data is MQLQueryFile {
  const result = validateMQL(data);
  return result.ok;
}