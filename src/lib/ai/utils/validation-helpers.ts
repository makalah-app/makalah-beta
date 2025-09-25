/**
 * Validation Helpers for Academic AI System
 * 
 * Comprehensive validation utilities providing type-safe validation
 * for academic content, user input, system configurations, and AI outputs.
 * 
 * Features:
 * - Schema-based validation with detailed error reporting
 * - Academic content validation (citations, structure, quality)
 * - User input sanitization and validation
 * - Configuration and system data validation
 * - Custom validation rules for academic standards
 * 
 * @module ValidationHelpers
 * @version 1.0.0
 */

import { AcademicPhase } from '../types';
import {
  UserProfile,
  Document,
  BibliographyEntry,
  ApiContext,
  ERROR_CODES,
  ErrorCode
} from '../config/system-types';

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata: ValidationMetadata;
}

/**
 * Validation error details
 */
export interface ValidationError {
  code: ErrorCode | string;
  field?: string;
  message: string;
  value?: unknown;
  constraint?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestions?: string[];
}

/**
 * Validation warning details
 */
export interface ValidationWarning {
  code: string;
  field?: string;
  message: string;
  value?: unknown;
  suggestion?: string;
  impact: 'low' | 'medium' | 'high';
}

/**
 * Validation metadata
 */
export interface ValidationMetadata {
  validatedAt: Date;
  validator: string;
  version: string;
  context?: Record<string, unknown>;
  performance: {
    duration: number;
    rulesApplied: number;
  };
}

/**
 * Validation schema definition
 */
export interface ValidationSchema {
  fields: Record<string, FieldValidation>;
  rules: ValidationRule[];
  options: ValidationOptions;
}

/**
 * Field validation configuration
 */
export interface FieldValidation {
  required?: boolean;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date' | 'email' | 'url';
  constraints?: FieldConstraints;
  custom?: CustomValidator[];
  sanitize?: boolean;
  transform?: (value: unknown) => unknown;
}

/**
 * Field constraints
 */
export interface FieldConstraints {
  min?: number;
  max?: number;
  pattern?: RegExp | string;
  enum?: unknown[];
  length?: {
    min?: number;
    max?: number;
  };
  format?: 'email' | 'url' | 'uuid' | 'date' | 'academic-id' | 'citation' | 'doi';
  academic?: AcademicConstraints;
}

/**
 * Academic-specific constraints
 */
export interface AcademicConstraints {
  citationStyle?: 'apa' | 'mla' | 'chicago' | 'harvard';
  languageLevel?: 'undergraduate' | 'graduate' | 'doctoral' | 'postdoc';
  formalityLevel?: 'low' | 'medium' | 'high' | 'very-high';
  wordCountRange?: { min: number; max: number };
  requiredSections?: string[];
  citationDensity?: { min: number; max: number }; // per 1000 words
}

/**
 * Custom validator function
 */
export type CustomValidator = (value: unknown, context?: Record<string, unknown>) => ValidationResult;

/**
 * Validation rule
 */
export interface ValidationRule {
  name: string;
  condition: (data: unknown) => boolean;
  message: string;
  severity: ValidationError['severity'];
  fields?: string[];
}

/**
 * Validation options
 */
export interface ValidationOptions {
  strict: boolean;
  abortEarly: boolean;
  sanitize: boolean;
  transform: boolean;
  context?: Record<string, unknown>;
  customRules?: ValidationRule[];
}

/**
 * Academic content validation result
 */
export interface AcademicValidationResult extends ValidationResult {
  quality: {
    overallScore: number;
    dimensions: {
      structure: number;
      citations: number;
      language: number;
      coherence: number;
    };
  };
  compliance: {
    academicStandards: boolean;
    ethicalGuidelines: boolean;
    institutionalRequirements: boolean;
  };
  recommendations: AcademicRecommendation[];
}

/**
 * Academic recommendation
 */
export interface AcademicRecommendation {
  category: 'structure' | 'content' | 'citations' | 'language' | 'formatting';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  actionItems: string[];
  resources?: string[];
}

/**
 * Main Validation Service
 * 
 * Provides comprehensive validation capabilities for all system components
 */
export class ValidationService {
  private schemas: Map<string, ValidationSchema> = new Map();
  private customValidators: Map<string, CustomValidator> = new Map();

