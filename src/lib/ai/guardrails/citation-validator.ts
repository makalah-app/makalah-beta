/**
 * Citation Validation and Hallucination Prevention System
 * Core guardrails against citation fabrication and academic integrity violations
 * 
 * Based on Vercel AI SDK v5 patterns from:
 * - /documentation/docs/03-ai-sdk-core/40-middleware.mdx
 * - /documentation/docs/03-ai-sdk-core/20-prompt-engineering.mdx
 */

import type { 
  CitationStyle,
  AcademicPhase,
  Citation,
  ResearchSource
} from '../types';

/**
 * Citation validation result
 */
export interface CitationValidationResult {
  /** Whether validation passed */
  isValid: boolean;
  
  /** Overall confidence score (0-1) */
  confidence: number;
  
  /** Detected citations */
  detectedCitations: DetectedCitation[];
  
  /** Validation errors */
  errors: CitationError[];
  
  /** Validation warnings */
  warnings: CitationWarning[];
  
  /** Hallucination risk assessment */
  hallucinationRisk: HallucinationRisk;
  
  /** Recommendations for improvement */
  recommendations: string[];
  
  /** Source verification results */
  sourceVerification: SourceVerificationResult[];
}

/**
 * Detected citation in content
 */
export interface DetectedCitation {
  /** Citation identifier */
  id: string;
  
  /** Citation text as found in content */
  citationText: string;
  
  /** Citation type */
  type: 'in_text' | 'reference' | 'footnote' | 'endnote';
  
  /** Citation format detected */
  detectedFormat: CitationStyle | 'unknown' | 'mixed';
  
  /** Position in text */
  position: {
    start: number;
    end: number;
    context: string;
  };
  
  /** Parsed citation components */
  parsedComponents: ParsedCitationComponents;
  
  /** Verification status */
  verificationStatus: 'verified' | 'unverified' | 'suspicious' | 'invalid';
  
  /** Confidence in citation accuracy */
  accuracyConfidence: number;
  
  /** Potential issues */
  issues: string[];
}

/**
 * Parsed citation components
 */
export interface ParsedCitationComponents {
  /** Author names */
  authors: string[];
  
  /** Publication year */
  year?: string;
  
  /** Title */
  title?: string;
  
  /** Journal/Publisher */
  journal?: string;
  
  /** Volume/Issue */
  volume?: string;
  issue?: string;
  
  /** Page numbers */
  pages?: string;
  
  /** DOI */
  doi?: string;
  
  /** URL */
  url?: string;
  
  /** ISBN */
  isbn?: string;
  
  /** Other identifiers */
  otherIdentifiers: Record<string, string>;
}

/**
 * Citation validation error
 */
export interface CitationError {
  /** Error code */
  code: string;
  
  /** Error message */
  message: string;
  
  /** Severity level */
  severity: 'critical' | 'major' | 'minor';
  
  /** Citation ID related to error */
  citationId?: string;
  
  /** Error location in text */
  location?: {
    start: number;
    end: number;
  };
  
  /** Suggested fix */
  suggestedFix?: string;
  
  /** Confidence in error detection */
  confidence: number;
}

/**
 * Citation validation warning
 */
export interface CitationWarning {
  /** Warning code */
  code: string;
  
  /** Warning message */
  message: string;
  
  /** Warning category */
  category: 'format' | 'completeness' | 'consistency' | 'style';
  
  /** Citation ID related to warning */
  citationId?: string;
  
  /** Warning location */
  location?: {
    start: number;
    end: number;
  };
  
  /** Recommendation */
  recommendation?: string;
}

/**
 * Hallucination risk assessment
 */
export interface HallucinationRisk {
  /** Overall risk level */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  
  /** Risk score (0-1) */
  riskScore: number;
  
  /** Risk factors identified */
  riskFactors: RiskFactor[];
  
  /** Suspicious patterns detected */
  suspiciousPatterns: string[];
  
  /** Confidence in risk assessment */
  confidence: number;
  
  /** Mitigation recommendations */
  mitigationRecommendations: string[];
}

/**
 * Risk factor for hallucination
 */
export interface RiskFactor {
  /** Factor type */
  type: 'pattern' | 'anomaly' | 'inconsistency' | 'format' | 'content';
  
  /** Factor description */
  description: string;
  
  /** Risk contribution (0-1) */
  riskContribution: number;
  
  /** Evidence for this factor */
  evidence: string[];
  
  /** Related citation IDs */
  relatedCitations: string[];
}

/**
 * Source verification result
 */
export interface SourceVerificationResult {
  /** Citation ID */
  citationId: string;
  
  /** Verification status */
  status: 'verified' | 'not_found' | 'partial_match' | 'suspicious' | 'error';
  
  /** Confidence in verification */
  confidence: number;
  
  /** Matched source information */
  matchedSource?: Partial<Citation>;
  
  /** Verification details */
  details: string;
  
  /** Issues found during verification */
  issues: string[];
  
  /** Alternative sources suggested */
  alternativeSources: Partial<Citation>[];
}

