export interface MQLValidationError {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: MQLValidationError[];
}