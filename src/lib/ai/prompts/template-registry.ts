/**
 * Prompt Template Registry System
 * Comprehensive management of versioned academic prompt templates
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

/**
 * Prompt template metadata
 */
export interface PromptTemplateMetadata {
  /** Template ID */
  id: string;
  
  /** Template name */
  name: string;
  
  /** Template description */
  description: string;
  
  /** Template version */
  version: string;
  
  /** Academic phase this template is designed for */
  phase: AcademicPhase;
  
  /** Template category */
  category: 'system' | 'user' | 'assistant' | 'composite';
  
  /** Template type */
  type: 'instruction' | 'example' | 'constraint' | 'format' | 'quality_check';
  
  /** Supported academic levels */
  supportedLevels: AcademicLevel[];
  
  /** Supported document types */
  supportedDocumentTypes: DocumentType[];
  
  /** Supported citation styles */
  supportedCitationStyles: CitationStyle[];
  
  /** Required variables */
  requiredVariables: string[];
  
  /** Optional variables */
  optionalVariables: string[];
  
  /** Template tags for categorization */
  tags: string[];
  
  /** Quality metrics this template affects */
  qualityImpact: Array<'readability' | 'academicTone' | 'argumentStrength' | 'citationQuality' | 'originality'>;
  
  /** Temperature recommendation */
  recommendedTemperature: number;
  
  /** Token usage estimate */
  estimatedTokens: { min: number; max: number };
  
  /** Creation and modification metadata */
  metadata: {
    author: string;
    createdAt: Date;
    updatedAt: Date;
    usageCount: number;
    successRate: number;
    averageQualityScore: number;
  };
}

/**
 * Prompt template definition
 */
export interface PromptTemplate extends PromptTemplateMetadata {
  /** Template content with variable placeholders */
  content: string;
  
  /** System message component */
  systemMessage?: string;
  
  /** User message template */
  userMessage?: string;
  
  /** Assistant context */
  assistantContext?: string;
  
  /** Pre-processing instructions */
  preprocessing?: string[];
  
  /** Post-processing instructions */
  postprocessing?: string[];
  
  /** Validation rules */
  validationRules: {
    minLength?: number;
    maxLength?: number;
    requiredElements: string[];
    forbiddenElements: string[];
    formatRequirements: string[];
  };
  
  /** Example usage */
  examples?: Array<{
    input: Record<string, any>;
    expectedOutput: string;
    explanation: string;
  }>;
}

/**
 * Template compilation result
 */
export interface CompiledTemplate {
  /** Final compiled prompt */
  prompt: string;
  
  /** System message */
  systemMessage: string;
  
  /** User message */
  userMessage: string;
  
  /** Variables used */
  variablesUsed: Record<string, any>;
  
  /** Missing required variables */
  missingVariables: string[];
  
  /** Compilation warnings */
  warnings: string[];
  
  /** Estimated token count */
  estimatedTokens: number;
}

/**
 * Template search criteria
 */
export interface TemplateSearchCriteria {
  phase?: AcademicPhase;
  category?: string;
  type?: string;
  tags?: string[];
  academicLevel?: AcademicLevel;
  documentType?: DocumentType;
  citationStyle?: CitationStyle;
  qualityImpact?: string[];
  minSuccessRate?: number;
  maxTokens?: number;
}

/**
 * Template usage statistics
 */
export interface TemplateUsageStats {
  templateId: string;
  totalUsages: number;
  successfulUsages: number;
  failedUsages: number;
  averageQualityScore: number;
  averageTokenUsage: number;
  lastUsed: Date;
  performanceHistory: Array<{
    timestamp: Date;
    success: boolean;
    qualityScore: number;
    tokenUsage: number;
    phase: AcademicPhase;
  }>;
}

/**
 * Template Registry Class
 */
export class PromptTemplateRegistry {
  private templates: Map<string, PromptTemplate> = new Map();
  private versionHistory: Map<string, PromptTemplate[]> = new Map();
  private usageStats: Map<string, TemplateUsageStats> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();
  private phaseIndex: Map<AcademicPhase, Set<string>> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  /**
   * Register a new prompt template
   */
  register(template: PromptTemplate): void {
    // Validate template
    const validation = this.validateTemplate(template);
    if (!validation.isValid) {
      throw new Error(`Invalid template: ${validation.errors.join(', ')}`);
    }

    // Store current version in history if exists
    const existing = this.templates.get(template.id);
    if (existing) {
      this.addToVersionHistory(existing);
    }

    // Register template
    this.templates.set(template.id, template);

    // Update indices
    this.updateIndices(template);

    // Initialize usage stats if new template
    if (!this.usageStats.has(template.id)) {
      this.usageStats.set(template.id, {
        templateId: template.id,
        totalUsages: 0,
        successfulUsages: 0,
        failedUsages: 0,
        averageQualityScore: 0,
        averageTokenUsage: 0,
        lastUsed: new Date(),
        performanceHistory: []
      });
    }
  }

