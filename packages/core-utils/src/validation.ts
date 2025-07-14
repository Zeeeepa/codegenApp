/**
 * Validation utilities and helpers
 */

import { REGEX_PATTERNS } from './constants';

// Basic validation functions
export const isEmail = (email: string): boolean => {
  return REGEX_PATTERNS.EMAIL.test(email);
};

export const isUrl = (url: string): boolean => {
  return REGEX_PATTERNS.URL.test(url);
};

export const isGitHubRepo = (url: string): boolean => {
  return REGEX_PATTERNS.GITHUB_REPO.test(url);
};

export const isSemanticVersion = (version: string): boolean => {
  return REGEX_PATTERNS.SEMANTIC_VERSION.test(version);
};

export const isUuid = (uuid: string): boolean => {
  return REGEX_PATTERNS.UUID.test(uuid);
};

export const isSlug = (slug: string): boolean => {
  return REGEX_PATTERNS.SLUG.test(slug);
};

// String validation
export const isNotEmpty = (value: string): boolean => {
  return value.trim().length > 0;
};

export const hasMinLength = (value: string, minLength: number): boolean => {
  return value.length >= minLength;
};

export const hasMaxLength = (value: string, maxLength: number): boolean => {
  return value.length <= maxLength;
};

export const isAlphanumeric = (value: string): boolean => {
  return /^[a-zA-Z0-9]+$/.test(value);
};

export const isAlpha = (value: string): boolean => {
  return /^[a-zA-Z]+$/.test(value);
};

export const isNumeric = (value: string): boolean => {
  return /^[0-9]+$/.test(value);
};

// Number validation
export const isPositive = (value: number): boolean => {
  return value > 0;
};

export const isNonNegative = (value: number): boolean => {
  return value >= 0;
};

export const isInRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};

export const isInteger = (value: number): boolean => {
  return Number.isInteger(value);
};

// Array validation
export const isNonEmptyArray = <T>(array: T[]): boolean => {
  return Array.isArray(array) && array.length > 0;
};

export const hasMinItems = <T>(array: T[], minItems: number): boolean => {
  return Array.isArray(array) && array.length >= minItems;
};

export const hasMaxItems = <T>(array: T[], maxItems: number): boolean => {
  return Array.isArray(array) && array.length <= maxItems;
};

export const hasUniqueItems = <T>(array: T[]): boolean => {
  return Array.isArray(array) && new Set(array).size === array.length;
};

// Object validation
export const isObject = (value: any): value is object => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

export const hasProperty = (obj: object, property: string): boolean => {
  return Object.prototype.hasOwnProperty.call(obj, property);
};

export const hasRequiredProperties = (obj: object, properties: string[]): boolean => {
  return properties.every(prop => hasProperty(obj, prop));
};

// Date validation
export const isValidDate = (date: any): date is Date => {
  return date instanceof Date && !isNaN(date.getTime());
};

export const isDateString = (dateString: string): boolean => {
  const date = new Date(dateString);
  return isValidDate(date);
};

export const isFutureDate = (date: Date): boolean => {
  return isValidDate(date) && date.getTime() > Date.now();
};

export const isPastDate = (date: Date): boolean => {
  return isValidDate(date) && date.getTime() < Date.now();
};

// File validation
export const isValidFileExtension = (filename: string, allowedExtensions: string[]): boolean => {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return allowedExtensions.includes(extension);
};

export const isValidFileSize = (size: number, maxSize: number): boolean => {
  return size > 0 && size <= maxSize;
};

// JSON validation
export const isValidJson = (jsonString: string): boolean => {
  try {
    JSON.parse(jsonString);
    return true;
  } catch {
    return false;
  }
};

// Configuration validation
export const validateConfiguration = (config: any, schema: any): ValidationResult => {
  const errors: ValidationError[] = [];
  
  // Basic implementation - would be expanded with full JSON schema validation
  if (schema.required) {
    for (const field of schema.required) {
      if (!hasProperty(config, field)) {
        errors.push({
          field,
          message: `Required field '${field}' is missing`,
          code: 'REQUIRED_FIELD_MISSING',
        });
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

// Validation result types
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

// Validation rule types
export interface ValidationRule<T = any> {
  name: string;
  validator: (value: T) => boolean;
  message: string;
  code: string;
}

export interface ValidationSchema {
  [field: string]: ValidationRule[];
}

// Generic validator function
export const validate = <T extends Record<string, any>>(
  data: T,
  schema: ValidationSchema
): ValidationResult => {
  const errors: ValidationError[] = [];
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    
    for (const rule of rules) {
      if (!rule.validator(value)) {
        errors.push({
          field,
          message: rule.message,
          code: rule.code,
          value,
        });
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

// Common validation rules
export const validationRules = {
  required: <T>(message = 'This field is required'): ValidationRule<T> => ({
    name: 'required',
    validator: (value: T) => value !== null && value !== undefined && value !== '',
    message,
    code: 'REQUIRED',
  }),
  
  email: (message = 'Invalid email format'): ValidationRule<string> => ({
    name: 'email',
    validator: isEmail,
    message,
    code: 'INVALID_EMAIL',
  }),
  
  url: (message = 'Invalid URL format'): ValidationRule<string> => ({
    name: 'url',
    validator: isUrl,
    message,
    code: 'INVALID_URL',
  }),
  
  minLength: (min: number, message?: string): ValidationRule<string> => ({
    name: 'minLength',
    validator: (value: string) => hasMinLength(value, min),
    message: message || `Minimum length is ${min} characters`,
    code: 'MIN_LENGTH',
  }),
  
  maxLength: (max: number, message?: string): ValidationRule<string> => ({
    name: 'maxLength',
    validator: (value: string) => hasMaxLength(value, max),
    message: message || `Maximum length is ${max} characters`,
    code: 'MAX_LENGTH',
  }),
  
  pattern: (regex: RegExp, message = 'Invalid format'): ValidationRule<string> => ({
    name: 'pattern',
    validator: (value: string) => regex.test(value),
    message,
    code: 'INVALID_PATTERN',
  }),
  
  range: (min: number, max: number, message?: string): ValidationRule<number> => ({
    name: 'range',
    validator: (value: number) => isInRange(value, min, max),
    message: message || `Value must be between ${min} and ${max}`,
    code: 'OUT_OF_RANGE',
  }),
  
  positive: (message = 'Value must be positive'): ValidationRule<number> => ({
    name: 'positive',
    validator: isPositive,
    message,
    code: 'NOT_POSITIVE',
  }),
  
  integer: (message = 'Value must be an integer'): ValidationRule<number> => ({
    name: 'integer',
    validator: isInteger,
    message,
    code: 'NOT_INTEGER',
  }),
};

