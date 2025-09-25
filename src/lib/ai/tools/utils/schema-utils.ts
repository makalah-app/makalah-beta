/**
 * Simplified Schema Utilities - Natural LLM Intelligence Focus
 * Basic validation for search functionality, trusting LLM intelligence
 *
 * Based on cleanup philosophy: Remove programmatic control, enable natural conversation
 */

import { z } from 'zod';
import type { SchemaValidationResult } from '../types/schema-types';

/**
 * Simple schema validation utilities
 */
export class SchemaUtils {
  /**
   * Basic validation with simple result
   */
  static validate<T>(schema: z.ZodSchema<T>, data: any): SchemaValidationResult<T> {
    try {
      const validatedData = schema.parse(data);
      return {
        success: true,
        data: validatedData,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  }

  /**
   * Safe parse with fallback value
   */
  static safeParse<T>(schema: z.ZodSchema<T>, data: any, fallback: T): T {
    const result = this.validate(schema, data);
    return result.success ? result.data! : fallback;
  }
}

// Export individual utilities
export const {
  validate,
  safeParse,
} = SchemaUtils;

// Export default
export default SchemaUtils;