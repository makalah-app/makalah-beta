/**
 * Prompt Registry and Template Management System
 * 
 * Central registry for managing prompt templates with versioning,
 * validation, and dynamic loading capabilities for the academic AI system.
 * 
 * Features:
 * - Semantic versioning for prompt templates
 * - Template validation and compilation
 * - Dynamic template loading and caching
 * - A/B testing support for prompts
 * - Template inheritance and composition
 * 
 * @module PromptRegistry
 * @version 1.0.0
 */

import { AcademicPhase } from '../types';

/**
 * Prompt template metadata
 */
export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  version: string;
  phase: AcademicPhase;
  persona?: string;
  category: PromptCategory;
  content: string;
  variables: PromptVariable[];
  metadata: PromptMetadata;
  validation: PromptValidation;
  examples: PromptExample[];
  dependencies: string[];
  tags: string[];
  status: PromptStatus;
  createdAt: Date;
  updatedAt: Date;
  author: string;
}

/**
 * Prompt template categories
 */
export type PromptCategory = 
  | 'system'
  | 'instruction'
  | 'context'
  | 'formatting'
  | 'correction'
  | 'validation'
  | 'specialized';

/**
 * Prompt template status
 */
export type PromptStatus = 
  | 'draft'
  | 'testing'
  | 'active'
  | 'deprecated'
  | 'archived';

/**
 * Template variable definition
 */
export interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: unknown;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    enum?: string[];
  };
}

/**
 * Prompt metadata
 */
export interface PromptMetadata {
  language: 'id' | 'en';
  formalityLevel: 'low' | 'medium' | 'high' | 'very-high';
  complexity: 'simple' | 'moderate' | 'complex' | 'expert';
  tokenEstimate: {
    min: number;
    max: number;
    average: number;
  };
  performance: {
    responseTime: number;
    successRate: number;
    qualityScore: number;
  };
  usage: {
    totalUses: number;
    successfulUses: number;
    lastUsed: Date;
  };
}

/**
 * Prompt validation rules
 */
export interface PromptValidation {
  requiredVariables: string[];
  outputFormat: 'text' | 'json' | 'markdown' | 'structured';
  maxTokens?: number;
  minTokens?: number;
  contentRules: ValidationRule[];
  personaAlignment: boolean;
  academicStandards: boolean;
}

/**
 * Individual validation rule
 */
export interface ValidationRule {
  type: 'contains' | 'avoids' | 'format' | 'structure' | 'length';
  value: string | number | string[];
  severity: 'error' | 'warning' | 'info';
  message: string;
}

/**
 * Prompt example
 */
export interface PromptExample {
  name: string;
  description: string;
  input: Record<string, unknown>;
  expectedOutput: string;
  notes?: string;
}

/**
 * Template compilation result
 */
export interface CompiledTemplate {
  id: string;
  content: string;
  variables: Record<string, unknown>;
  metadata: PromptMetadata;
  compiledAt: Date;
  hash: string;
}

/**
 * Template version information
 */
export interface TemplateVersion {
  version: string;
  changes: string[];
  breakingChanges: boolean;
  migration?: string;
  createdAt: Date;
  author: string;
  status: PromptStatus;
}

/**
 * Registry configuration
 */
export interface RegistryConfig {
  baseDirectory: string;
  cacheEnabled: boolean;
  cacheTTL: number;
  validationStrict: boolean;
  autoVersioning: boolean;
  backupEnabled: boolean;
  migrationEnabled: boolean;
}

/**
 * Template search criteria
 */
export interface TemplateSearchCriteria {
  phase?: AcademicPhase;
  persona?: string;
  category?: PromptCategory;
  tags?: string[];
  status?: PromptStatus;
  version?: string;
  language?: 'id' | 'en';
  textSearch?: string;
}

/**
 * Template usage analytics
 */
export interface TemplateAnalytics {
  templateId: string;
  period: {
    start: Date;
    end: Date;
  };
  usage: {
    totalUses: number;
    uniqueUsers: number;
    averageResponseTime: number;
    successRate: number;
  };
  performance: {
    qualityScores: number[];
    tokenUsage: number[];
    errors: TemplateError[];
  };
  feedback: {
    userRatings: number[];
    improvements: string[];
  };
}