/**
 * Citation validation configuration
 */
export interface CitationValidationConfig {
  /** Strict mode for validation */
  strictMode: boolean;
  
  /** Required citation style */
  requiredStyle: CitationStyle;
  
  /** Enable hallucination detection */
  enableHallucinationDetection: boolean;
  
  /** Enable source verification */
  enableSourceVerification: boolean;
  
  /** Minimum confidence threshold */
  minimumConfidence: number;
  
  /** Maximum acceptable risk score */
  maxRiskScore: number;
  
  /** Validation rules */
  validationRules: CitationValidationRules;
}

/**
 * Citation validation rules
 */
export interface CitationValidationRules {
  /** Require complete bibliographic information */
  requireCompleteBibliography: boolean;
  
  /** Require DOI when available */
  requireDOI: boolean;
  
  /** Require recent sources */
  requireRecentSources: boolean;
  
  /** Maximum age for sources (years) */
  maxSourceAge: number;
  
  /** Minimum number of sources */
  minSourceCount: number;
  
  /** Require peer-reviewed sources */
  requirePeerReviewed: boolean;
  
  /** Allowed source types */
  allowedSourceTypes: string[];
  
  /** Forbidden patterns */
  forbiddenPatterns: RegExp[];
  
  /** Custom validation rules */
  customRules: Array<(citation: DetectedCitation) => CitationError[]>;
}

/**
 * Citation Validator Class
 */
export class CitationValidator {
  private config: CitationValidationConfig;
  private knownSources: Map<string, Citation> = new Map();
  private suspiciousPatterns: RegExp[] = [];
  private formatValidators: Map<CitationStyle, CitationFormatValidator> = new Map();

  constructor(config: CitationValidationConfig) {
    this.config = config;
    this.initializeFormatValidators();
    this.initializeSuspiciousPatterns();
  }

  /**
   * Validate citations in content
   */
  async validateContent(
    content: string,
    verifiedSources: Citation[] = [],
    phase: AcademicPhase = 'citation_integration'
  ): Promise<CitationValidationResult> {
    // Detect citations in content
    const detectedCitations = this.detectCitations(content);
    
    // Validate each citation
    const validationPromises = detectedCitations.map(citation =>
      this.validateCitation(citation, verifiedSources)
    );
    
    const citationResults = await Promise.all(validationPromises);
    
    // Collect errors and warnings
    const errors: CitationError[] = [];
    const warnings: CitationWarning[] = [];
    
    citationResults.forEach(result => {
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    });
    
    // Assess hallucination risk
    const hallucinationRisk = this.assessHallucinationRisk(
      detectedCitations,
      verifiedSources,
      content
    );
    
    // Perform source verification if enabled
    const sourceVerification = this.config.enableSourceVerification
      ? await this.verifyAllSources(detectedCitations, verifiedSources)
      : [];
    
    // Calculate overall confidence
    const confidence = this.calculateOverallConfidence(
      detectedCitations,
      hallucinationRisk,
      sourceVerification
    );
    
    // Determine if validation passed
    const isValid = this.determineValidationStatus(
      errors,
      warnings,
      hallucinationRisk,
      confidence
    );
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(
      errors,
      warnings,
      hallucinationRisk,
      sourceVerification
    );
    
    return {
      isValid,
      confidence,
      detectedCitations,
      errors,
      warnings,
      hallucinationRisk,
      recommendations,
      sourceVerification
    };
  }

  /**
   * Validate single citation
   */
  async validateCitation(
    citation: DetectedCitation,
    verifiedSources: Citation[] = []
  ): Promise<{ errors: CitationError[]; warnings: CitationWarning[] }> {
    const errors: CitationError[] = [];
    const warnings: CitationWarning[] = [];

    // Format validation
    const formatResult = this.validateCitationFormat(citation);
    errors.push(...formatResult.errors);
    warnings.push(...formatResult.warnings);

    // Completeness validation
    const completenessResult = this.validateCitationCompleteness(citation);
    errors.push(...completenessResult.errors);
    warnings.push(...completenessResult.warnings);

    // Consistency validation
    const consistencyResult = this.validateCitationConsistency(citation);
    errors.push(...consistencyResult.errors);
    warnings.push(...consistencyResult.warnings);

    // Source verification
    if (this.config.enableSourceVerification) {
      const verificationResult = this.validateAgainstKnownSources(
        citation,
        verifiedSources
      );
      errors.push(...verificationResult.errors);
      warnings.push(...verificationResult.warnings);
    }

    // Hallucination detection
    if (this.config.enableHallucinationDetection) {
      const hallucinationResult = this.detectCitationHallucination(citation);
      errors.push(...hallucinationResult.errors);
      warnings.push(...hallucinationResult.warnings);
    }

    return { errors, warnings };
  }

  /**
   * Add known source for verification
   */
  addKnownSource(source: Citation): void {
    const key = this.generateSourceKey(source);
    this.knownSources.set(key, source);
  }

