/**
 * Lightweight validation helpers — no external lib required.
 */

export type ValidationError = { field: string; message: string };

export class ValidationException extends Error {
  public errors: ValidationError[];
  public status = 422;

  constructor(errors: ValidationError[]) {
    super('Validation failed');
    this.errors = errors;
  }
}

// ── Field validators ──────────────────────────────────────────

export function required(value: any, field: string): ValidationError | null {
  if (value === undefined || value === null || String(value).trim() === '') {
    return { field, message: `${field} is required` };
  }
  return null;
}

export function minLength(value: string, field: string, min: number): ValidationError | null {
  if (typeof value === 'string' && value.trim().length < min) {
    return { field, message: `${field} must be at least ${min} characters` };
  }
  return null;
}

export function isEmail(value: string, field: string): ValidationError | null {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(String(value).trim())) {
    return { field, message: `${field} must be a valid email address` };
  }
  return null;
}

export function isOneOf(value: any, field: string, allowed: string[]): ValidationError | null {
  if (!allowed.includes(value)) {
    return { field, message: `${field} must be one of: ${allowed.join(', ')}` };
  }
  return null;
}

export function isPositiveNumber(value: any, field: string): ValidationError | null {
  if (isNaN(Number(value)) || Number(value) < 0) {
    return { field, message: `${field} must be a non-negative number` };
  }
  return null;
}

export function isPositiveInteger(value: any, field: string): ValidationError | null {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    return { field, message: `${field} must be a positive integer` };
  }
  return null;
}

export function isDate(value: any, field: string): ValidationError | null {
  if (value && isNaN(Date.parse(value))) {
    return { field, message: `${field} must be a valid date (YYYY-MM-DD)` };
  }
  return null;
}

// ── Collect and throw ─────────────────────────────────────────

export function validate(checks: (ValidationError | null)[]): void {
  const errors = checks.filter(Boolean) as ValidationError[];
  if (errors.length > 0) throw new ValidationException(errors);
}