/**
 * Template error tracking
 */
export interface TemplateError {
  timestamp: Date;
  errorType: string;
  message: string;
  context: Record<string, unknown>;
  resolved: boolean;
}

/**
 * Prompt Registry Service
 * 
 * Central management system for all prompt templates
 */
export class PromptRegistryService {
  private templates: Map<string, PromptTemplate> = new Map();
  private versions: Map<string, TemplateVersion[]> = new Map();
  private cache: Map<string, CompiledTemplate> = new Map();
  private config: RegistryConfig;
  private analytics: Map<string, TemplateAnalytics> = new Map();

  constructor(config: RegistryConfig) {
    this.config = config;
    this.initializeRegistry();
  }

  /**
   * Register a new template
   */
  async registerTemplate(template: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = this.generateTemplateId(template.name, template.phase, template.version);
    
    const fullTemplate: PromptTemplate = {
      ...template,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Validate template
    const validation = await this.validateTemplate(fullTemplate);
    if (!validation.valid) {
      throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
    }

    // Check for version conflicts
    if (this.templates.has(id)) {
      throw new Error(`Template with ID ${id} already exists`);
    }

    // Register template
    this.templates.set(id, fullTemplate);

    // Track version
    this.trackVersion(id, fullTemplate.version, [], false, fullTemplate.author);

    // Initialize analytics
    this.initializeAnalytics(id);

    return id;
  }

  /**
   * Update existing template
   */
  async updateTemplate(
    id: string, 
    updates: Partial<PromptTemplate>,
    versionBump: 'major' | 'minor' | 'patch' = 'patch'
  ): Promise<string> {
    const existing = this.templates.get(id);
    if (!existing) {
      throw new Error(`Template ${id} not found`);
    }

    // Create new version
    const newVersion = this.bumpVersion(existing.version, versionBump);
    const newId = this.generateTemplateId(existing.name, existing.phase, newVersion);

    const updatedTemplate: PromptTemplate = {
      ...existing,
      ...updates,
      id: newId,
      version: newVersion,
      updatedAt: new Date()
    };

    // Validate updated template
    const validation = await this.validateTemplate(updatedTemplate);
    if (!validation.valid) {
      throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
    }

    // Register new version
    this.templates.set(newId, updatedTemplate);

    // Track version changes
    const changes = this.detectChanges(existing, updatedTemplate);
    const breakingChanges = this.hasBreakingChanges(existing, updatedTemplate);
    this.trackVersion(newId, newVersion, changes, breakingChanges, updatedTemplate.author);

    // Clear cache for old version
    this.clearTemplateCache(id);

    return newId;
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): PromptTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Search templates by criteria
   */
  searchTemplates(criteria: TemplateSearchCriteria): PromptTemplate[] {
    return Array.from(this.templates.values()).filter(template => {
      if (criteria.phase && template.phase !== criteria.phase) return false;
      if (criteria.persona && template.persona !== criteria.persona) return false;
      if (criteria.category && template.category !== criteria.category) return false;
      if (criteria.status && template.status !== criteria.status) return false;
      if (criteria.version && template.version !== criteria.version) return false;
      if (criteria.language && template.metadata.language !== criteria.language) return false;
      
      if (criteria.tags && criteria.tags.length > 0) {
        const hasAllTags = criteria.tags.every(tag => template.tags.includes(tag));
        if (!hasAllTags) return false;
      }
      
      if (criteria.textSearch) {
        const searchText = criteria.textSearch.toLowerCase();
        const searchableContent = [
          template.name,
          template.description,
          template.content,
          ...template.tags
        ].join(' ').toLowerCase();
        
        if (!searchableContent.includes(searchText)) return false;
      }
      
      return true;
    });
  }

  /**
   * Get latest version of template
   */
  getLatestVersion(name: string, phase: AcademicPhase): PromptTemplate | undefined {
    const candidates = Array.from(this.templates.values())
      .filter(t => t.name === name && t.phase === phase && t.status === 'active')
      .sort((a, b) => this.compareVersions(b.version, a.version));
    
    return candidates[0];
  }

  /**
   * Compile template with variables
   */
  async compileTemplate(
    templateId: string, 
    variables: Record<string, unknown>
  ): Promise<CompiledTemplate> {
    const cacheKey = `${templateId}-${this.hashVariables(variables)}`;
    
    // Check cache first
    if (this.config.cacheEnabled && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() - cached.compiledAt.getTime() < this.config.cacheTTL) {
        return cached;
      }
    }

    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Validate required variables
    const missingVariables = template.variables
      .filter(v => v.required && !(v.name in variables))
      .map(v => v.name);
    
    if (missingVariables.length > 0) {
      throw new Error(`Missing required variables: ${missingVariables.join(', ')}`);
    }

    // Validate variable types and values
    for (const variable of template.variables) {
      if (variable.name in variables) {
        const value = variables[variable.name];
        const validation = this.validateVariable(variable, value);
        if (!validation.valid) {
          throw new Error(`Variable ${variable.name} validation failed: ${validation.error}`);
        }
      }
    }

    // Compile template content
    const compiledContent = this.interpolateTemplate(template.content, variables);

    const compiled: CompiledTemplate = {
      id: templateId,
      content: compiledContent,
      variables,
      metadata: template.metadata,
      compiledAt: new Date(),
      hash: cacheKey
    };

    // Cache if enabled
    if (this.config.cacheEnabled) {
      this.cache.set(cacheKey, compiled);
    }

    return compiled;
  }