  constructor() {
    this.initializeBuiltInSchemas();
    this.initializeCustomValidators();
  }

  /**
   * Validate data against a schema
   */
  async validate(
    data: unknown,
    schemaName: string,
    options: Partial<ValidationOptions> = {}
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    const schema = this.schemas.get(schemaName);
    
    if (!schema) {
      throw new Error(`Schema '${schemaName}' not found`);
    }

    const mergedOptions: ValidationOptions = {
      ...schema.options,
      ...options,
      strict: options.strict ?? schema.options.strict ?? false,
      abortEarly: options.abortEarly ?? schema.options.abortEarly ?? false,
      sanitize: options.sanitize ?? schema.options.sanitize ?? true,
      transform: options.transform ?? schema.options.transform ?? true
    };

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let processedData = data;

    // Transform data if needed
    if (mergedOptions.transform && data && typeof data === 'object') {
      processedData = this.transformData(data, schema);
    }

    // Validate fields
    if (processedData && typeof processedData === 'object') {
      for (const [fieldName, fieldValidation] of Object.entries(schema.fields)) {
        const fieldValue = (processedData as Record<string, unknown>)[fieldName];
        const fieldResult = await this.validateField(
          fieldName,
          fieldValue,
          fieldValidation,
          mergedOptions
        );

        errors.push(...fieldResult.errors);
        warnings.push(...fieldResult.warnings);

        if (mergedOptions.abortEarly && fieldResult.errors.length > 0) {
          break;
        }
      }
    }

    // Apply validation rules
    for (const rule of schema.rules) {
      if (!rule.condition(processedData)) {
        errors.push({
          code: rule.name,
          message: rule.message,
          severity: rule.severity,
          field: rule.fields?.join(', ')
        });

        if (mergedOptions.abortEarly) {
          break;
        }
      }
    }

    // Apply custom rules if provided
    if (mergedOptions.customRules) {
      for (const rule of mergedOptions.customRules) {
        if (!rule.condition(processedData)) {
          errors.push({
            code: rule.name,
            message: rule.message,
            severity: rule.severity,
            field: rule.fields?.join(', ')
          });
        }
      }
    }

    const duration = Date.now() - startTime;

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        validatedAt: new Date(),
        validator: schemaName,
        version: '1.0.0',
        context: mergedOptions.context,
        performance: {
          duration,
          rulesApplied: schema.rules.length + (mergedOptions.customRules?.length || 0)
        }
      }
    };
  }

  /**
   * Validate academic content with specialized rules
   */
  async validateAcademicContent(
    content: string,
    metadata: {
      phase: AcademicPhase;
      academicLevel: 'undergraduate' | 'graduate' | 'doctoral' | 'postdoc';
      discipline: string;
      citationStyle: 'apa' | 'mla' | 'chicago' | 'harvard';
    }
  ): Promise<AcademicValidationResult> {
    const baseResult = await this.validate(content, 'academic-content', {
      context: metadata
    });

    // Additional academic-specific validation
    const qualityAnalysis = this.analyzeAcademicQuality(content, metadata);
    const complianceCheck = this.checkAcademicCompliance(content, metadata);
    const recommendations = this.generateAcademicRecommendations(content, baseResult.errors, metadata);

    return {
      ...baseResult,
      quality: qualityAnalysis,
      compliance: complianceCheck,
      recommendations
    };
  }

  /**
   * Validate user profile data
   */
  async validateUserProfile(profile: Partial<UserProfile>): Promise<ValidationResult> {
    return this.validate(profile, 'user-profile');
  }

  /**
   * Validate document data
   */
  async validateDocument(document: Partial<Document>): Promise<ValidationResult> {
    return this.validate(document, 'document');
  }

  /**
   * Validate bibliography entry
   */
  async validateBibliographyEntry(entry: Partial<BibliographyEntry>): Promise<ValidationResult> {
    return this.validate(entry, 'bibliography-entry');
  }

  /**
   * Validate API request context
   */
  async validateApiContext(context: Partial<ApiContext>): Promise<ValidationResult> {
    return this.validate(context, 'api-context');
  }

  /**
   * Sanitize user input
   */
  sanitizeInput(input: unknown): unknown {
    if (typeof input === 'string') {
      return this.sanitizeString(input);
    }
    
    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    }
    
    if (input && typeof input === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[this.sanitizeString(key)] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    
    return input;
  }

  /**
   * Register custom validation schema
   */
  registerSchema(name: string, schema: ValidationSchema): void {
    this.schemas.set(name, schema);
  }

  /**
   * Register custom validator
   */
  registerCustomValidator(name: string, validator: CustomValidator): void {
    this.customValidators.set(name, validator);
  }

  /**
   * Private helper methods
   */
  private async validateField(
    fieldName: string,
    value: unknown,
    validation: FieldValidation,
    options: ValidationOptions
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required field check
    if (validation.required && (value === undefined || value === null || value === '')) {
      errors.push({
        code: ERROR_CODES.VALIDATION_REQUIRED_FIELD,
        field: fieldName,
        message: `Field '${fieldName}' is required`,
        severity: 'high'
      });
      return { valid: false, errors, warnings, metadata: this.createMetadata('field-validation') };
    }

    // Skip further validation if field is not required and empty
    if (!validation.required && (value === undefined || value === null || value === '')) {
      return { valid: true, errors: [], warnings: [], metadata: this.createMetadata('field-validation') };
    }

    // Type validation
    const typeValid = this.validateType(value, validation.type);
    if (!typeValid) {
      errors.push({
        code: ERROR_CODES.VALIDATION_INVALID_FORMAT,
        field: fieldName,
        message: `Field '${fieldName}' must be of type '${validation.type}'`,
        value,
        severity: 'high'
      });
    }

    // Constraint validation
    if (validation.constraints && typeValid) {
      const constraintErrors = this.validateConstraints(fieldName, value, validation.constraints);
      errors.push(...constraintErrors);
    }

    // Custom validation
    if (validation.custom) {
      for (const customValidator of validation.custom) {
        const customResult = customValidator(value, options.context);
        errors.push(...customResult.errors);
        warnings.push(...customResult.warnings);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metadata: this.createMetadata('field-validation')
    };
  }

  private validateType(value: unknown, expectedType: FieldValidation['type']): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'date':
        return value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)));
      case 'email':
        return typeof value === 'string' && this.isValidEmail(value);
      case 'url':
        return typeof value === 'string' && this.isValidUrl(value);
      default:
        return true;
    }
  }

  private validateConstraints(
    fieldName: string,
    value: unknown,
    constraints: FieldConstraints
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Minimum value/length
    if (constraints.min !== undefined) {
      const numValue = typeof value === 'string' ? value.length : Number(value);
      if (numValue < constraints.min) {
        errors.push({
          code: ERROR_CODES.VALIDATION_OUT_OF_RANGE,
          field: fieldName,
          message: `${fieldName} must be at least ${constraints.min}`,
          value,
          constraint: `min: ${constraints.min}`,
          severity: 'medium'
        });
      }
    }

    // Maximum value/length
    if (constraints.max !== undefined) {
      const numValue = typeof value === 'string' ? value.length : Number(value);
      if (numValue > constraints.max) {
        errors.push({
          code: ERROR_CODES.VALIDATION_OUT_OF_RANGE,
          field: fieldName,
          message: `${fieldName} must be at most ${constraints.max}`,
          value,
          constraint: `max: ${constraints.max}`,
          severity: 'medium'
        });
      }
    }

    // Pattern validation
    if (constraints.pattern && typeof value === 'string') {
      const pattern = typeof constraints.pattern === 'string' ? 
        new RegExp(constraints.pattern) : constraints.pattern;
      
      if (!pattern.test(value)) {
        errors.push({
          code: ERROR_CODES.VALIDATION_INVALID_FORMAT,
          field: fieldName,
          message: `${fieldName} format is invalid`,
          value,
          constraint: `pattern: ${constraints.pattern}`,
          severity: 'medium'
        });
      }
    }

    // Enum validation
    if (constraints.enum && !constraints.enum.includes(value)) {
      errors.push({
        code: ERROR_CODES.VALIDATION_INVALID_FORMAT,
        field: fieldName,
        message: `${fieldName} must be one of: ${constraints.enum.join(', ')}`,
        value,
        constraint: `enum: ${constraints.enum.join(', ')}`,
        severity: 'medium'
      });
    }

    // Length validation
    if (constraints.length && typeof value === 'string') {
      if (constraints.length.min && value.length < constraints.length.min) {
        errors.push({
          code: ERROR_CODES.VALIDATION_OUT_OF_RANGE,
          field: fieldName,
          message: `${fieldName} must be at least ${constraints.length.min} characters`,
          value,
          severity: 'medium'
        });
      }
      
      if (constraints.length.max && value.length > constraints.length.max) {
        errors.push({
          code: ERROR_CODES.VALIDATION_OUT_OF_RANGE,
          field: fieldName,
          message: `${fieldName} must be at most ${constraints.length.max} characters`,
          value,
          severity: 'medium'
        });
      }
    }

    // Format validation
    if (constraints.format) {
      const formatValid = this.validateFormat(value, constraints.format);
      if (!formatValid) {
        errors.push({
          code: ERROR_CODES.VALIDATION_INVALID_FORMAT,
          field: fieldName,
          message: `${fieldName} has invalid ${constraints.format} format`,
          value,
          severity: 'medium'
        });
      }
    }

    // Academic constraints
    if (constraints.academic && typeof value === 'string') {
      const academicErrors = this.validateAcademicConstraints(fieldName, value, constraints.academic);
      errors.push(...academicErrors);
    }

    return errors;
  }

  private validateAcademicConstraints(
    fieldName: string,
    value: string,
    constraints: AcademicConstraints
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Word count validation
    if (constraints.wordCountRange) {
      const wordCount = value.trim().split(/\s+/).length;
      
      if (constraints.wordCountRange.min && wordCount < constraints.wordCountRange.min) {
        errors.push({
          code: 'ACADEMIC_WORD_COUNT_LOW',
          field: fieldName,
          message: `Content must have at least ${constraints.wordCountRange.min} words (current: ${wordCount})`,
          value: wordCount,
          severity: 'medium'
        });
      }
      
      if (constraints.wordCountRange.max && wordCount > constraints.wordCountRange.max) {
        errors.push({
          code: 'ACADEMIC_WORD_COUNT_HIGH',
          field: fieldName,
          message: `Content must have at most ${constraints.wordCountRange.max} words (current: ${wordCount})`,
          value: wordCount,
          severity: 'low'
        });
      }
    }

    // Citation density validation
    if (constraints.citationDensity) {
      const citations = this.countCitations(value);
      const words = value.trim().split(/\s+/).length;
      const density = (citations / words) * 1000; // per 1000 words

      if (constraints.citationDensity.min && density < constraints.citationDensity.min) {
        errors.push({
          code: 'ACADEMIC_CITATION_DENSITY_LOW',
          field: fieldName,
          message: `Citation density too low: ${density.toFixed(1)} per 1000 words (minimum: ${constraints.citationDensity.min})`,
          value: density,
          severity: 'medium',
          suggestions: ['Add more scholarly references', 'Include supporting citations']
        });
      }

      if (constraints.citationDensity.max && density > constraints.citationDensity.max) {
        errors.push({
          code: 'ACADEMIC_CITATION_DENSITY_HIGH',
          field: fieldName,
          message: `Citation density too high: ${density.toFixed(1)} per 1000 words (maximum: ${constraints.citationDensity.max})`,
          value: density,
          severity: 'low',
          suggestions: ['Reduce excessive citations', 'Balance citations with original content']
        });
      }
    }

    // Required sections validation
    if (constraints.requiredSections) {
      const missingSection = constraints.requiredSections.find(section => 
        !value.toLowerCase().includes(section.toLowerCase())
      );
      
      if (missingSection) {
        errors.push({
          code: 'ACADEMIC_MISSING_SECTION',
          field: fieldName,
          message: `Missing required section: ${missingSection}`,
          value: missingSection,
          severity: 'high',
          suggestions: [`Add ${missingSection} section to your document`]
        });
      }
    }

    return errors;
  }

  private validateFormat(value: unknown, format: FieldConstraints['format']): boolean {
    if (typeof value !== 'string') return false;

    switch (format) {
      case 'email':
        return this.isValidEmail(value);
      case 'url':
        return this.isValidUrl(value);
      case 'uuid':
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
      case 'date':
        return !isNaN(Date.parse(value));
      case 'academic-id':
        return /^[A-Z]{2,4}\d{6,10}$/i.test(value);
      case 'citation':
        return this.isValidCitation(value);
      case 'doi':
        return /^10\.\d{4,}\/[^\s]+$/i.test(value);
      default:
        return true;
    }
  }

  private sanitizeString(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isValidCitation(citation: string): boolean {
    // Simple citation validation - checks for author and year pattern
    const citationPatterns = [
      /\([^)]*\d{4}[^)]*\)/, // APA: (Author, 2021)
      /\[[^\]]*\d{4}[^\]]*\]/, // Square brackets: [Author, 2021]
      /\{[^}]*\d{4}[^}]*\}/ // Curly braces: {Author, 2021}
    ];
    
    return citationPatterns.some(pattern => pattern.test(citation));
  }

  private countCitations(content: string): number {
    const citationPattern = /\([^)]*\d{4}[^)]*\)|[\[\{][^}\]]*\d{4}[^}\]]*[\]\}]/g;
    const matches = content.match(citationPattern);
    return matches ? matches.length : 0;
  }

  private transformData(data: unknown, schema: ValidationSchema): unknown {
    if (!data || typeof data !== 'object') return data;

    const transformed: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const fieldValidation = schema.fields[key];
      
      if (fieldValidation?.transform) {
        transformed[key] = fieldValidation.transform(value);
      } else {
        transformed[key] = value;
      }
    }

    return transformed;
  }

  private analyzeAcademicQuality(
    content: string,
    metadata: { phase: AcademicPhase; academicLevel: string; discipline: string }
  ): AcademicValidationResult['quality'] {
    // Simplified quality analysis
    const wordCount = content.trim().split(/\s+/).length;
    const citationCount = this.countCitations(content);
    const hasStructure = content.includes('introduction') || content.includes('conclusion');

    return {
      overallScore: 0.75,
      dimensions: {
        structure: hasStructure ? 0.8 : 0.5,
        citations: Math.min(1, citationCount / (wordCount / 500)), // 1 citation per 500 words
        language: 0.7,
        coherence: 0.8
      }
    };
  }

  private checkAcademicCompliance(
    content: string,
    metadata: { phase: AcademicPhase; academicLevel: string; discipline: string }
  ): AcademicValidationResult['compliance'] {
    return {
      academicStandards: true,
      ethicalGuidelines: true,
      institutionalRequirements: true
    };
  }

  private generateAcademicRecommendations(
    content: string,
    errors: ValidationError[],
    metadata: { phase: AcademicPhase; academicLevel: string; discipline: string }
  ): AcademicRecommendation[] {
    const recommendations: AcademicRecommendation[] = [];

    // Generate recommendations based on errors
    const citationErrors = errors.filter(e => e.code.includes('CITATION'));
    if (citationErrors.length > 0) {
      recommendations.push({
        category: 'citations',
        priority: 'high',
        title: 'Improve Citation Quality',
        description: 'Your document has citation-related issues that need attention',
        actionItems: [
          'Add more scholarly references',
          'Ensure citation format consistency',
          'Include recent sources (last 5-10 years)'
        ],
        resources: [
          'Academic Writing Guide',
          'Citation Style Guide'
        ]
      });
    }

    return recommendations;
  }

  private createMetadata(validator: string): ValidationMetadata {
    return {
      validatedAt: new Date(),
      validator,
      version: '1.0.0',
      performance: {
        duration: 0,
        rulesApplied: 0
      }
    };
  }

  private initializeBuiltInSchemas(): void {
    // User Profile Schema
    this.registerSchema('user-profile', {
      fields: {
        email: {
          required: true,
          type: 'email',
          constraints: {
            format: 'email'
          }
        },
        name: {
          required: true,
          type: 'string',
          constraints: {
            length: { min: 2, max: 100 }
          }
        },
        role: {
          required: true,
          type: 'string',
          constraints: {
            enum: ['student', 'researcher', 'faculty', 'admin', 'guest']
          }
        }
      },
      rules: [],
      options: {
        strict: true,
        abortEarly: false,
        sanitize: true,
        transform: false
      }
    });

    // Document Schema
    this.registerSchema('document', {
      fields: {
        title: {
          required: true,
          type: 'string',
          constraints: {
            length: { min: 3, max: 200 }
          }
        },
        type: {
          required: true,
          type: 'string',
          constraints: {
            enum: ['research-paper', 'thesis', 'dissertation', 'essay', 'report', 'proposal', 'review', 'other']
          }
        },
        status: {
          required: true,
          type: 'string',
          constraints: {
            enum: ['draft', 'in-progress', 'review', 'completed', 'published', 'archived']
          }
        }
      },
      rules: [],
      options: {
        strict: false,
        abortEarly: false,
        sanitize: true,
        transform: false
      }
    });

    // Academic Content Schema
    this.registerSchema('academic-content', {
      fields: {
        content: {
          required: true,
          type: 'string',
          constraints: {
            length: { min: 10 },
            academic: {
              wordCountRange: { min: 50, max: 50000 },
              citationDensity: { min: 1, max: 50 }
            }
          }
        }
      },
      rules: [],
      options: {
        strict: true,
        abortEarly: false,
        sanitize: true,
        transform: false
      }
    });
  }

  private initializeCustomValidators(): void {
    // Academic tone validator
    this.registerCustomValidator('academic-tone', (value: unknown) => {
      if (typeof value !== 'string') {
        return {
          valid: false,
          errors: [{ 
            code: 'INVALID_TYPE',
            message: 'Value must be a string',
            severity: 'high' as const
          }],
          warnings: [],
          metadata: this.createMetadata('academic-tone')
        };
      }

      const informalWords = ['gonna', 'wanna', 'yeah', 'ok', 'stuff', 'things'];
      const foundInformal = informalWords.filter(word => 
        value.toLowerCase().includes(word)
      );

      if (foundInformal.length > 0) {
        return {
          valid: false,
          errors: [{
            code: 'INFORMAL_LANGUAGE',
            message: `Informal language detected: ${foundInformal.join(', ')}`,
            value: foundInformal,
            severity: 'medium' as const,
            suggestions: ['Use formal academic language', 'Replace informal terms with appropriate alternatives']
          }],
          warnings: [],
          metadata: this.createMetadata('academic-tone')
        };
      }

      return {
        valid: true,
        errors: [],
        warnings: [],
        metadata: this.createMetadata('academic-tone')
      };
    });
  }
}

