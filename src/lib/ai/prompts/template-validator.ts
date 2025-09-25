/**
 * Prompt Template Validation System
 * Quality assurance and validation framework for academic prompt templates
 * 
 * Based on Vercel AI SDK v5 patterns from:
 * - /documentation/docs/03-ai-sdk-core/20-prompt-engineering.mdx
 * - /documentation/docs/06-advanced/01-prompt-engineering.mdx
 */

import type { 
  AcademicPhase, 
  AcademicContext, 
  CitationStyle,
  AcademicLevel,
  DocumentType
} from '../types';
import type { PromptTemplate, CompiledTemplate } from './template-registry';
// Note: PersonaConfig import removed - not used in this file

/**
 * Validation result interface
 */
export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;
  
  /** Validation score (0-100) */
  score: number;
  
  /** Critical errors that prevent template usage */
  criticalErrors: ValidationError[];
  
  /** Warnings that should be addressed */
  warnings: ValidationWarning[];
  
  /** Suggestions for improvement */
  suggestions: string[];
  
  /** Detailed validation report */
  report: ValidationReport;
}

/**
 * Validation error interface
 */
export interface ValidationError {
  /** Error code */
  code: string;
  
  /** Error message */
  message: string;
  
  /** Error severity */
  severity: 'critical' | 'major' | 'minor';
  
  /** Location of error */
  location?: string;
  
  /** Suggested fix */
  suggestedFix?: string;
}

/**
 * Validation warning interface
 */
export interface ValidationWarning {
  /** Warning code */
  code: string;
  
  /** Warning message */
  message: string;
  
  /** Warning category */
  category: 'performance' | 'quality' | 'compliance' | 'usability';
  
  /** Impact level */
  impact: 'high' | 'medium' | 'low';
  
  /** Recommendation */
  recommendation?: string;
}

/**
 * Detailed validation report
 */
export interface ValidationReport {
  /** Template metadata validation */
  metadata: MetadataValidation;
  
  /** Content structure validation */
  structure: StructureValidation;
  
  /** Variable consistency validation */
  variables: VariableValidation;
  
  /** Quality requirements validation */
  quality: QualityValidation;
  
  /** Academic compliance validation */
  academic: AcademicValidation;
  
  /** Performance metrics validation */
  performance: PerformanceValidation;
  
  /** Compilation validation */
  compilation: CompilationValidation;
}

/**
 * Metadata validation results
 */
export interface MetadataValidation {
  hasRequiredFields: boolean;
  versionFormatValid: boolean;
  phaseAppropriate: boolean;
  supportConfigurationValid: boolean;
  tagsAppropriate: boolean;
  estimationRealistic: boolean;
  score: number;
  issues: string[];
}

/**
 * Structure validation results
 */
export interface StructureValidation {
  contentPresent: boolean;
  structureLogical: boolean;
  sectionsBalanced: boolean;
  instructionsClear: boolean;
  formatConsistent: boolean;
  score: number;
  issues: string[];
}

/**
 * Variable validation results
 */
export interface VariableValidation {
  variablesDeclared: boolean;
  placeholdersConsistent: boolean;
  requiredVariablesUsed: boolean;
  optionalVariablesAppropriate: boolean;
  noUndeclaredVariables: boolean;
  score: number;
  issues: string[];
}

/**
 * Quality validation results
 */
export interface QualityValidation {
  academicToneAppropriate: boolean;
  instructionsClear: boolean;
  objectivesWellDefined: boolean;
  qualityStandardsClear: boolean;
  examplesHelpful: boolean;
  score: number;
  issues: string[];
}

/**
 * Academic compliance validation
 */
export interface AcademicValidation {
  citationRulesStrict: boolean;
  hallucinationPrevention: boolean;
  academicIntegrityEmphasized: boolean;
  levelAppropriate: boolean;
  disciplineAware: boolean;
  score: number;
  issues: string[];
}

/**
 * Performance validation results
 */
export interface PerformanceValidation {
  tokenEstimationRealistic: boolean;
  temperatureAppropriate: boolean;
  complexityManageable: boolean;
  executionEfficient: boolean;
  scalabilityConsidered: boolean;
  score: number;
  issues: string[];
}

/**
 * Compilation validation results
 */