  /**
   * Get template versions
   */
  getTemplateVersions(templateId: string): TemplateVersion[] {
    return this.versions.get(templateId) || [];
  }

  /**
   * Deprecate template
   */
  deprecateTemplate(templateId: string, reason?: string): void {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    template.status = 'deprecated';
    template.updatedAt = new Date();
    
    if (reason) {
      template.metadata = {
        ...template.metadata,
        deprecationReason: reason
      } as any;
    }
  }

  /**
   * Archive template
   */
  archiveTemplate(templateId: string): void {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    template.status = 'archived';
    template.updatedAt = new Date();
    
    // Clear from cache
    this.clearTemplateCache(templateId);
  }

  /**
   * Get template analytics
   */
  getTemplateAnalytics(templateId: string): TemplateAnalytics | undefined {
    return this.analytics.get(templateId);
  }

  /**
   * Record template usage
   */
  recordUsage(
    templateId: string, 
    responseTime: number, 
    success: boolean, 
    qualityScore?: number,
    tokenCount?: number
  ): void {
    const analytics = this.analytics.get(templateId);
    if (!analytics) return;

    analytics.usage.totalUses++;
    if (success) {
      analytics.usage.uniqueUsers++; // Simplified - would track actual users
    }
    
    analytics.usage.averageResponseTime = 
      (analytics.usage.averageResponseTime * (analytics.usage.totalUses - 1) + responseTime) / 
      analytics.usage.totalUses;

    analytics.usage.successRate = 
      analytics.usage.totalUses > 0 ? 
      analytics.usage.uniqueUsers / analytics.usage.totalUses : 0;

    if (qualityScore !== undefined) {
      analytics.performance.qualityScores.push(qualityScore);
    }

    if (tokenCount !== undefined) {
      analytics.performance.tokenUsage.push(tokenCount);
    }

    // Update template metadata
    const template = this.templates.get(templateId);
    if (template) {
      template.metadata.usage.totalUses++;
      if (success) template.metadata.usage.successfulUses++;
      template.metadata.usage.lastUsed = new Date();
      
      if (qualityScore !== undefined) {
        template.metadata.performance.qualityScore = qualityScore;
      }
    }
  }