  /**
   * Add multiple known sources
   */
  addKnownSources(sources: Citation[]): void {
    sources.forEach(source => this.addKnownSource(source));
  }

  /**
   * Detect citations in content
   */
  private detectCitations(content: string): DetectedCitation[] {
    const citations: DetectedCitation[] = [];
    let citationId = 1;

    // Detect APA style citations
    const apaPattern = /\(([^)]+,\s*\d{4}[^)]*)\)/g;
    let match;
    
    while ((match = apaPattern.exec(content)) !== null) {
      const citation = this.parseAPACitation(match, citationId++, content);
      if (citation) citations.push(citation);
    }

    // Detect MLA style citations
    const mlaPattern = /\(([^)]+\s+\d+[^)]*)\)/g;
    content.replace(mlaPattern, (fullMatch, citationText, offset) => {
      const citation = this.parseMLACitation({
        0: fullMatch,
        1: citationText,
        index: offset
      } as RegExpExecArray, citationId++, content);
      if (citation) citations.push(citation);
      return fullMatch;
    });

    // Detect numbered citations [1], [2], etc.
    const numberedPattern = /\[(\d+)\]/g;
    while ((match = numberedPattern.exec(content)) !== null) {
      const citation = this.parseNumberedCitation(match, citationId++, content);
      if (citation) citations.push(citation);
    }

    return citations;
  }

  /**
   * Parse APA style citation
   */
  private parseAPACitation(
    match: RegExpExecArray,
    id: number,
    content: string
  ): DetectedCitation | null {
    const citationText = match[1];
    const parts = citationText.split(',');
    
    if (parts.length < 2) return null;
    
    const authors = parts[0].trim().split(/\s*&\s*/);
    const yearMatch = citationText.match(/\d{4}/);
    const year = yearMatch ? yearMatch[0] : undefined;
    
    const context = this.extractContext(content, match.index!, match[0].length);
    
    return {
      id: `citation_${id}`,
      citationText: match[0],
      type: 'in_text',
      detectedFormat: 'APA',
      position: {
        start: match.index!,
        end: match.index! + match[0].length,
        context
      },
      parsedComponents: {
        authors: authors,
        year: year,
        otherIdentifiers: {}
      },
      verificationStatus: 'unverified',
      accuracyConfidence: 0.5,
      issues: []
    };
  }

  /**
   * Parse MLA style citation
   */
  private parseMLACitation(
    match: RegExpExecArray,
    id: number,
    content: string
  ): DetectedCitation | null {
    const citationText = match[1];
    const parts = citationText.trim().split(/\s+/);
    
    if (parts.length < 2) return null;
    
    const pageNum = parts[parts.length - 1];
    const authors = parts.slice(0, -1).join(' ').split(/\s+and\s+/);
    
    const context = this.extractContext(content, match.index!, match[0].length);
    
    return {
      id: `citation_${id}`,
      citationText: match[0],
      type: 'in_text',
      detectedFormat: 'MLA',
      position: {
        start: match.index!,
        end: match.index! + match[0].length,
        context
      },
      parsedComponents: {
        authors: authors,
        pages: pageNum,
        otherIdentifiers: {}
      },
      verificationStatus: 'unverified',
      accuracyConfidence: 0.5,
      issues: []
    };
  }

  /**
   * Parse numbered citation
   */
  private parseNumberedCitation(
    match: RegExpExecArray,
    id: number,
    content: string
  ): DetectedCitation | null {
    const number = match[1];
    const context = this.extractContext(content, match.index!, match[0].length);
    
    return {
      id: `citation_${id}`,
      citationText: match[0],
      type: 'in_text',
      detectedFormat: 'unknown',
      position: {
        start: match.index!,
        end: match.index! + match[0].length,
        context
      },
      parsedComponents: {
        authors: [],
        otherIdentifiers: { number }
      },
      verificationStatus: 'unverified',
      accuracyConfidence: 0.3,
      issues: []
    };
  }

  /**
   * Extract context around citation
   */
  private extractContext(content: string, start: number, length: number): string {
    const contextRadius = 100;
    const contextStart = Math.max(0, start - contextRadius);
    const contextEnd = Math.min(content.length, start + length + contextRadius);
    
    return content.substring(contextStart, contextEnd);
  }

  /**
   * Validate citation format
   */
  private validateCitationFormat(
    citation: DetectedCitation
  ): { errors: CitationError[]; warnings: CitationWarning[] } {
    const errors: CitationError[] = [];
    const warnings: CitationWarning[] = [];

    // Check if citation matches required style
    if (citation.detectedFormat !== this.config.requiredStyle) {
      if (citation.detectedFormat === 'unknown') {
        errors.push({
          code: 'UNKNOWN_FORMAT',
          message: 'Citation format could not be determined',
          severity: 'major',
          citationId: citation.id,
          location: { start: citation.position.start, end: citation.position.end },
          suggestedFix: `Format citation according to ${this.config.requiredStyle} style`,
          confidence: 0.9
        });
      } else {
        warnings.push({
          code: 'FORMAT_MISMATCH',
          message: `Citation appears to be in ${citation.detectedFormat} format, but ${this.config.requiredStyle} is required`,
          category: 'format',
          citationId: citation.id,
          location: { start: citation.position.start, end: citation.position.end },
          recommendation: `Convert to ${this.config.requiredStyle} format`
        });
      }
    }

    // Use format-specific validator
    const formatValidator = this.formatValidators.get(this.config.requiredStyle);
    if (formatValidator) {
      const formatResult = formatValidator.validate(citation);
      errors.push(...formatResult.errors);
      warnings.push(...formatResult.warnings);
    }

    return { errors, warnings };
  }

  /**
   * Validate citation completeness
   */
  private validateCitationCompleteness(
    citation: DetectedCitation
  ): { errors: CitationError[]; warnings: CitationWarning[] } {
    const errors: CitationError[] = [];
    const warnings: CitationWarning[] = [];

    const components = citation.parsedComponents;

    // Check for required components
    if (!components.authors || components.authors.length === 0) {
      errors.push({
        code: 'MISSING_AUTHORS',
        message: 'Citation is missing author information',
        severity: 'major',
        citationId: citation.id,
        suggestedFix: 'Add author names to the citation',
        confidence: 0.95
      });
    }

    if (!components.year && citation.type === 'in_text') {
      errors.push({
        code: 'MISSING_YEAR',
        message: 'Citation is missing publication year',
        severity: 'major',
        citationId: citation.id,
        suggestedFix: 'Add publication year to the citation',
        confidence: 0.9
      });
    }

    // Check for optional but recommended components
    if (this.config.validationRules.requireCompleteBibliography) {
      if (!components.title) {
        warnings.push({
          code: 'MISSING_TITLE',
          message: 'Citation is missing title information',
          category: 'completeness',
          citationId: citation.id,
          recommendation: 'Include title for complete bibliography'
        });
      }

      if (!components.journal && !components.otherIdentifiers.publisher) {
        warnings.push({
          code: 'MISSING_PUBLICATION',
          message: 'Citation is missing journal or publisher information',
          category: 'completeness',
          citationId: citation.id,
          recommendation: 'Include publication information'
        });
      }
    }

    if (this.config.validationRules.requireDOI && !components.doi) {
      warnings.push({
        code: 'MISSING_DOI',
        message: 'Citation is missing DOI (recommended when available)',
        category: 'completeness',
        citationId: citation.id,
        recommendation: 'Include DOI if available'
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate citation consistency
   */
  private validateCitationConsistency(
    citation: DetectedCitation
  ): { errors: CitationError[]; warnings: CitationWarning[] } {
    const errors: CitationError[] = [];
    const warnings: CitationWarning[] = [];

    // Check year format consistency
    if (citation.parsedComponents.year) {
      const year = parseInt(citation.parsedComponents.year);
      const currentYear = new Date().getFullYear();
      
      if (year > currentYear) {
        warnings.push({
          code: 'FUTURE_YEAR',
          message: 'Citation year is in the future',
          category: 'consistency',
          citationId: citation.id,
          recommendation: 'Verify publication year is correct'
        });
      }
      
      if (this.config.validationRules.requireRecentSources) {
        const maxAge = this.config.validationRules.maxSourceAge;
        if (currentYear - year > maxAge) {
          warnings.push({
            code: 'OLD_SOURCE',
            message: `Source is older than ${maxAge} years`,
            category: 'consistency',
            citationId: citation.id,
            recommendation: 'Consider using more recent sources'
          });
        }
      }
    }

    // Check author name consistency
    citation.parsedComponents.authors.forEach(author => {
      if (this.hasInconsistentAuthorFormat(author)) {
        warnings.push({
          code: 'INCONSISTENT_AUTHOR_FORMAT',
          message: 'Author name format appears inconsistent',
          category: 'consistency',
          citationId: citation.id,
          recommendation: 'Use consistent author name format throughout'
        });
      }
    });

    return { errors, warnings };
  }

  /**
   * Validate against known sources
   */
  private validateAgainstKnownSources(
    citation: DetectedCitation,
    verifiedSources: Citation[]
  ): { errors: CitationError[]; warnings: CitationWarning[] } {
    const errors: CitationError[] = [];
    const warnings: CitationWarning[] = [];

    // Check against verified sources
    const allSources = [...verifiedSources, ...Array.from(this.knownSources.values())];
    const matches = this.findSourceMatches(citation, allSources);

    if (matches.length === 0) {
      if (this.config.strictMode) {
        errors.push({
          code: 'UNVERIFIED_SOURCE',
          message: 'Citation does not match any verified sources',
          severity: 'critical',
          citationId: citation.id,
          suggestedFix: 'Verify source exists and is accurately cited',
          confidence: 0.8
        });
      } else {
        warnings.push({
          code: 'UNVERIFIED_SOURCE',
          message: 'Citation could not be verified against known sources',
          category: 'completeness',
          citationId: citation.id,
          recommendation: 'Verify source accuracy'
        });
      }
    } else if (matches.length > 1) {
      warnings.push({
        code: 'AMBIGUOUS_SOURCE',
        message: 'Citation matches multiple sources',
        category: 'consistency',
        citationId: citation.id,
        recommendation: 'Ensure citation is specific enough to identify unique source'
      });
    }

    return { errors, warnings };
  }

  /**
   * Detect potential citation hallucination
   */
  private detectCitationHallucination(
    citation: DetectedCitation
  ): { errors: CitationError[]; warnings: CitationWarning[] } {
    const errors: CitationError[] = [];
    const warnings: CitationWarning[] = [];

    // Check for suspicious patterns
    const suspiciousScore = this.calculateSuspiciousScore(citation);
    
    if (suspiciousScore > 0.8) {
      errors.push({
        code: 'POTENTIAL_HALLUCINATION',
        message: 'Citation shows high probability of being fabricated',
        severity: 'critical',
        citationId: citation.id,
        suggestedFix: 'Verify this citation exists and is accurate',
        confidence: suspiciousScore
      });
    } else if (suspiciousScore > 0.6) {
      warnings.push({
        code: 'SUSPICIOUS_CITATION',
        message: 'Citation has suspicious characteristics',
        category: 'completeness',
        citationId: citation.id,
        recommendation: 'Double-check citation accuracy'
      });
    }

    return { errors, warnings };
  }

  /**
   * Calculate suspicious score for hallucination detection
   */
  private calculateSuspiciousScore(citation: DetectedCitation): number {
    let suspiciousScore = 0;
    const factors = [];

    // Check for suspicious patterns
    this.suspiciousPatterns.forEach(pattern => {
      if (pattern.test(citation.citationText)) {
        suspiciousScore += 0.3;
        factors.push('Matches suspicious pattern');
      }
    });

    // Check for unrealistic combinations
    if (this.hasUnrealisticCombination(citation)) {
      suspiciousScore += 0.4;
      factors.push('Unrealistic component combination');
    }

    // Check for generic or placeholder-like text
    if (this.hasGenericText(citation)) {
      suspiciousScore += 0.3;
      factors.push('Contains generic or placeholder text');
    }

    // Check for format inconsistencies
    if (this.hasFormatInconsistencies(citation)) {
      suspiciousScore += 0.2;
      factors.push('Format inconsistencies detected');
    }

    citation.issues.push(...factors);
    
    return Math.min(1, suspiciousScore);
  }

  /**
   * Check for unrealistic component combinations
   */
  private hasUnrealisticCombination(citation: DetectedCitation): boolean {
    const components = citation.parsedComponents;
    
    // Check for impossible year/author combinations (simple heuristic)
    if (components.year && components.authors.length > 0) {
      const year = parseInt(components.year);
      const hasModernAuthor = components.authors.some(author => 
        /Smith|Johnson|Williams|Brown|Jones|Garcia|Miller|Davis|Rodriguez|Martinez/.test(author)
      );
      
      if (year < 1800 && hasModernAuthor) {
        return true; // Modern name with very old date
      }
    }
    
    return false;
  }

  /**
   * Check for generic placeholder text
   */
  private hasGenericText(citation: DetectedCitation): boolean {
    const text = citation.citationText.toLowerCase();
    const genericTerms = [
      'example', 'sample', 'placeholder', 'test', 'dummy',
      'author name', 'journal name', 'title here'
    ];
    
    return genericTerms.some(term => text.includes(term));
  }

  /**
   * Check for format inconsistencies
   */
  private hasFormatInconsistencies(citation: DetectedCitation): boolean {
    // Simple checks for obvious format problems
    const text = citation.citationText;
    
    // Multiple different citation formats in one
    const hasAPA = /\(\w+,\s*\d{4}\)/.test(text);
    const hasMLA = /\(\w+\s+\d+\)/.test(text);
    const hasNumbered = /\[\d+\]/.test(text);
    
    const formatCount = [hasAPA, hasMLA, hasNumbered].filter(Boolean).length;
    return formatCount > 1;
  }

  /**
   * Check for inconsistent author format
   */
  private hasInconsistentAuthorFormat(author: string): boolean {
    // Simple checks for common inconsistencies
    return author.includes('??') || 
           author.includes('...') || 
           author.length < 2 ||
           /\d{4}/.test(author); // Year mixed in with author
  }

  /**
   * Find matching sources
   */
  private findSourceMatches(citation: DetectedCitation, sources: Citation[]): Citation[] {
    const matches: Citation[] = [];
    const components = citation.parsedComponents;
    
    for (const source of sources) {
      let matchScore = 0;
      
      // Author matching
      if (components.authors.length > 0 && source.authors.length > 0) {
        const authorMatch = this.calculateAuthorMatch(components.authors, source.authors);
        matchScore += authorMatch * 0.4;
      }
      
      // Year matching
      if (components.year && source.publicationDate) {
        const sourceYear = new Date(source.publicationDate).getFullYear().toString();
        if (components.year === sourceYear) {
          matchScore += 0.3;
        }
      }
      
      // Title matching (if available)
      if (components.title && source.title) {
        const titleMatch = this.calculateTextMatch(components.title, source.title);
        matchScore += titleMatch * 0.3;
      }
      
      if (matchScore > 0.7) {
        matches.push(source);
      }
    }
    
    return matches;
  }

  /**
   * Calculate author name matching score
   */
  private calculateAuthorMatch(citationAuthors: string[], sourceAuthors: string[]): number {
    let totalMatch = 0;
    let comparisons = 0;
    
    for (const citationAuthor of citationAuthors) {
      for (const sourceAuthor of sourceAuthors) {
        const match = this.calculateTextMatch(
          citationAuthor.toLowerCase(),
          sourceAuthor.toLowerCase()
        );
        totalMatch += match;
        comparisons++;
      }
    }
    
    return comparisons > 0 ? totalMatch / comparisons : 0;
  }

  /**
   * Calculate text similarity score
   */
  private calculateTextMatch(text1: string, text2: string): number {
    // Simple Jaccard similarity
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Generate source key for lookup
   */
  private generateSourceKey(source: Citation): string {
    const authors = source.authors.join(',').toLowerCase();
    const year = source.publicationDate ? new Date(source.publicationDate).getFullYear() : '';
    const title = source.title ? source.title.toLowerCase().substring(0, 50) : '';
    
    return `${authors}_${year}_${title}`;
  }

  /**
   * Assess overall hallucination risk
   */
  private assessHallucinationRisk(
    citations: DetectedCitation[],
    verifiedSources: Citation[],
    content: string
  ): HallucinationRisk {
    const riskFactors: RiskFactor[] = [];
    let totalRiskScore = 0;

    // Analyze unverified citations
    const unverifiedCount = citations.filter(c => c.verificationStatus === 'unverified').length;
    const unverifiedRatio = citations.length > 0 ? unverifiedCount / citations.length : 0;
    
    if (unverifiedRatio > 0.5) {
      const factor: RiskFactor = {
        type: 'pattern',
        description: 'High ratio of unverified citations',
        riskContribution: unverifiedRatio * 0.6,
        evidence: [`${unverifiedCount} out of ${citations.length} citations unverified`],
        relatedCitations: citations.filter(c => c.verificationStatus === 'unverified').map(c => c.id)
      };
      riskFactors.push(factor);
      totalRiskScore += factor.riskContribution;
    }

    // Analyze suspicious patterns
    const suspiciousCitations = citations.filter(c => c.issues.length > 0);
    if (suspiciousCitations.length > 0) {
      const factor: RiskFactor = {
        type: 'anomaly',
        description: 'Citations with suspicious characteristics detected',
        riskContribution: (suspiciousCitations.length / citations.length) * 0.4,
        evidence: suspiciousCitations.map(c => `Citation ${c.id}: ${c.issues.join(', ')}`),
        relatedCitations: suspiciousCitations.map(c => c.id)
      };
      riskFactors.push(factor);
      totalRiskScore += factor.riskContribution;
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (totalRiskScore > 0.8) riskLevel = 'critical';
    else if (totalRiskScore > 0.6) riskLevel = 'high';
    else if (totalRiskScore > 0.3) riskLevel = 'medium';

    // Identify suspicious patterns in content
    const suspiciousPatterns = this.identifySuspiciousPatterns(content);

    return {
      riskLevel,
      riskScore: Math.min(1, totalRiskScore),
      riskFactors,
      suspiciousPatterns,
      confidence: riskFactors.length > 0 ? 0.8 : 0.5,
      mitigationRecommendations: this.generateRiskMitigation(riskLevel, riskFactors)
    };
  }

  /**
   * Identify suspicious patterns in content
   */
  private identifySuspiciousPatterns(content: string): string[] {
    const patterns: string[] = [];
    
    // Check for repetitive citation patterns that might indicate fabrication
    const citationDensity = (content.match(/\([^)]*\d{4}[^)]*\)/g) || []).length;
    const wordCount = content.split(/\s+/).length;
    
    if (citationDensity > 0 && wordCount / citationDensity < 30) {
      patterns.push('Unusually high citation density');
    }
    
    // Check for perfect formatting (might indicate copy-paste from example)
    if (/\([A-Z][a-z]+,\s+\d{4}\)/g.test(content)) {
      const perfectMatches = content.match(/\([A-Z][a-z]+,\s+\d{4}\)/g) || [];
      if (perfectMatches.length > 3) {
        patterns.push('Suspiciously perfect citation formatting');
      }
    }
    
    return patterns;
  }

  /**
   * Generate risk mitigation recommendations
   */
  private generateRiskMitigation(
    riskLevel: string,
    riskFactors: RiskFactor[]
  ): string[] {
    const recommendations: string[] = [];
    
    switch (riskLevel) {
      case 'critical':
        recommendations.push('Manual verification of all citations required before publication');
        recommendations.push('Consider complete rewrite with verified sources');
        break;
      case 'high':
        recommendations.push('Verify all unverified citations');
        recommendations.push('Review and validate suspicious citations');
        break;
      case 'medium':
        recommendations.push('Spot-check suspicious citations');
        recommendations.push('Ensure proper source documentation');
        break;
      default:
        recommendations.push('Standard citation verification procedures apply');
    }
    
    // Add specific recommendations based on risk factors
    riskFactors.forEach(factor => {
      if (factor.type === 'pattern') {
        recommendations.push('Review citation patterns for consistency');
      }
      if (factor.type === 'anomaly') {
        recommendations.push('Investigate anomalous citations individually');
      }
    });
    
    return recommendations;
  }

  /**
   * Verify all sources
   */
  private async verifyAllSources(
    citations: DetectedCitation[],
    verifiedSources: Citation[]
  ): Promise<SourceVerificationResult[]> {
    const results: SourceVerificationResult[] = [];
    
    for (const citation of citations) {
      const result = await this.verifySingleSource(citation, verifiedSources);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Verify single source
   */
  private async verifySingleSource(
    citation: DetectedCitation,
    verifiedSources: Citation[]
  ): Promise<SourceVerificationResult> {
    const matches = this.findSourceMatches(citation, verifiedSources);
    
    if (matches.length === 1) {
      return {
        citationId: citation.id,
        status: 'verified',
        confidence: 0.9,
        matchedSource: matches[0],
        details: 'Citation matched verified source',
        issues: [],
        alternativeSources: []
      };
    } else if (matches.length > 1) {
      return {
        citationId: citation.id,
        status: 'partial_match',
        confidence: 0.6,
        details: 'Citation matched multiple sources',
        issues: ['Ambiguous citation - multiple matches found'],
        alternativeSources: matches.slice(1)
      };
    } else {
      return {
        citationId: citation.id,
        status: 'not_found',
        confidence: 0.2,
        details: 'Citation not found in verified sources',
        issues: ['Could not verify citation against known sources'],
        alternativeSources: []
      };
    }
  }

  /**
   * Calculate overall confidence
   */
  private calculateOverallConfidence(
    citations: DetectedCitation[],
    hallucinationRisk: HallucinationRisk,
    sourceVerification: SourceVerificationResult[]
  ): number {
    if (citations.length === 0) return 1.0;

    let totalConfidence = 0;
    let factorCount = 0;

    // Citation accuracy confidence
    const avgCitationConfidence = citations.reduce((sum, c) => sum + c.accuracyConfidence, 0) / citations.length;
    totalConfidence += avgCitationConfidence;
    factorCount++;

    // Hallucination risk (inverted)
    totalConfidence += (1 - hallucinationRisk.riskScore);
    factorCount++;

    // Source verification confidence
    if (sourceVerification.length > 0) {
      const avgVerificationConfidence = sourceVerification.reduce((sum, v) => sum + v.confidence, 0) / sourceVerification.length;
      totalConfidence += avgVerificationConfidence;
      factorCount++;
    }

    return totalConfidence / factorCount;
  }

  /**
   * Determine validation status
   */
  private determineValidationStatus(
    errors: CitationError[],
    warnings: CitationWarning[],
    hallucinationRisk: HallucinationRisk,
    confidence: number
  ): boolean {
    // Check for critical errors
    const criticalErrors = errors.filter(e => e.severity === 'critical');
    if (criticalErrors.length > 0) return false;

    // Check hallucination risk
    if (hallucinationRisk.riskLevel === 'critical') return false;

    // Check confidence threshold
    if (confidence < this.config.minimumConfidence) return false;

    // Check risk score threshold
    if (hallucinationRisk.riskScore > this.config.maxRiskScore) return false;

    return true;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    errors: CitationError[],
    warnings: CitationWarning[],
    hallucinationRisk: HallucinationRisk,
    sourceVerification: SourceVerificationResult[]
  ): string[] {
    const recommendations: string[] = [];

    // Error-based recommendations
    const criticalErrors = errors.filter(e => e.severity === 'critical');
    if (criticalErrors.length > 0) {
      recommendations.push('Address critical citation errors before proceeding');
      recommendations.push('Manually verify all flagged citations');
    }

    // Warning-based recommendations
    const formatWarnings = warnings.filter(w => w.category === 'format');
    if (formatWarnings.length > 0) {
      recommendations.push(`Ensure consistent ${this.config.requiredStyle} formatting throughout`);
    }

    // Risk-based recommendations
    recommendations.push(...hallucinationRisk.mitigationRecommendations);

    // Verification-based recommendations
    const unverifiedCount = sourceVerification.filter(v => v.status === 'not_found').length;
    if (unverifiedCount > 0) {
      recommendations.push(`Verify ${unverifiedCount} unverified citations`);
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Citations appear valid - continue with standard review process');
    }

    return recommendations;
  }

  /**
   * Initialize format validators
   */
  private initializeFormatValidators(): void {
    // Initialize APA validator
    this.formatValidators.set('APA', new APAFormatValidator());
    
    // Initialize MLA validator
    this.formatValidators.set('MLA', new MLAFormatValidator());
    
    // Initialize Chicago validator
    this.formatValidators.set('Chicago', new ChicagoFormatValidator());
    
    // Initialize Harvard validator
    this.formatValidators.set('Harvard', new HarvardFormatValidator());
  }

  /**
   * Initialize suspicious patterns
   */
  private initializeSuspiciousPatterns(): void {
    this.suspiciousPatterns = [
      /Example|Sample|Test|Placeholder/i,
      /Author\s+Name|Journal\s+Name|Title\s+Here/i,
      /\d{4}[a-z]/i, // Year with lowercase letter (suspicious pattern)
      /\([^)]*\?\?\?[^)]*\)/i, // Question marks in citations
      /et\s+al\.\s*,\s*et\s+al\./i // Duplicate et al.
    ];
  }
}

/**
 * Abstract base class for format validators
 */
abstract class CitationFormatValidator {
  abstract validate(citation: DetectedCitation): { errors: CitationError[]; warnings: CitationWarning[] };
}

/**
 * APA Format Validator
 */
class APAFormatValidator extends CitationFormatValidator {
  validate(citation: DetectedCitation): { errors: CitationError[]; warnings: CitationWarning[] } {
    const errors: CitationError[] = [];
    const warnings: CitationWarning[] = [];

    // APA specific validation logic
    const apaPattern = /^\([^)]+,\s*\d{4}[^)]*\)$/;
    if (citation.type === 'in_text' && !apaPattern.test(citation.citationText)) {
      errors.push({
        code: 'APA_FORMAT_ERROR',
        message: 'Citation does not follow APA format',
        severity: 'major',
        citationId: citation.id,
        suggestedFix: 'Use format: (Author, Year) or (Author, Year, p. XX)',
        confidence: 0.9
      });
    }

    return { errors, warnings };
  }
}

/**
 * MLA Format Validator
 */
class MLAFormatValidator extends CitationFormatValidator {
  validate(citation: DetectedCitation): { errors: CitationError[]; warnings: CitationWarning[] } {
    const errors: CitationError[] = [];
    const warnings: CitationWarning[] = [];

    // MLA specific validation logic
    const mlaPattern = /^\([^)]+\s+\d+[^)]*\)$/;
    if (citation.type === 'in_text' && !mlaPattern.test(citation.citationText)) {
      errors.push({
        code: 'MLA_FORMAT_ERROR',
        message: 'Citation does not follow MLA format',
        severity: 'major',
        citationId: citation.id,
        suggestedFix: 'Use format: (Author Page) or (Author, "Title" Page)',
        confidence: 0.9
      });
    }

    return { errors, warnings };
  }
}