export interface CompilationValidation {
  compilesSuccessfully: boolean;
  outputWellFormed: boolean;
  warningsMinimal: boolean;
  errorHandlingRobust: boolean;
  edgeCasesHandled: boolean;
  score: number;
  issues: string[];
}

/**
 * Validation configuration
 */
export interface ValidationConfig {
  /** Strict mode enables additional checks */
  strictMode: boolean;
  
  /** Include performance validation */
  includePerformance: boolean;
  
  /** Include compilation validation */
  includeCompilation: boolean;
  
  /** Minimum passing score */
  minimumScore: number;
  
  /** Maximum acceptable warnings */
  maxWarnings: number;
  
  /** Custom validation rules */
  customRules: CustomValidationRule[];
}

/**
 * Custom validation rule
 */
export interface CustomValidationRule {
  /** Rule identifier */
  id: string;
  
  /** Rule description */
  description: string;
  
  /** Rule category */
  category: 'content' | 'structure' | 'compliance' | 'performance';
  
  /** Validation function */
  validator: (template: PromptTemplate) => ValidationError[];
  
  /** Rule weight in scoring */
  weight: number;
}

/**
 * Test case for template validation
 */
export interface TemplateTestCase {
  /** Test case name */
  name: string;
  
  /** Test variables */
  variables: Record<string, any>;
  
  /** Expected output characteristics */
  expectedOutput: {
    minLength?: number;
    maxLength?: number;
    requiredElements?: string[];
    forbiddenElements?: string[];
    qualityExpectations?: Record<string, number>;
  };
  
  /** Academic context for test */
  academicContext: AcademicContext;
}

/**
 * Template Validator Class
 */
export class TemplateValidator {
  private config: ValidationConfig;
  private customRules: Map<string, CustomValidationRule> = new Map();

  constructor(config?: Partial<ValidationConfig>) {
    this.config = {
      strictMode: true,
      includePerformance: true,
      includeCompilation: true,
      minimumScore: 75,
      maxWarnings: 5,
      customRules: [],
      ...config
    };

    this.initializeCustomRules();
  }

  /**
   * Validate a prompt template comprehensively
   */
  async validateTemplate(template: PromptTemplate): Promise<ValidationResult> {
    const criticalErrors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];

    // Perform all validation checks
    const metadataValidation = this.validateMetadata(template);
    const structureValidation = this.validateStructure(template);
    const variableValidation = this.validateVariables(template);
    const qualityValidation = this.validateQuality(template);
    const academicValidation = this.validateAcademicCompliance(template);
    const performanceValidation = this.config.includePerformance ? 
      this.validatePerformance(template) : 
      this.createEmptyPerformanceValidation();
    const compilationValidation = this.config.includeCompilation ? 
      await this.validateCompilation(template) : 
      this.createEmptyCompilationValidation();

    // Collect errors and warnings
    this.collectValidationIssues(
      [metadataValidation, structureValidation, variableValidation, 
       qualityValidation, academicValidation, performanceValidation, compilationValidation],
      criticalErrors,
      warnings
    );

    // Run custom validation rules
    for (const rule of this.config.customRules) {
      const ruleErrors = rule.validator(template);
      criticalErrors.push(...ruleErrors);
    }

    // Calculate overall score
    const score = this.calculateOverallScore([
      metadataValidation, structureValidation, variableValidation,
      qualityValidation, academicValidation, performanceValidation, compilationValidation
    ]);

    // Generate suggestions
    suggestions.push(...this.generateSuggestions(template, [
      metadataValidation, structureValidation, variableValidation,
      qualityValidation, academicValidation, performanceValidation, compilationValidation
    ]));

    const isValid = criticalErrors.length === 0 && 
                   score >= this.config.minimumScore && 
                   warnings.length <= this.config.maxWarnings;