  /**
   * Export templates for backup
   */
  exportTemplates(): string {
    const exportData = {
      templates: Array.from(this.templates.values()),
      versions: Object.fromEntries(this.versions),
      analytics: Object.fromEntries(this.analytics),
      exportedAt: new Date()
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import templates from backup
   */
  importTemplates(data: string): void {
    try {
      const imported = JSON.parse(data);
      
      // Validate import data
      if (!imported.templates || !Array.isArray(imported.templates)) {
        throw new Error('Invalid import data format');
      }

      // Clear existing data
      this.templates.clear();
      this.versions.clear();
      this.analytics.clear();
      this.cache.clear();

      // Import templates
      for (const template of imported.templates) {
        this.templates.set(template.id, template);
      }

      // Import versions
      if (imported.versions) {
        this.versions = new Map(Object.entries(imported.versions));
      }

      // Import analytics
      if (imported.analytics) {
        this.analytics = new Map(Object.entries(imported.analytics));
      }

    } catch (error) {
      throw new Error(`Failed to import templates: ${error}`);
    }
  }

  /**
   * Private helper methods
   */
  private async validateTemplate(template: PromptTemplate): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!template.name.trim()) errors.push('Template name is required');
    if (!template.content.trim()) errors.push('Template content is required');
    if (!template.version.match(/^\d+\.\d+\.\d+$/)) errors.push('Version must be in semver format');

    // Content validation
    if (template.validation.contentRules) {
      for (const rule of template.validation.contentRules) {
        const ruleResult = this.validateContentRule(template.content, rule);
        if (!ruleResult.valid) {
          if (rule.severity === 'error') {
            errors.push(ruleResult.message);
          } else {
            warnings.push(ruleResult.message);
          }
        }
      }
    }

    // Variable validation
    const declaredVariables = template.variables.map(v => v.name);
    const usedVariables = this.extractVariables(template.content);
    const undeclared = usedVariables.filter(v => !declaredVariables.includes(v));
    const unused = declaredVariables.filter(v => !usedVariables.includes(v));

    if (undeclared.length > 0) {
      errors.push(`Undeclared variables: ${undeclared.join(', ')}`);
    }
    if (unused.length > 0) {
      warnings.push(`Unused variables: ${unused.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateContentRule(content: string, rule: ValidationRule): {
    valid: boolean;
    message: string;
  } {
    switch (rule.type) {
      case 'contains':
        if (Array.isArray(rule.value)) {
          const missing = (rule.value as string[]).filter(v => !content.includes(v));
          return {
            valid: missing.length === 0,
            message: missing.length > 0 ? `Missing required content: ${missing.join(', ')}` : ''
          };
        }
        return {
          valid: content.includes(rule.value as string),
          message: `Content must contain: ${rule.value}`
        };

      case 'avoids':
        if (Array.isArray(rule.value)) {
          const found = (rule.value as string[]).filter(v => content.includes(v));
          return {
            valid: found.length === 0,
            message: found.length > 0 ? `Content must avoid: ${found.join(', ')}` : ''
          };
        }
        return {
          valid: !content.includes(rule.value as string),
          message: `Content must avoid: ${rule.value}`
        };

      case 'length':
        const wordCount = content.trim().split(/\s+/).length;
        return {
          valid: wordCount >= (rule.value as number),
          message: `Content must be at least ${rule.value} words (current: ${wordCount})`
        };

      default:
        return { valid: true, message: '' };
    }
  }

  private validateVariable(variable: PromptVariable, value: unknown): {
    valid: boolean;
    error?: string;
  } {
    // Type validation
    const actualType = typeof value;
    if (variable.type === 'array' && !Array.isArray(value)) {
      return { valid: false, error: `Expected array, got ${actualType}` };
    }
    if (variable.type !== 'array' && variable.type !== actualType) {
      return { valid: false, error: `Expected ${variable.type}, got ${actualType}` };
    }

    // Validation rules
    if (variable.validation) {
      const val = variable.validation;
      
      if (val.pattern && typeof value === 'string') {
        const regex = new RegExp(val.pattern);
        if (!regex.test(value)) {
          return { valid: false, error: `Value doesn't match pattern: ${val.pattern}` };
        }
      }
      
      if (val.min !== undefined) {
        const num = typeof value === 'string' ? value.length : Number(value);
        if (num < val.min) {
          return { valid: false, error: `Value must be at least ${val.min}` };
        }
      }
      
      if (val.max !== undefined) {
        const num = typeof value === 'string' ? value.length : Number(value);
        if (num > val.max) {
          return { valid: false, error: `Value must be at most ${val.max}` };
        }
      }
      
      if (val.enum && !val.enum.includes(String(value))) {
        return { valid: false, error: `Value must be one of: ${val.enum.join(', ')}` };
      }
    }