/**
 * Chicago Format Validator
 */
class ChicagoFormatValidator extends CitationFormatValidator {
  validate(citation: DetectedCitation): { errors: CitationError[]; warnings: CitationWarning[] } {
    const errors: CitationError[] = [];
    const warnings: CitationWarning[] = [];

    // Chicago specific validation logic (simplified)
    // Chicago style is more flexible, so basic checks only
    
    return { errors, warnings };
  }
}

/**
 * Harvard Format Validator  
 */
class HarvardFormatValidator extends CitationFormatValidator {
  validate(citation: DetectedCitation): { errors: CitationError[]; warnings: CitationWarning[] } {
    const errors: CitationError[] = [];
    const warnings: CitationWarning[] = [];

    // Harvard specific validation logic (similar to APA)
    const harvardPattern = /^\([^)]+,?\s*\d{4}[^)]*\)$/;
    if (citation.type === 'in_text' && !harvardPattern.test(citation.citationText)) {
      errors.push({
        code: 'HARVARD_FORMAT_ERROR',
        message: 'Citation does not follow Harvard format',
        severity: 'major',
        citationId: citation.id,
        suggestedFix: 'Use format: (Author Year) or (Author, Year, p. XX)',
        confidence: 0.9
      });
    }

    return { errors, warnings };
  }
}

/**
 * Create default citation validator
 */
export function createCitationValidator(config: Partial<CitationValidationConfig> = {}): CitationValidator {
  const defaultConfig: CitationValidationConfig = {
    strictMode: true,
    requiredStyle: 'APA',
    enableHallucinationDetection: true,
    enableSourceVerification: true,
    minimumConfidence: 0.7,
    maxRiskScore: 0.6,
    validationRules: {
      requireCompleteBibliography: true,
      requireDOI: false,
      requireRecentSources: false,
      maxSourceAge: 10,
      minSourceCount: 1,
      requirePeerReviewed: false,
      allowedSourceTypes: ['journal', 'book', 'conference', 'report'],
      forbiddenPatterns: [],
      customRules: []
    }
  };

  return new CitationValidator({ ...defaultConfig, ...config });
}

/**
 * Default citation validator instance
 */
export const citationValidator = createCitationValidator();