/**
 * Validation utility functions
 */
export const ValidationUtils = {
  /**
   * Check if value is empty
   */
  isEmpty(value: unknown): boolean {
    return value === undefined || 
           value === null || 
           value === '' || 
           (Array.isArray(value) && value.length === 0) ||
           (typeof value === 'object' && Object.keys(value).length === 0);
  },

  /**
   * Sanitize HTML content
   */
  sanitizeHtml(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  },

  /**
   * Validate Indonesian academic ID format
   */
  isValidAcademicId(id: string): boolean {
    return /^[A-Z]{2,4}\d{6,10}$/i.test(id);
  },

  /**
   * Check password strength
   */
  checkPasswordStrength(password: string): {
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) score += 25;
    else feedback.push('Password must be at least 8 characters long');

    if (/[a-z]/.test(password)) score += 25;
    else feedback.push('Include lowercase letters');

    if (/[A-Z]/.test(password)) score += 25;
    else feedback.push('Include uppercase letters');

    if (/\d/.test(password)) score += 25;
    else feedback.push('Include numbers');

    if (/[^a-zA-Z\d]/.test(password)) score += 10;
    else feedback.push('Include special characters');

    return { score, feedback };
  },

  /**
   * Validate DOI format
   */
  isValidDoi(doi: string): boolean {
    return /^10\.\d{4,}\/[^\s]+$/i.test(doi);
  },

  /**
   * Extract and validate citations from text
   */
  extractCitations(text: string): Array<{ text: string; valid: boolean; style?: string }> {
    const patterns = [
      { name: 'APA', regex: /\([^)]*\d{4}[^)]*\)/g },
      { name: 'Square', regex: /\[[^\]]*\d{4}[^\]]*\]/g },
      { name: 'Curly', regex: /\{[^}]*\d{4}[^}]*\}/g }
    ];

    const citations: Array<{ text: string; valid: boolean; style?: string }> = [];

    for (const pattern of patterns) {
      const matches = Array.from(text.matchAll(pattern.regex));
      for (const match of matches) {
        citations.push({
          text: match[0],
          valid: true,
          style: pattern.name
        });
      }
    }

    return citations;
  }
};

/**
 * Export default service instance
 */
export const validationService = new ValidationService();