  /**
   * Get template by ID
   */
  get(templateId: string): PromptTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Get template by ID and version
   */
  getVersion(templateId: string, version: string): PromptTemplate | undefined {
    if (version === 'latest') {
      return this.get(templateId);
    }

    const history = this.versionHistory.get(templateId) || [];
    return history.find(t => t.version === version);
  }

  /**
   * Search templates by criteria
   */
  search(criteria: TemplateSearchCriteria): PromptTemplate[] {
    let results = Array.from(this.templates.values());

    // Filter by phase
    if (criteria.phase) {
      results = results.filter(t => t.phase === criteria.phase);
    }

    // Filter by category
    if (criteria.category) {
      results = results.filter(t => t.category === criteria.category);
    }

    // Filter by type
    if (criteria.type) {
      results = results.filter(t => t.type === criteria.type);
    }

    // Filter by academic level
    if (criteria.academicLevel) {
      results = results.filter(t => t.supportedLevels.includes(criteria.academicLevel!));
    }

    // Filter by document type
    if (criteria.documentType) {
      results = results.filter(t => t.supportedDocumentTypes.includes(criteria.documentType!));
    }

    // Filter by citation style
    if (criteria.citationStyle) {
      results = results.filter(t => t.supportedCitationStyles.includes(criteria.citationStyle!));
    }

    // Filter by tags
    if (criteria.tags && criteria.tags.length > 0) {
      results = results.filter(t => 
        criteria.tags!.some(tag => t.tags.includes(tag))
      );
    }

    // Filter by quality impact
    if (criteria.qualityImpact && criteria.qualityImpact.length > 0) {
      results = results.filter(t =>
        criteria.qualityImpact!.some(impact => t.qualityImpact.includes(impact as any))
      );
    }

    // Filter by success rate
    if (criteria.minSuccessRate !== undefined) {
      results = results.filter(t => {
        const stats = this.usageStats.get(t.id);
        return stats && (stats.successfulUsages / Math.max(1, stats.totalUsages)) >= criteria.minSuccessRate!;
      });
    }

    // Filter by max tokens
    if (criteria.maxTokens) {
      results = results.filter(t => t.estimatedTokens.max <= criteria.maxTokens!);
    }

    // Sort by success rate and usage
    results.sort((a, b) => {
      const statsA = this.usageStats.get(a.id);
      const statsB = this.usageStats.get(b.id);
      
      if (!statsA && !statsB) return 0;
      if (!statsA) return 1;
      if (!statsB) return -1;
      
      const successRateA = statsA.successfulUsages / Math.max(1, statsA.totalUsages);
      const successRateB = statsB.successfulUsages / Math.max(1, statsB.totalUsages);
      
      return successRateB - successRateA;
    });

    return results;
  }

  /**
   * Compile template with variables
   */
  compile(templateId: string, variables: Record<string, any>): CompiledTemplate {
    const template = this.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Check required variables
    const missingVariables = template.requiredVariables.filter(
      varName => !(varName in variables)
    );

    if (missingVariables.length > 0) {
      throw new Error(`Missing required variables: ${missingVariables.join(', ')}`);
    }

    // Compile content
    let compiledContent = template.content;
    let compiledSystemMessage = template.systemMessage || '';
    let compiledUserMessage = template.userMessage || '';

    const warnings: string[] = [];
    const variablesUsed: Record<string, any> = {};

    // Replace variables in content
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      const valueStr = String(value);
      
      if (compiledContent.includes(placeholder)) {
        compiledContent = compiledContent.replace(new RegExp(placeholder, 'g'), valueStr);
        variablesUsed[key] = value;
      }
      
      if (compiledSystemMessage.includes(placeholder)) {
        compiledSystemMessage = compiledSystemMessage.replace(new RegExp(placeholder, 'g'), valueStr);
        variablesUsed[key] = value;
      }
      
      if (compiledUserMessage.includes(placeholder)) {
        compiledUserMessage = compiledUserMessage.replace(new RegExp(placeholder, 'g'), valueStr);
        variablesUsed[key] = value;
      }
    }