    return {
      isValid,
      score,
      criticalErrors,
      warnings,
      suggestions,
      report: {
        metadata: metadataValidation,
        structure: structureValidation,
        variables: variableValidation,
        quality: qualityValidation,
        academic: academicValidation,
        performance: performanceValidation,
        compilation: compilationValidation
      }
    };
  }

  /**
   * Validate template with test cases
   */
  async validateWithTestCases(
    template: PromptTemplate, 
    testCases: TemplateTestCase[]
  ): Promise<ValidationResult> {
    const baseValidation = await this.validateTemplate(template);
    
    // Run test cases
    const testResults: Array<{
      testCase: TemplateTestCase;
      success: boolean;
      issues: string[];
    }> = [];

    for (const testCase of testCases) {
      try {
        const result = await this.runTestCase(template, testCase);
        testResults.push(result);
      } catch (error) {
        testResults.push({
          testCase,
          success: false,
          issues: [`Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
        });
      }
    }

    // Adjust validation result based on test outcomes
    const failedTests = testResults.filter(r => !r.success);
    if (failedTests.length > 0) {
      baseValidation.criticalErrors.push({
        code: 'TEST_FAILURES',
        message: `${failedTests.length} out of ${testCases.length} test cases failed`,
        severity: 'major',
        location: 'test_execution',
        suggestedFix: 'Review and fix template to handle all test scenarios'
      });
      
      baseValidation.isValid = false;
      baseValidation.score = Math.max(0, baseValidation.score - (failedTests.length * 10));
    }

    // Add test-specific suggestions
    baseValidation.suggestions.push(...this.generateTestBasedSuggestions(testResults));

    return baseValidation;
  }

  /**
   * Validate template metadata
   */
  private validateMetadata(template: PromptTemplate): MetadataValidation {
    const issues: string[] = [];
    let score = 100;

    // Check required fields
    const hasRequiredFields = !!(template.id && template.name && template.version && template.phase);
    if (!hasRequiredFields) {
      issues.push('Missing required fields (id, name, version, or phase)');
      score -= 20;
    }

    // Check version format
    const versionFormatValid = /^\d+\.\d+\.\d+$/.test(template.version);
    if (!versionFormatValid) {
      issues.push('Version must follow semantic versioning format (x.y.z)');
      score -= 10;
    }

    // Check phase appropriateness
    const validPhases: AcademicPhase[] = [
      'research_analysis', 'outline_generation', 'content_drafting',
      'citation_integration', 'structure_refinement', 'quality_review', 'final_formatting'
    ];
    const phaseAppropriate = validPhases.includes(template.phase);
    if (!phaseAppropriate) {
      issues.push('Invalid or inappropriate academic phase');
      score -= 15;
    }

    // Check support configurations
    const supportConfigurationValid = 
      template.supportedLevels.length > 0 &&
      template.supportedDocumentTypes.length > 0 &&
      template.supportedCitationStyles.length > 0;
    if (!supportConfigurationValid) {
      issues.push('Support configurations incomplete (levels, document types, or citation styles)');
      score -= 10;
    }

    // Check tags appropriateness
    const tagsAppropriate = template.tags.length >= 2 && template.tags.length <= 10;
    if (!tagsAppropriate) {
      issues.push('Should have 2-10 descriptive tags for categorization');
      score -= 5;
    }

    // Check token estimation realism
    const estimationRealistic = 
      template.estimatedTokens.min > 0 &&
      template.estimatedTokens.max > template.estimatedTokens.min &&
      template.estimatedTokens.max < 10000;
    if (!estimationRealistic) {
      issues.push('Token estimation appears unrealistic or missing');
      score -= 10;
    }

    return {
      hasRequiredFields,
      versionFormatValid,
      phaseAppropriate,
      supportConfigurationValid,
      tagsAppropriate,
      estimationRealistic,
      score: Math.max(0, score),
      issues
    };
  }

  /**
   * Validate template structure
   */
  private validateStructure(template: PromptTemplate): StructureValidation {
    const issues: string[] = [];
    let score = 100;

    // Check content presence
    const contentPresent = !!(template.content && template.content.length > 50);
    if (!contentPresent) {
      issues.push('Template content is missing or too short');
      score -= 30;
    }

    // Check logical structure
    const structureLogical = this.hasLogicalStructure(template.content);
    if (!structureLogical) {
      issues.push('Template lacks clear logical structure or organization');
      score -= 20;
    }

    // Check section balance
    const sectionsBalanced = this.hasSectionsBalanced(template.content);
    if (!sectionsBalanced) {
      issues.push('Template sections appear unbalanced or poorly proportioned');
      score -= 10;
    }

    // Check instruction clarity
    const instructionsClear = this.hasInstructionsClear(template.content);
    if (!instructionsClear) {
      issues.push('Template instructions lack clarity or specificity');
      score -= 15;
    }

    // Check format consistency
    const formatConsistent = this.hasFormatConsistent(template.content);
    if (!formatConsistent) {
      issues.push('Template formatting is inconsistent throughout');
      score -= 10;
    }

    return {
      contentPresent,
      structureLogical,
      sectionsBalanced,
      instructionsClear,
      formatConsistent,
      score: Math.max(0, score),
      issues
    };
  }

  /**
   * Validate template variables
   */
  private validateVariables(template: PromptTemplate): VariableValidation {
    const issues: string[] = [];
    let score = 100;

    // Extract placeholders from content
    const placeholders = this.extractPlaceholders(template.content);
    const declaredVariables = [...template.requiredVariables, ...template.optionalVariables];

    // Check if variables are declared
    const variablesDeclared = template.requiredVariables.length > 0 || template.optionalVariables.length > 0;
    if (!variablesDeclared) {
      issues.push('No variables declared, but placeholders may be present in content');
      score -= 10;
    }

    // Check placeholder consistency
    const undeclaredPlaceholders = placeholders.filter(p => !declaredVariables.includes(p));
    const placeholdersConsistent = undeclaredPlaceholders.length === 0;
    if (!placeholdersConsistent) {
      issues.push(`Undeclared placeholders found: ${undeclaredPlaceholders.join(', ')}`);
      score -= 20;
    }

    // Check if required variables are used
    const unusedRequired = template.requiredVariables.filter(v => !placeholders.includes(v));
    const requiredVariablesUsed = unusedRequired.length === 0;
    if (!requiredVariablesUsed) {
      issues.push(`Required variables not used in template: ${unusedRequired.join(', ')}`);
      score -= 15;
    }

    // Check optional variables appropriateness
    const unusedOptional = template.optionalVariables.filter(v => !placeholders.includes(v));
    const optionalVariablesAppropriate = unusedOptional.length <= template.optionalVariables.length * 0.5;
    if (!optionalVariablesAppropriate) {
      issues.push(`Many optional variables unused: ${unusedOptional.join(', ')}`);
      score -= 5;
    }

    const noUndeclaredVariables = undeclaredPlaceholders.length === 0;

    return {
      variablesDeclared,
      placeholdersConsistent,
      requiredVariablesUsed,
      optionalVariablesAppropriate,
      noUndeclaredVariables,
      score: Math.max(0, score),
      issues
    };
  }

  /**
   * Validate template quality
   */
  private validateQuality(template: PromptTemplate): QualityValidation {
    const issues: string[] = [];
    let score = 100;

    // Check academic tone
    const academicToneAppropriate = this.hasAcademicTone(template.content);
    if (!academicToneAppropriate) {
      issues.push('Template lacks appropriate academic tone and formality');
      score -= 20;
    }

    // Check instruction clarity
    const instructionsClear = this.hasInstructionsClear(template.content);
    if (!instructionsClear) {
      issues.push('Instructions are unclear or ambiguous');
      score -= 20;
    }

    // Check objective definition
    const objectivesWellDefined = this.hasObjectivesWellDefined(template.content);
    if (!objectivesWellDefined) {
      issues.push('Template objectives are not well-defined or explicit');
      score -= 15;
    }

    // Check quality standards clarity
    const qualityStandardsClear = this.hasQualityStandardsClear(template.content);
    if (!qualityStandardsClear) {
      issues.push('Quality standards and expectations are not clearly specified');
      score -= 15;
    }

    // Check examples helpfulness
    const examplesHelpful = !template.examples || this.hasHelpfulExamples(template.examples);
    if (!examplesHelpful) {
      issues.push('Examples provided are not helpful or are insufficient');
      score -= 10;
    }

    return {
      academicToneAppropriate,
      instructionsClear,
      objectivesWellDefined,
      qualityStandardsClear,
      examplesHelpful,
      score: Math.max(0, score),
      issues
    };
  }

  /**
   * Validate academic compliance
   */
  private validateAcademicCompliance(template: PromptTemplate): AcademicValidation {
    const issues: string[] = [];
    let score = 100;

    // Check citation rules strictness
    const citationRulesStrict = this.hasCitationRulesStrict(template.content);
    if (!citationRulesStrict) {
      issues.push('Template lacks strict citation accuracy requirements');
      score -= 25;
    }

    // Check hallucination prevention
    const hallucinationPrevention = this.hasHallucinationPrevention(template.content);
    if (!hallucinationPrevention) {
      issues.push('Template does not adequately prevent citation hallucination');
      score -= 25;
    }

    // Check academic integrity emphasis
    const academicIntegrityEmphasized = this.hasAcademicIntegrityEmphasized(template.content);
    if (!academicIntegrityEmphasized) {
      issues.push('Template does not sufficiently emphasize academic integrity');
      score -= 20;
    }

    // Check level appropriateness
    const levelAppropriate = this.hasLevelAppropriate(template);
    if (!levelAppropriate) {
      issues.push('Template requirements not appropriate for supported academic levels');
      score -= 15;
    }

    // Check discipline awareness
    const disciplineAware = this.hasDisciplineAware(template.content);
    if (!disciplineAware) {
      issues.push('Template lacks awareness of disciplinary conventions');
      score -= 10;
    }

    return {
      citationRulesStrict,
      hallucinationPrevention,
      academicIntegrityEmphasized,
      levelAppropriate,
      disciplineAware,
      score: Math.max(0, score),
      issues
    };
  }

  /**
   * Validate template performance characteristics
   */
  private validatePerformance(template: PromptTemplate): PerformanceValidation {
    const issues: string[] = [];
    let score = 100;

    // Check token estimation
    const tokenEstimationRealistic = 
      template.estimatedTokens.min > 0 && 
      template.estimatedTokens.max < 8000 && // Reasonable for most contexts
      template.estimatedTokens.max > template.estimatedTokens.min;
    if (!tokenEstimationRealistic) {
      issues.push('Token estimation appears unrealistic for template complexity');
      score -= 20;
    }

    // Check temperature appropriateness
    const temperatureAppropriate = 
      template.recommendedTemperature >= 0 && 
      template.recommendedTemperature <= 1 &&
      this.isTemperatureAppropriateForPhase(template.phase, template.recommendedTemperature);
    if (!temperatureAppropriate) {
      issues.push('Recommended temperature inappropriate for template phase and purpose');
      score -= 15;
    }

    // Check complexity manageability
    const complexityManageable = this.hasComplexityManageable(template.content);
    if (!complexityManageable) {
      issues.push('Template complexity may be too high for reliable execution');
      score -= 20;
    }

    // Check execution efficiency
    const executionEfficient = this.hasExecutionEfficient(template);
    if (!executionEfficient) {
      issues.push('Template design may lead to inefficient execution');
      score -= 15;
    }

    // Check scalability considerations
    const scalabilityConsidered = this.hasScalabilityConsidered(template);
    if (!scalabilityConsidered) {
      issues.push('Template may not scale well across different contexts');
      score -= 10;
    }

    return {
      tokenEstimationRealistic,
      temperatureAppropriate,
      complexityManageable,
      executionEfficient,
      scalabilityConsidered,
      score: Math.max(0, score),
      issues
    };
  }

  /**
   * Validate template compilation
   */
  private async validateCompilation(template: PromptTemplate): Promise<CompilationValidation> {
    const issues: string[] = [];
    let score = 100;

    // Create test variables for compilation
    const testVariables = this.createTestVariables(template);

    try {
      // Attempt compilation (mock implementation)
      const compiled = this.mockCompileTemplate(template, testVariables);
      
      const compilesSuccessfully = compiled.missingVariables.length === 0;
      if (!compilesSuccessfully) {
        issues.push(`Compilation failed: missing variables ${compiled.missingVariables.join(', ')}`);
        score -= 30;
      }

      const outputWellFormed = compiled.prompt.length > 100;
      if (!outputWellFormed) {
        issues.push('Compiled output appears malformed or too short');
        score -= 20;
      }

      const warningsMinimal = compiled.warnings.length <= 2;
      if (!warningsMinimal) {
        issues.push(`Too many compilation warnings: ${compiled.warnings.length}`);
        score -= 10;
      }

      const errorHandlingRobust = compiled.warnings.length < 5;
      const edgeCasesHandled = this.hasEdgeCasesHandled(template);

      if (!edgeCasesHandled) {
        issues.push('Template may not handle edge cases appropriately');
        score -= 15;
      }

      return {
        compilesSuccessfully,
        outputWellFormed,
        warningsMinimal,
        errorHandlingRobust,
        edgeCasesHandled,
        score: Math.max(0, score),
        issues
      };
    } catch (error) {
      return {
        compilesSuccessfully: false,
        outputWellFormed: false,
        warningsMinimal: false,
        errorHandlingRobust: false,
        edgeCasesHandled: false,
        score: 0,
        issues: [`Compilation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Helper methods for validation checks
   */
  private extractPlaceholders(content: string): string[] {
    const matches = content.match(/\{\{([^}]+)\}\}/g);
    return matches ? matches.map(match => match.slice(2, -2)) : [];
  }

  private hasLogicalStructure(content: string): boolean {
    // Simple check for common structure indicators
    const indicators = ['===', 'OBJECTIVES', 'REQUIREMENTS', 'STANDARDS', 'DELIVERABLE'];
    return indicators.some(indicator => content.includes(indicator));
  }

  private hasSectionsBalanced(content: string): boolean {
    // Check if sections are relatively balanced
    const sections = content.split('===').filter(s => s.trim());
    if (sections.length < 2) return true;
    
    const lengths = sections.map(s => s.length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const balanced = lengths.every(len => len > avgLength * 0.3 && len < avgLength * 3);
    
    return balanced;
  }

  private hasInstructionsClear(content: string): boolean {
    // Check for clear instruction indicators
    const indicators = ['instructions', 'requirements', 'objectives', 'deliverable'];
    return indicators.some(indicator => 
      content.toLowerCase().includes(indicator) && 
      content.includes(':') || content.includes('-')
    );
  }

  private hasFormatConsistent(content: string): boolean {
    // Simple consistency check
    const hasConsistentHeaders = (content.match(/===/g) || []).length % 2 === 0;
    const hasConsistentLists = content.includes('-') || content.includes('1.');
    return hasConsistentHeaders && hasConsistentLists;
  }

  private hasAcademicTone(content: string): boolean {
    const academicIndicators = ['research', 'analysis', 'academic', 'scholarly', 'evidence', 'methodology'];
    const casualIndicators = ['awesome', 'super', 'cool', 'hey', 'gonna'];
    
    const academicScore = academicIndicators.reduce((score, word) => 
      score + (content.toLowerCase().split(word).length - 1), 0);
    const casualScore = casualIndicators.reduce((score, word) => 
      score + (content.toLowerCase().split(word).length - 1), 0);
    
    return academicScore > casualScore;
  }

  private hasObjectivesWellDefined(content: string): boolean {
    return content.toLowerCase().includes('objective') || 
           content.toLowerCase().includes('goal') ||
           content.toLowerCase().includes('deliverable');
  }

  private hasQualityStandardsClear(content: string): boolean {
    const qualityIndicators = ['standard', 'quality', 'requirement', 'criteria', 'threshold'];
    return qualityIndicators.some(indicator => content.toLowerCase().includes(indicator));
  }

  private hasHelpfulExamples(examples: any[]): boolean {
    return examples.length > 0 && examples.every(ex => ex.input && ex.expectedOutput);
  }

  private hasCitationRulesStrict(content: string): boolean {
    const strictIndicators = ['never fabricate', 'never create', 'never invent', 'verify', 'accurate'];
    return strictIndicators.some(indicator => content.toLowerCase().includes(indicator));
  }

  private hasHallucinationPrevention(content: string): boolean {
    const preventionIndicators = ['hallucination', 'fabricat', 'invent', 'never create'];
    return preventionIndicators.some(indicator => content.toLowerCase().includes(indicator));
  }

  private hasAcademicIntegrityEmphasized(content: string): boolean {
    const integrityIndicators = ['integrity', 'honest', 'ethical', 'plagiarism'];
    return integrityIndicators.some(indicator => content.toLowerCase().includes(indicator));
  }

  private hasLevelAppropriate(template: PromptTemplate): boolean {
    // Simple check - more sophisticated logic could be added
    return template.supportedLevels.length > 0;
  }

  private hasDisciplineAware(content: string): boolean {
    const disciplineIndicators = ['discipline', 'field', 'domain', 'methodology'];
    return disciplineIndicators.some(indicator => content.toLowerCase().includes(indicator));
  }

  private isTemperatureAppropriateForPhase(phase: AcademicPhase, temperature: number): boolean {
    const phaseTemperatureRanges: Record<AcademicPhase, { min: number; max: number }> = {
      'research_analysis': { min: 0.1, max: 0.3 },
      'outline_generation': { min: 0.2, max: 0.4 },
      'content_drafting': { min: 0.3, max: 0.6 },
      'citation_integration': { min: 0.05, max: 0.2 },
      'structure_refinement': { min: 0.1, max: 0.3 },
      'quality_review': { min: 0.05, max: 0.2 },
      'final_formatting': { min: 0.05, max: 0.15 }
    };
    
    const range = phaseTemperatureRanges[phase];
    return temperature >= range.min && temperature <= range.max;
  }

  private hasComplexityManageable(content: string): boolean {
    // Simple complexity check based on content length and structure
    return content.length < 5000 && content.split('\n').length < 100;
  }

  private hasExecutionEfficient(template: PromptTemplate): boolean {
    // Check for efficiency indicators
    return template.estimatedTokens.max < 6000;
  }

  private hasScalabilityConsidered(template: PromptTemplate): boolean {
    // Check if template considers multiple academic levels and document types
    return template.supportedLevels.length > 1 && template.supportedDocumentTypes.length > 1;
  }

  private hasEdgeCasesHandled(template: PromptTemplate): boolean {
    // Check for edge case handling in validation rules
    return template.validationRules.forbiddenElements.length > 0 &&
           template.validationRules.requiredElements.length > 0;
  }

  private createTestVariables(template: PromptTemplate): Record<string, any> {
    const variables: Record<string, any> = {};
    
    // Create mock values for all required variables
    template.requiredVariables.forEach(varName => {
      variables[varName] = this.getMockVariableValue(varName);
    });
    
    // Create mock values for some optional variables
    template.optionalVariables.slice(0, 2).forEach(varName => {
      variables[varName] = this.getMockVariableValue(varName);
    });
    
    return variables;
  }

  private getMockVariableValue(varName: string): string {
    const mockValues: Record<string, string> = {
      'research_topic': 'Academic Writing in Digital Age',
      'discipline_area': 'Education',
      'academic_level': 'graduate',
      'citation_style': 'APA',
      'content_text': 'Sample academic content for testing purposes.',
      'source_list': 'Smith, J. (2023). Academic Research Methods. Journal of Education, 45(2), 123-145.',
      'word_count_target': '2000-3000 words',
      'document_type': 'research_paper'
    };
    
    return mockValues[varName] || `Mock value for ${varName}`;
  }

  private mockCompileTemplate(template: PromptTemplate, variables: Record<string, any>): CompiledTemplate {
    // Mock compilation - in real implementation, this would use the actual registry
    const missingVariables = template.requiredVariables.filter(v => !(v in variables));
    const warnings = missingVariables.length > 0 ? [`Missing variables: ${missingVariables.join(', ')}`] : [];
    
    let compiledPrompt = template.content;
    Object.entries(variables).forEach(([key, value]) => {
      compiledPrompt = compiledPrompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
    });
    
    return {
      prompt: compiledPrompt,
      systemMessage: template.systemMessage || '',
      userMessage: template.userMessage || '',
      variablesUsed: variables,
      missingVariables,
      warnings,
      estimatedTokens: Math.ceil(compiledPrompt.length / 4)
    };
  }

  private async runTestCase(template: PromptTemplate, testCase: TemplateTestCase): Promise<{
    testCase: TemplateTestCase;
    success: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    let success = true;

    try {
      const compiled = this.mockCompileTemplate(template, testCase.variables);
      
      // Check output length
      if (testCase.expectedOutput.minLength && compiled.prompt.length < testCase.expectedOutput.minLength) {
        issues.push(`Output too short: ${compiled.prompt.length} < ${testCase.expectedOutput.minLength}`);
        success = false;
      }
      
      if (testCase.expectedOutput.maxLength && compiled.prompt.length > testCase.expectedOutput.maxLength) {
        issues.push(`Output too long: ${compiled.prompt.length} > ${testCase.expectedOutput.maxLength}`);
        success = false;
      }
      
      // Check required elements
      if (testCase.expectedOutput.requiredElements) {
        for (const element of testCase.expectedOutput.requiredElements) {
          if (!compiled.prompt.toLowerCase().includes(element.toLowerCase())) {
            issues.push(`Missing required element: ${element}`);
            success = false;
          }
        }
      }
      
      // Check forbidden elements
      if (testCase.expectedOutput.forbiddenElements) {
        for (const element of testCase.expectedOutput.forbiddenElements) {
          if (compiled.prompt.toLowerCase().includes(element.toLowerCase())) {
            issues.push(`Contains forbidden element: ${element}`);
            success = false;
          }
        }
      }

    } catch (error) {
      issues.push(`Test execution error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      success = false;
    }

    return { testCase, success, issues };
  }

  private collectValidationIssues(
    validations: Array<{ score: number; issues: string[] }>,
    criticalErrors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    validations.forEach((validation, index) => {
      validation.issues.forEach(issue => {
        if (validation.score < 50) {
          criticalErrors.push({
            code: `CRITICAL_${index}`,
            message: issue,
            severity: 'critical',
            location: `validation_${index}`,
            suggestedFix: 'Review and address this critical issue'
          });
        } else if (validation.score < 75) {
          warnings.push({
            code: `WARNING_${index}`,
            message: issue,
            category: 'quality',
            impact: 'medium',
            recommendation: 'Consider addressing this issue for better quality'
          });
        }
      });
    });
  }

  private calculateOverallScore(validations: Array<{ score: number }>): number {
    const scores = validations.map(v => v.score);
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }

  private generateSuggestions(
    template: PromptTemplate, 
    validations: Array<{ score: number; issues: string[] }>
  ): string[] {
    const suggestions: string[] = [];
    
    // Add general suggestions based on validation scores
    const avgScore = this.calculateOverallScore(validations);
    
    if (avgScore < 60) {
      suggestions.push('Template requires significant revision before use');
      suggestions.push('Focus on addressing critical validation errors first');
    } else if (avgScore < 80) {
      suggestions.push('Template is functional but has room for improvement');
      suggestions.push('Address validation warnings to improve quality');
    } else {
      suggestions.push('Template meets quality standards');
      suggestions.push('Consider minor refinements for optimal performance');
    }
    
    // Add specific suggestions based on template characteristics
    if (template.examples && template.examples.length === 0) {
      suggestions.push('Consider adding usage examples to improve template clarity');
    }
    
    if (template.tags.length < 3) {
      suggestions.push('Add more descriptive tags for better categorization');
    }
    
    return suggestions;
  }

  private generateTestBasedSuggestions(testResults: Array<{ success: boolean; issues: string[] }>): string[] {
    const suggestions: string[] = [];
    const failedTests = testResults.filter(r => !r.success);
    
    if (failedTests.length > 0) {
      suggestions.push(`${failedTests.length} test cases failed - review template logic`);
      
      const commonIssues = this.findCommonIssues(failedTests);
      commonIssues.forEach(issue => {
        suggestions.push(`Common issue: ${issue}`);
      });
    }
    
    return suggestions;
  }

  private findCommonIssues(failedTests: Array<{ issues: string[] }>): string[] {
    const issueCounts = new Map<string, number>();
    
    failedTests.forEach(test => {
      test.issues.forEach(issue => {
        issueCounts.set(issue, (issueCounts.get(issue) || 0) + 1);
      });
    });
    
    return Array.from(issueCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([issue, _]) => issue);
  }

  private createEmptyPerformanceValidation(): PerformanceValidation {
    return {
      tokenEstimationRealistic: true,
      temperatureAppropriate: true,
      complexityManageable: true,
      executionEfficient: true,
      scalabilityConsidered: true,
      score: 100,
      issues: []
    };
  }

  private createEmptyCompilationValidation(): CompilationValidation {
    return {
      compilesSuccessfully: true,
      outputWellFormed: true,
      warningsMinimal: true,
      errorHandlingRobust: true,
      edgeCasesHandled: true,
      score: 100,
      issues: []
    };
  }

  private initializeCustomRules(): void {
    // Add any custom validation rules here
    this.customRules.set('hallucination_check', {
      id: 'hallucination_check',
      description: 'Ensure template prevents citation hallucination',
      category: 'compliance',
      validator: (template) => {
        const errors: ValidationError[] = [];
        if (template.phase === 'citation_integration' && 
            !template.content.toLowerCase().includes('never fabricate')) {
          errors.push({
            code: 'MISSING_HALLUCINATION_PREVENTION',
            message: 'Citation templates must explicitly prevent hallucination',
            severity: 'critical'
          });
        }
        return errors;
      },
      weight: 1.0
    });
  }
}

/**
 * Create default template validator instance
 */
export const templateValidator = new TemplateValidator();