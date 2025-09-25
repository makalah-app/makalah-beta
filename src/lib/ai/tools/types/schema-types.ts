/**
 * Simplified Schema Types - Natural LLM Intelligence Focus
 * Only includes basic schema validation for search functionality
 *
 * Based on cleanup philosophy: Remove programmatic control, enable natural conversation
 */

import type { z } from 'zod';

/**
 * Basic schema validation result
 */
export interface SchemaValidationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Simple schema type
 */
export type SimpleZodSchema<T = any> = z.ZodSchema<T>;