    // Check for unreplaced placeholders
    const unreplacedMatches = compiledContent.match(/\{\{[^}]+\}\}/g);
    if (unreplacedMatches) {
      warnings.push(`Unreplaced placeholders: ${unreplacedMatches.join(', ')}`);
    }

    // Estimate tokens (rough approximation: 4 characters per token)
    const estimatedTokens = Math.ceil(compiledContent.length / 4);

    return {
      prompt: compiledContent,
      systemMessage: compiledSystemMessage,
      userMessage: compiledUserMessage,
      variablesUsed,
      missingVariables,
      warnings,
      estimatedTokens
    };
  }

  /**
   * Record template usage
   */
  recordUsage(
    templateId: string, 
    success: boolean, 
    qualityScore: number, 
    tokenUsage: number, 
    phase: AcademicPhase
  ): void {
    const stats = this.usageStats.get(templateId);
    if (!stats) return;

    stats.totalUsages++;
    if (success) {
      stats.successfulUsages++;
    } else {
      stats.failedUsages++;
    }

    // Update averages
    stats.averageQualityScore = (
      (stats.averageQualityScore * (stats.totalUsages - 1)) + qualityScore
    ) / stats.totalUsages;

    stats.averageTokenUsage = (
      (stats.averageTokenUsage * (stats.totalUsages - 1)) + tokenUsage
    ) / stats.totalUsages;

    stats.lastUsed = new Date();

    // Add to history
    stats.performanceHistory.push({
      timestamp: new Date(),
      success,
      qualityScore,
      tokenUsage,
      phase
    });

    // Keep only recent history (last 100 entries)
    if (stats.performanceHistory.length > 100) {
      stats.performanceHistory = stats.performanceHistory.slice(-100);
    }

    // Update template metadata
    const template = this.templates.get(templateId);
    if (template) {
      template.metadata.usageCount = stats.totalUsages;
      template.metadata.successRate = stats.successfulUsages / stats.totalUsages;
      template.metadata.averageQualityScore = stats.averageQualityScore;
      template.metadata.updatedAt = new Date();
    }
  }

  /**
   * Get template usage statistics
   */
  getUsageStats(templateId: string): TemplateUsageStats | undefined {
    return this.usageStats.get(templateId);
  }

  /**
   * List all templates
   */
  list(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * List templates by phase
   */
  listByPhase(phase: AcademicPhase): PromptTemplate[] {
    const templateIds = this.phaseIndex.get(phase) || new Set();
    return Array.from(templateIds).map(id => this.templates.get(id)).filter(Boolean) as PromptTemplate[];
  }

  /**
   * List templates by tags
   */
  listByTags(tags: string[]): PromptTemplate[] {
    const templateIds = new Set<string>();
    
    for (const tag of tags) {
      const taggedIds = this.tagIndex.get(tag) || new Set();
      for (const id of taggedIds) {
        templateIds.add(id);
      }
    }
    
    return Array.from(templateIds).map(id => this.templates.get(id)).filter(Boolean) as PromptTemplate[];
  }

  /**
   * Get version history for template
   */
  getVersionHistory(templateId: string): PromptTemplate[] {
    return this.versionHistory.get(templateId) || [];
  }

  /**
   * Update template
   */
  update(templateId: string, updates: Partial<PromptTemplate>): void {
    const existing = this.templates.get(templateId);
    if (!existing) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Store current version in history
    this.addToVersionHistory(existing);

    // Create updated template
    const updated: PromptTemplate = {
      ...existing,
      ...updates,
      metadata: {
        ...existing.metadata,
        ...updates.metadata,
        updatedAt: new Date()
      }
    };

    // Increment version if content changed
    if (updates.content && updates.content !== existing.content) {
      updated.version = this.incrementVersion(existing.version);
    }

    // Re-register updated template
    this.register(updated);
  }

  /**
   * Delete template
   */
  delete(templateId: string): void {
    const template = this.templates.get(templateId);
    if (!template) return;

    // Remove from main registry
    this.templates.delete(templateId);

    // Remove from indices
    this.removeFromIndices(template);

    // Remove usage stats
    this.usageStats.delete(templateId);

    // Keep version history for audit purposes
  }

  /**
   * Export template as JSON
   */
  export(templateId: string): string {
    const template = this.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }
    return JSON.stringify(template, null, 2);
  }

  /**
   * Import template from JSON
   */
  import(jsonString: string): void {
    try {
      const template: PromptTemplate = JSON.parse(jsonString);
      this.register(template);
    } catch (error) {
      throw new Error(`Failed to import template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate template structure
   */
  private validateTemplate(template: PromptTemplate): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!template.id) errors.push('Template ID is required');
    if (!template.name) errors.push('Template name is required');
    if (!template.content) errors.push('Template content is required');
    if (!template.version) errors.push('Template version is required');

    // Check version format
    if (template.version && !/^\d+\.\d+\.\d+$/.test(template.version)) {
      errors.push('Version must follow semantic versioning (x.y.z)');
    }

    // Check variables consistency
    const contentPlaceholders = (template.content.match(/\{\{[^}]+\}\}/g) || [])
      .map(match => match.slice(2, -2));
    
    const undeclaredVars = contentPlaceholders.filter(
      placeholder => !template.requiredVariables.includes(placeholder) && 
                     !template.optionalVariables.includes(placeholder)
    );
    
    if (undeclaredVars.length > 0) {
      errors.push(`Undeclared variables in content: ${undeclaredVars.join(', ')}`);
    }

    // Check temperature range
    if (template.recommendedTemperature < 0 || template.recommendedTemperature > 1) {
      errors.push('Recommended temperature must be between 0 and 1');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Add template to version history
   */
  private addToVersionHistory(template: PromptTemplate): void {
    const history = this.versionHistory.get(template.id) || [];
    history.push({ ...template });
    
    // Keep only last 10 versions
    if (history.length > 10) {
      history.splice(0, history.length - 10);
    }
    
    this.versionHistory.set(template.id, history);
  }

  /**
   * Update search indices
   */
  private updateIndices(template: PromptTemplate): void {
    // Update tag index
    for (const tag of template.tags) {
      const taggedTemplates = this.tagIndex.get(tag) || new Set();
      taggedTemplates.add(template.id);
      this.tagIndex.set(tag, taggedTemplates);
    }

    // Update phase index
    const phaseTemplates = this.phaseIndex.get(template.phase) || new Set();
    phaseTemplates.add(template.id);
    this.phaseIndex.set(template.phase, phaseTemplates);
  }

  /**
   * Remove template from indices
   */
  private removeFromIndices(template: PromptTemplate): void {
    // Remove from tag index
    for (const tag of template.tags) {
      const taggedTemplates = this.tagIndex.get(tag);
      if (taggedTemplates) {
        taggedTemplates.delete(template.id);
        if (taggedTemplates.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    }

    // Remove from phase index
    const phaseTemplates = this.phaseIndex.get(template.phase);
    if (phaseTemplates) {
      phaseTemplates.delete(template.id);
      if (phaseTemplates.size === 0) {
        this.phaseIndex.delete(template.phase);
      }
    }
  }

  /**
   * Increment semantic version
   */
  private incrementVersion(version: string): string {
    const parts = version.split('.').map(Number);
    if (parts.length !== 3) return '1.0.0';
    
    parts[2]++; // Increment patch version
    return parts.join('.');
  }

  /**
   * Initialize default templates
   */
  private initializeDefaultTemplates(): void {
    // Research Analysis Phase Template
    this.register({
      id: 'research-analysis-base',
      name: 'Research Analysis Base Template',
      description: 'Core template for research analysis phase with comprehensive literature review guidelines',
      version: '1.0.0',
      phase: 'research_analysis',
      category: 'composite',
      type: 'instruction',
      supportedLevels: ['graduate', 'doctoral'],
      supportedDocumentTypes: ['research_paper', 'thesis', 'dissertation'],
      supportedCitationStyles: ['APA', 'MLA', 'Chicago', 'Harvard'],
      requiredVariables: ['research_topic', 'discipline_area', 'academic_level', 'citation_style'],
      optionalVariables: ['specific_focus', 'time_period', 'geographical_scope', 'methodology_preference'],
      tags: ['research', 'analysis', 'literature-review', 'foundational'],
      qualityImpact: ['argumentStrength', 'citationQuality', 'academicTone'],
      recommendedTemperature: 0.2,
      estimatedTokens: { min: 800, max: 1200 },
      content: `You are conducting a comprehensive research analysis on "{{research_topic}}" in the field of {{discipline_area}}.

RESEARCH ANALYSIS OBJECTIVES:
1. Systematically analyze existing literature and research
2. Identify key concepts, theories, and methodologies
3. Evaluate the quality and relevance of sources  
4. Synthesize findings to understand the current state of knowledge
5. Identify research gaps and opportunities

ANALYSIS FRAMEWORK:
- Focus Area: {{research_topic}}
- Discipline: {{discipline_area}}
- Academic Level: {{academic_level}}
- Citation Style: {{citation_style}}
{{#specific_focus}}
- Specific Focus: {{specific_focus}}
{{/specific_focus}}

QUALITY STANDARDS:
- Use only peer-reviewed, credible sources
- Provide critical analysis, not just summaries
- Maintain objectivity and academic rigor
- Follow {{citation_style}} citation format precisely
- Never fabricate or hallucinate citations
- Acknowledge limitations and biases in sources

DELIVERABLE REQUIREMENTS:
1. Literature landscape overview
2. Key themes and patterns identification
3. Methodological approaches analysis
4. Research gap identification
5. Theoretical framework assessment
6. Quality evaluation of sources
7. Synthesis of major findings

Remember: This is a PhD-level analysis requiring sophisticated critical thinking and comprehensive coverage of the research domain.`,

      systemMessage: `You are a distinguished academic researcher with expertise in {{discipline_area}} conducting a systematic research analysis. Maintain the highest standards of academic rigor and intellectual honesty.`,

      userMessage: `Conduct a comprehensive research analysis on: {{research_topic}}

Please provide a thorough analysis following the framework and quality standards specified.`,

      validationRules: {
        minLength: 2000,
        maxLength: 6000,
        requiredElements: ['literature_analysis', 'key_concepts', 'research_gaps', 'source_evaluation'],
        forbiddenElements: ['personal_opinions', 'speculation', 'fabricated_citations'],
        formatRequirements: ['academic_tone', 'proper_citations', 'critical_analysis']
      },
      metadata: {
        author: 'Academic AI System',
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0,
        successRate: 0,
        averageQualityScore: 0
      }
    });

    // Content Drafting Phase Template
    this.register({
      id: 'content-drafting-academic',
      name: 'Academic Content Drafting Template',
      description: 'Comprehensive template for drafting academic content with argument development',
      version: '1.0.0',
      phase: 'content_drafting',
      category: 'composite',
      type: 'instruction',
      supportedLevels: ['undergraduate', 'graduate', 'doctoral'],
      supportedDocumentTypes: ['research_paper', 'thesis', 'dissertation', 'essay'],
      supportedCitationStyles: ['APA', 'MLA', 'Chicago', 'Harvard'],
      requiredVariables: ['content_outline', 'target_section', 'academic_level', 'word_count_target'],
      optionalVariables: ['key_arguments', 'evidence_sources', 'theoretical_framework', 'methodology'],
      tags: ['content', 'drafting', 'academic-writing', 'argument-development'],
      qualityImpact: ['readability', 'academicTone', 'argumentStrength'],
      recommendedTemperature: 0.4,
      estimatedTokens: { min: 1000, max: 1800 },
      content: `You are drafting academic content for the {{target_section}} section.

CONTENT DEVELOPMENT FRAMEWORK:
- Section: {{target_section}}
- Academic Level: {{academic_level}}
- Target Word Count: {{word_count_target}}
- Content Outline: {{content_outline}}

WRITING STANDARDS:
1. Academic Voice and Tone:
   - Formal, objective, and precise language
   - Third-person perspective preferred
   - Confident but not overstated claims
   - Appropriate discipline-specific terminology

2. Argument Development:
   - Clear topic sentences for each paragraph
   - Logical progression of ideas
   - Strong evidence support for all claims
   - Effective transitions between concepts

3. Evidence Integration:
   - Seamless incorporation of sources
   - Balance of direct quotes and paraphrasing
   - Proper attribution and citations
   - Critical analysis, not just description

4. Structure Requirements:
   - Coherent paragraph organization
   - Clear relationship between ideas
   - Appropriate section length and depth
   - Logical flow from introduction to conclusion

{{#key_arguments}}
KEY ARGUMENTS TO DEVELOP:
{{key_arguments}}
{{/key_arguments}}

{{#theoretical_framework}}
THEORETICAL FRAMEWORK:
{{theoretical_framework}}
{{/theoretical_framework}}

QUALITY CHECKLIST:
- Does each paragraph advance the argument?
- Are all claims supported by evidence?
- Is the writing clear and accessible to the target audience?
- Does the content maintain academic standards throughout?
- Are transitions smooth and logical?

Generate comprehensive, well-argued content that meets {{academic_level}} standards and advances the overall thesis.`,

      systemMessage: `You are an expert academic writer specializing in {{academic_level}} level content development. Focus on creating clear, well-argued, and properly supported academic prose.`,

      userMessage: `Draft content for the {{target_section}} section based on the provided outline and requirements.`,

      validationRules: {
        minLength: 500,
        maxLength: 8000,
        requiredElements: ['topic_development', 'evidence_integration', 'logical_flow'],
        forbiddenElements: ['informal_language', 'unsupported_claims', 'plagiarism'],
        formatRequirements: ['academic_paragraphs', 'proper_citations', 'clear_structure']
      },
      metadata: {
        author: 'Academic AI System',
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0,
        successRate: 0,
        averageQualityScore: 0
      }
    });

    // Citation Integration Template
    this.register({
      id: 'citation-integration-strict',
      name: 'Strict Citation Integration Template',
      description: 'Template for accurate citation integration with hallucination prevention',
      version: '1.0.0',
      phase: 'citation_integration',
      category: 'system',
      type: 'constraint',
      supportedLevels: ['undergraduate', 'graduate', 'doctoral'],
      supportedDocumentTypes: ['research_paper', 'thesis', 'dissertation', 'report'],
      supportedCitationStyles: ['APA', 'MLA', 'Chicago', 'Harvard'],
      requiredVariables: ['content_text', 'citation_style', 'source_list'],
      optionalVariables: ['discipline_standards', 'citation_density'],
      tags: ['citation', 'integration', 'hallucination-prevention', 'accuracy'],
      qualityImpact: ['citationQuality'],
      recommendedTemperature: 0.1,
      estimatedTokens: { min: 600, max: 1000 },
      content: `CRITICAL CITATION REQUIREMENTS - MANDATORY COMPLIANCE:

ABSOLUTE PROHIBITIONS:
❌ NEVER create, invent, or fabricate citations
❌ NEVER modify author names, publication dates, or titles
❌ NEVER combine or merge different sources
❌ NEVER guess or estimate bibliographic details

CITATION STYLE: {{citation_style}}
AVAILABLE VERIFIED SOURCES:
{{source_list}}

INTEGRATION PROTOCOL:
1. Source Verification:
   - Use ONLY sources from the verified list above
   - Verify each citation against the source list
   - If uncertain about a source, indicate uncertainty clearly

2. {{citation_style}} Format Requirements:
   - Follow format specifications exactly
   - Include all required bibliographic elements
   - Maintain consistency throughout

3. Integration Best Practices:
   - Integrate citations smoothly into text flow
   - Vary citation placement (beginning, middle, end of sentences)
   - Use appropriate introduction phrases
   - Balance direct quotes with paraphrasing

4. Quality Standards:
   - Every factual claim must be supported
   - Citations must be relevant and appropriate
   - Avoid citation stuffing or under-citation
   - Maintain academic voice while integrating sources

CONTENT TO ENHANCE WITH CITATIONS:
{{content_text}}

{{#discipline_standards}}
DISCIPLINE-SPECIFIC STANDARDS:
{{discipline_standards}}
{{/discipline_standards}}

OUTPUT REQUIREMENTS:
- Enhanced content with proper in-text citations
- Complete reference list in {{citation_style}} format
- Citation verification report
- Any uncertainty acknowledgments

Remember: Accuracy and honesty are paramount. It is better to acknowledge limitations than to create false information.`,

      systemMessage: `You are a meticulous citation specialist with expertise in {{citation_style}} format. Your primary responsibility is ensuring absolute accuracy and preventing citation hallucination.`,

      userMessage: `Integrate proper {{citation_style}} citations into the provided content using only the verified sources listed.`,

      validationRules: {
        minLength: 200,
        maxLength: 5000,
        requiredElements: ['verified_citations', 'proper_format', 'source_verification'],
        forbiddenElements: ['fabricated_citations', 'modified_sources', 'format_errors'],
        formatRequirements: ['citation_style_compliance', 'complete_references']
      },
      metadata: {
        author: 'Academic AI System',
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0,
        successRate: 0,
        averageQualityScore: 0
      }
    });
  }
}

/**
 * Create singleton instance of prompt template registry
 */
export const promptTemplateRegistry = new PromptTemplateRegistry();