    return { valid: true };
  }

  private interpolateTemplate(content: string, variables: Record<string, unknown>): string {
    return content.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      if (varName in variables) {
        return String(variables[varName]);
      }
      return match; // Keep placeholder if variable not found
    });
  }

  private extractVariables(content: string): string[] {
    const matches = content.match(/\{\{(\w+)\}\}/g) || [];
    return matches.map(match => match.slice(2, -2));
  }

  private generateTemplateId(name: string, phase: AcademicPhase, version: string): string {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `${phase}-${slug}-${version}`;
  }

  private bumpVersion(current: string, bump: 'major' | 'minor' | 'patch'): string {
    const [major, minor, patch] = current.split('.').map(Number);
    
    switch (bump) {
      case 'major':
        return `${major + 1}.0.0`;
      case 'minor':
        return `${major}.${minor + 1}.0`;
      case 'patch':
        return `${major}.${minor}.${patch + 1}`;
      default:
        return current;
    }
  }

  private compareVersions(a: string, b: string): number {
    const [aMajor, aMinor, aPatch] = a.split('.').map(Number);
    const [bMajor, bMinor, bPatch] = b.split('.').map(Number);
    
    if (aMajor !== bMajor) return aMajor - bMajor;
    if (aMinor !== bMinor) return aMinor - bMinor;
    return aPatch - bPatch;
  }

  private detectChanges(old: PromptTemplate, updated: PromptTemplate): string[] {
    const changes: string[] = [];
    
    if (old.content !== updated.content) changes.push('content');
    if (JSON.stringify(old.variables) !== JSON.stringify(updated.variables)) changes.push('variables');
    if (old.category !== updated.category) changes.push('category');
    if (JSON.stringify(old.tags) !== JSON.stringify(updated.tags)) changes.push('tags');
    
    return changes;
  }

  private hasBreakingChanges(old: PromptTemplate, updated: PromptTemplate): boolean {
    // Check if required variables were removed
    const oldRequired = old.variables.filter(v => v.required).map(v => v.name);
    const newRequired = updated.variables.filter(v => v.required).map(v => v.name);
    const removedRequired = oldRequired.filter(name => !newRequired.includes(name));
    
    return removedRequired.length > 0;
  }

  private trackVersion(
    templateId: string, 
    version: string, 
    changes: string[], 
    breakingChanges: boolean, 
    author: string
  ): void {
    if (!this.versions.has(templateId)) {
      this.versions.set(templateId, []);
    }
    
    this.versions.get(templateId)!.push({
      version,
      changes,
      breakingChanges,
      createdAt: new Date(),
      author,
      status: 'active'
    });
  }

  private initializeAnalytics(templateId: string): void {
    this.analytics.set(templateId, {
      templateId,
      period: {
        start: new Date(),
        end: new Date()
      },
      usage: {
        totalUses: 0,
        uniqueUsers: 0,
        averageResponseTime: 0,
        successRate: 0
      },
      performance: {
        qualityScores: [],
        tokenUsage: [],
        errors: []
      },
      feedback: {
        userRatings: [],
        improvements: []
      }
    });
  }

  private clearTemplateCache(templateId: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(templateId)) {
        this.cache.delete(key);
      }
    }
  }

  private hashVariables(variables: Record<string, unknown>): string {
    return Buffer.from(JSON.stringify(variables)).toString('base64').substr(0, 16);
  }

  private initializeRegistry(): void {
    // Initialize with default templates if needed
    // This would load templates from files or database
    this.loadDefaultTemplates();
  }

  private loadDefaultTemplates(): void {
    // Implementation would load templates from configuration or files
    // For now, this is a placeholder for the initialization process
  }
}

/**
 * Global prompt registry instance
 */
export const promptRegistry = new PromptRegistryService({
  baseDirectory: '/src/lib/ai/prompts/templates',
  cacheEnabled: true,
  cacheTTL: 300000, // 5 minutes
  validationStrict: true,
  autoVersioning: true,
  backupEnabled: true,
  migrationEnabled: true
});