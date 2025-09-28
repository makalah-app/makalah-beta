/**
 * Academic Standards Enforcement Guardrail System
 * 
 * Provides comprehensive academic writing standards enforcement and quality gates
 * with multi-dimensional quality assessment and automatic improvement suggestions.
 * 
 * Based on Vercel AI SDK v5 middleware patterns from:
 * /Users/eriksupit/Desktop/makalah/documentation/docs/03-ai-sdk-core/40-middleware.mdx
 */

import type { LanguageModelV2Middleware, LanguageModelV2Content } from '@ai-sdk/provider';

export interface AcademicStandardsConfig {
  /** Writing style requirements */
  writingStyle: WritingStyleConfig;
  /** Citation format requirements */
  citationFormat: CitationFormatConfig;
  /** Content quality thresholds */
  qualityThresholds: QualityThresholdsConfig;
  /** Language and grammar standards */
  languageStandards: LanguageStandardsConfig;
  /** Academic integrity requirements */
  integrityRequirements: IntegrityRequirementsConfig;
  /** Evaluation criteria weights */
  evaluationWeights: EvaluationWeightsConfig;
}

export interface WritingStyleConfig {
  /** Target academic level */
  academicLevel: 'undergraduate' | 'graduate' | 'doctoral' | 'professional';
  /** Required writing tone */
  tone: 'formal' | 'semi-formal' | 'objective' | 'analytical';
  /** Language preference */
  language: 'indonesian' | 'english' | 'bilingual';
  /** Minimum sentence complexity */
  minComplexityScore: number;
  /** Maximum passive voice percentage */
  maxPassiveVoicePercent: number;
  /** Required vocabulary sophistication */
  vocabularySophistication: 'basic' | 'intermediate' | 'advanced' | 'expert';
}

export interface CitationFormatConfig {
  /** Citation style */
  style: 'APA' | 'MLA' | 'Chicago' | 'IEEE' | 'Harvard' | 'Vancouver';
  /** Minimum citations per section */
  minCitationsPerSection: number;
  /** Maximum citation age (years) */
  maxCitationAge: number;
  /** Required source diversity */
  sourceDiversityRequirement: number;
  /** In-text citation format validation */
  enforceInTextFormat: boolean;
  /** Reference list format validation */
  enforceReferenceFormat: boolean;
}

export interface QualityThresholdsConfig {
  /** Minimum coherence score */
  minCoherenceScore: number;
  /** Minimum argument strength */
  minArgumentStrength: number;
  /** Minimum evidence quality */
  minEvidenceQuality: number;
  /** Maximum redundancy percentage */
  maxRedundancyPercent: number;
  /** Minimum originality score */
  minOriginalityScore: number;
  /** Required logical flow score */
  minLogicalFlowScore: number;
}

export interface LanguageStandardsConfig {
  /** Grammar accuracy threshold */
  grammarAccuracyThreshold: number;
  /** Spelling accuracy threshold */
  spellingAccuracyThreshold: number;
  /** Punctuation accuracy threshold */
  punctuationAccuracyThreshold: number;
  /** Terminology consistency requirement */
  terminologyConsistency: boolean;
  /** Formal language requirement */
  formalLanguageRequired: boolean;
  /** Academic vocabulary minimum percentage */
  academicVocabularyMinPercent: number;
}

export interface IntegrityRequirementsConfig {
  /** Plagiarism detection threshold */
  plagiarismThreshold: number;
  /** Self-citation detection */
  detectSelfCitation: boolean;
  /** Source attribution requirement */
  requireSourceAttribution: boolean;
  /** Fact verification requirement */
  requireFactVerification: boolean;
  /** Original contribution requirement */
  requireOriginalContribution: boolean;
}

export interface EvaluationWeightsConfig {
  writingQuality: number;
  citationAccuracy: number;
  contentCoherence: number;
  academicIntegrity: number;
  languageStandards: number;
  argumentStrength: number;
}

export interface AcademicStandardsResult {
  /** Overall compliance score (0-1) */
  overallScore: number;
  /** Compliance status */
  status: 'excellent' | 'good' | 'acceptable' | 'needs_improvement' | 'unacceptable';
  /** Detailed assessment by category */
  categoryScores: CategoryScores;
  /** Identified violations */
  violations: AcademicViolation[];
  /** Improvement suggestions */
  suggestions: ImprovementSuggestion[];
  /** Quality metrics */
  qualityMetrics: QualityMetrics;
  /** Assessment timestamp */
  assessedAt: Date;
}

export interface CategoryScores {
  writingQuality: number;
  citationAccuracy: number;
  contentCoherence: number;
  academicIntegrity: number;
  languageStandards: number;
  argumentStrength: number;
}

export interface AcademicViolation {
  /** Violation type */
  type: 'citation_error' | 'grammar_error' | 'style_violation' | 'integrity_issue' | 'coherence_problem' | 'argument_weakness';
  /** Violation severity */
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  /** Description of the violation */
  description: string;
  /** Location in text (if applicable) */
  location?: TextLocation;
  /** Suggested correction */
  suggestedFix: string;
  /** Rule that was violated */
  violatedRule: string;
}

export interface ImprovementSuggestion {
  /** Suggestion category */
  category: 'writing' | 'citation' | 'structure' | 'language' | 'argumentation';
  /** Priority level */
  priority: 'high' | 'medium' | 'low';
  /** Improvement description */
  description: string;
  /** Specific action to take */
  action: string;
  /** Expected impact */
  expectedImpact: string;
}

export interface QualityMetrics {
  /** Text statistics */
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  averageSentenceLength: number;
  
  /** Language quality */
  grammarScore: number;
  readabilityScore: number;
  vocabularyDiversity: number;
  
  /** Academic quality */
  citationDensity: number;
  argumentComplexity: number;
  evidenceStrength: number;
  
  /** Structural quality */
  coherenceScore: number;
  logicalFlow: number;
  transitionQuality: number;
}

export interface TextLocation {
  line: number;
  column: number;
  length: number;
  context: string;
}

/**
 * Default academic standards configuration
 */
export const DEFAULT_ACADEMIC_STANDARDS_CONFIG: AcademicStandardsConfig = {
  writingStyle: {
    academicLevel: 'graduate',
    tone: 'formal',
    language: 'indonesian',
    minComplexityScore: 0.6,
    maxPassiveVoicePercent: 30,
    vocabularySophistication: 'advanced'
  },
  citationFormat: {
    style: 'APA',
    minCitationsPerSection: 2,
    maxCitationAge: 10,
    sourceDiversityRequirement: 0.7,
    enforceInTextFormat: true,
    enforceReferenceFormat: true
  },
  qualityThresholds: {
    minCoherenceScore: 0.75,
    minArgumentStrength: 0.70,
    minEvidenceQuality: 0.65,
    maxRedundancyPercent: 15,
    minOriginalityScore: 0.80,
    minLogicalFlowScore: 0.70
  },
  languageStandards: {
    grammarAccuracyThreshold: 0.95,
    spellingAccuracyThreshold: 0.98,
    punctuationAccuracyThreshold: 0.90,
    terminologyConsistency: true,
    formalLanguageRequired: true,
    academicVocabularyMinPercent: 40
  },
  integrityRequirements: {
    plagiarismThreshold: 0.15,
    detectSelfCitation: true,
    requireSourceAttribution: true,
    requireFactVerification: true,
    requireOriginalContribution: true
  },
  evaluationWeights: {
    writingQuality: 0.20,
    citationAccuracy: 0.18,
    contentCoherence: 0.17,
    academicIntegrity: 0.15,
    languageStandards: 0.15,
    argumentStrength: 0.15
  }
};

/**
 * Academic Standards Enforcement Service
 */
export class AcademicStandardsService {
  private config: AcademicStandardsConfig;

  constructor(config: Partial<AcademicStandardsConfig> = {}) {
    this.config = this.mergeConfig(DEFAULT_ACADEMIC_STANDARDS_CONFIG, config);
  }

  /**
   * Evaluate text against academic standards
   */
  async evaluateText(text: string, context?: any): Promise<AcademicStandardsResult> {
    const categoryScores = await this.calculateCategoryScores(text, context);
    const overallScore = this.calculateOverallScore(categoryScores);
    const status = this.determineStatus(overallScore);
    const violations = await this.identifyViolations(text, categoryScores);
    const suggestions = this.generateSuggestions(violations, categoryScores);
    const qualityMetrics = await this.calculateQualityMetrics(text);

    return {
      overallScore,
      status,
      categoryScores,
      violations,
      suggestions,
      qualityMetrics,
      assessedAt: new Date()
    };
  }

  /**
   * Calculate scores for each category
   */
  private async calculateCategoryScores(text: string, context?: any): Promise<CategoryScores> {
    const [
      writingQuality,
      citationAccuracy,
      contentCoherence,
      academicIntegrity,
      languageStandards,
      argumentStrength
    ] = await Promise.all([
      this.evaluateWritingQuality(text),
      this.evaluateCitationAccuracy(text),
      this.evaluateContentCoherence(text),
      this.evaluateAcademicIntegrity(text),
      this.evaluateLanguageStandards(text),
      this.evaluateArgumentStrength(text)
    ]);

    return {
      writingQuality,
      citationAccuracy,
      contentCoherence,
      academicIntegrity,
      languageStandards,
      argumentStrength
    };
  }

  /**
   * Evaluate writing quality
   */
  private async evaluateWritingQuality(text: string): Promise<number> {
    let score = 0;
    let factors = 0;

    // Sentence complexity analysis
    const complexityScore = this.calculateComplexityScore(text);
    if (complexityScore >= this.config.writingStyle.minComplexityScore) {
      score += 0.3;
    } else {
      score += 0.3 * (complexityScore / this.config.writingStyle.minComplexityScore);
    }
    factors += 0.3;

    // Passive voice analysis
    const passiveVoicePercent = this.calculatePassiveVoicePercentage(text);
    if (passiveVoicePercent <= this.config.writingStyle.maxPassiveVoicePercent) {
      score += 0.2;
    } else {
      const penalty = (passiveVoicePercent - this.config.writingStyle.maxPassiveVoicePercent) / 100;
      score += Math.max(0, 0.2 - penalty);
    }
    factors += 0.2;

    // Vocabulary sophistication
    const vocabularyScore = this.evaluateVocabularySophistication(text);
    score += 0.3 * vocabularyScore;
    factors += 0.3;

    // Academic tone assessment
    const toneScore = this.assessAcademicTone(text);
    score += 0.2 * toneScore;
    factors += 0.2;

    return Math.min(1, score / factors);
  }

  /**
   * Evaluate citation accuracy
   */
  private async evaluateCitationAccuracy(text: string): Promise<number> {
    let score = 0;
    let factors = 0;

    // Citation format compliance
    const formatCompliance = this.checkCitationFormat(text);
    score += 0.4 * formatCompliance;
    factors += 0.4;

    // Citation density
    const citationDensity = this.calculateCitationDensity(text);
    const minDensity = this.config.citationFormat.minCitationsPerSection / 1000; // per 1000 words
    if (citationDensity >= minDensity) {
      score += 0.3;
    } else {
      score += 0.3 * (citationDensity / minDensity);
    }
    factors += 0.3;

    // Source diversity
    const sourceDiversity = this.calculateSourceDiversity(text);
    if (sourceDiversity >= this.config.citationFormat.sourceDiversityRequirement) {
      score += 0.3;
    } else {
      score += 0.3 * (sourceDiversity / this.config.citationFormat.sourceDiversityRequirement);
    }
    factors += 0.3;

    return Math.min(1, score / factors);
  }

  /**
   * Evaluate content coherence
   */
  private async evaluateContentCoherence(text: string): Promise<number> {
    let score = 0;

    // Logical flow analysis
    const logicalFlow = this.analyzeLogicalFlow(text);
    score += 0.4 * logicalFlow;

    // Transition quality
    const transitionQuality = this.evaluateTransitions(text);
    score += 0.3 * transitionQuality;

    // Thematic consistency
    const thematicConsistency = this.assessThematicConsistency(text);
    score += 0.3 * thematicConsistency;

    return Math.min(1, score);
  }

  /**
   * Evaluate academic integrity
   */
  private async evaluateAcademicIntegrity(text: string): Promise<number> {
    let score = 1; // Start with perfect score, deduct for violations

    // Plagiarism detection (simulated)
    const plagiarismScore = await this.detectPlagiarism(text);
    if (plagiarismScore > this.config.integrityRequirements.plagiarismThreshold) {
      score -= 0.5;
    }

    // Original contribution assessment
    const originalityScore = this.assessOriginality(text);
    if (originalityScore < this.config.qualityThresholds.minOriginalityScore) {
      score -= 0.3;
    }

    // Proper attribution check
    const attributionScore = this.checkProperAttribution(text);
    score *= attributionScore;

    return Math.max(0, score);
  }

  /**
   * Evaluate language standards
   */
  private async evaluateLanguageStandards(text: string): Promise<number> {
    let score = 0;

    // Grammar accuracy
    const grammarScore = this.checkGrammar(text);
    score += 0.4 * grammarScore;

    // Spelling accuracy
    const spellingScore = this.checkSpelling(text);
    score += 0.3 * spellingScore;

    // Academic vocabulary usage
    const vocabScore = this.assessAcademicVocabulary(text);
    score += 0.3 * vocabScore;

    return Math.min(1, score);
  }

  /**
   * Evaluate argument strength
   */
  private async evaluateArgumentStrength(text: string): Promise<number> {
    let score = 0;

    // Evidence quality
    const evidenceScore = this.assessEvidenceQuality(text);
    score += 0.4 * evidenceScore;

    // Logical reasoning
    const reasoningScore = this.evaluateLogicalReasoning(text);
    score += 0.3 * reasoningScore;

    // Counter-argument consideration
    const counterArgScore = this.assessCounterArguments(text);
    score += 0.3 * counterArgScore;

    return Math.min(1, score);
  }

  /**
   * Calculate overall score using weighted average
   */
  private calculateOverallScore(categoryScores: CategoryScores): number {
    const weights = this.config.evaluationWeights;
    
    return (
      categoryScores.writingQuality * weights.writingQuality +
      categoryScores.citationAccuracy * weights.citationAccuracy +
      categoryScores.contentCoherence * weights.contentCoherence +
      categoryScores.academicIntegrity * weights.academicIntegrity +
      categoryScores.languageStandards * weights.languageStandards +
      categoryScores.argumentStrength * weights.argumentStrength
    );
  }

  /**
   * Determine status based on overall score
   */
  private determineStatus(score: number): AcademicStandardsResult['status'] {
    if (score >= 0.90) return 'excellent';
    if (score >= 0.80) return 'good';
    if (score >= 0.70) return 'acceptable';
    if (score >= 0.60) return 'needs_improvement';
    return 'unacceptable';
  }

  /**
   * Identify specific violations
   */
  private async identifyViolations(text: string, scores: CategoryScores): Promise<AcademicViolation[]> {
    const violations: AcademicViolation[] = [];

    // Check each category for violations
    if (scores.writingQuality < 0.7) {
      violations.push(...await this.identifyWritingViolations(text));
    }

    if (scores.citationAccuracy < 0.7) {
      violations.push(...await this.identifyCitationViolations(text));
    }

    if (scores.languageStandards < 0.8) {
      violations.push(...await this.identifyLanguageViolations(text));
    }

    if (scores.academicIntegrity < 0.8) {
      violations.push(...await this.identifyIntegrityViolations(text));
    }

    return violations.sort((a, b) => this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity));
  }

  /**
   * Generate improvement suggestions
   */
  private generateSuggestions(violations: AcademicViolation[], scores: CategoryScores): ImprovementSuggestion[] {
    const suggestions: ImprovementSuggestion[] = [];

    // Generate suggestions based on violations and low scores
    if (scores.writingQuality < 0.8) {
      suggestions.push({
        category: 'writing',
        priority: 'high',
        description: 'Improve writing quality and academic sophistication',
        action: 'Use more complex sentence structures and advanced vocabulary',
        expectedImpact: 'Enhanced academic credibility and readability'
      });
    }

    if (scores.citationAccuracy < 0.8) {
      suggestions.push({
        category: 'citation',
        priority: 'high',
        description: 'Improve citation format and source integration',
        action: 'Review citation style guide and increase source diversity',
        expectedImpact: 'Better academic integrity and credibility'
      });
    }

    // Add more suggestions based on specific violations
    violations.forEach(violation => {
      if (violation.severity === 'critical' || violation.severity === 'major') {
        suggestions.push(this.createSuggestionFromViolation(violation));
      }
    });

    return suggestions;
  }

  /**
   * Calculate quality metrics
   */
  private async calculateQualityMetrics(text: string): Promise<QualityMetrics> {
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
    const paragraphs = text.split(/\n\s*\n/).filter(para => para.trim().length > 0);

    return {
      wordCount: words.length,
      sentenceCount: sentences.length,
      paragraphCount: paragraphs.length,
      averageSentenceLength: words.length / sentences.length,
      
      grammarScore: this.checkGrammar(text),
      readabilityScore: this.calculateReadability(text),
      vocabularyDiversity: this.calculateVocabularyDiversity(text),
      
      citationDensity: this.calculateCitationDensity(text),
      argumentComplexity: this.assessArgumentComplexity(text),
      evidenceStrength: this.assessEvidenceQuality(text),
      
      coherenceScore: this.analyzeLogicalFlow(text),
      logicalFlow: this.analyzeLogicalFlow(text),
      transitionQuality: this.evaluateTransitions(text)
    };
  }

  // Helper methods (simplified implementations for demo)
  private calculateComplexityScore(text: string): number {
    // Analyze sentence complexity, subordinate clauses, etc.
    const avgSentenceLength = text.split(/[.!?]+/).reduce((sum, sentence) => 
      sum + sentence.split(/\s+/).length, 0) / text.split(/[.!?]+/).length;
    
    return Math.min(1, avgSentenceLength / 20); // Normalize to 0-1
  }

  private calculatePassiveVoicePercentage(text: string): number {
    // Simplified passive voice detection
    const passiveIndicators = ['dibuat', 'dilakukan', 'ditemukan', 'dianalisis', 'diteliti'];
    const sentences = text.split(/[.!?]+/);
    let passiveCount = 0;
    
    sentences.forEach(sentence => {
      if (passiveIndicators.some(indicator => sentence.toLowerCase().includes(indicator))) {
        passiveCount++;
      }
    });
    
    return (passiveCount / sentences.length) * 100;
  }

  private evaluateVocabularySophistication(text: string): number {
    // Simplified vocabulary sophistication analysis
    const sophisticatedWords = ['menganalisis', 'komprehensif', 'signifikan', 'metodologi', 'paradigma'];
    const words = text.toLowerCase().split(/\s+/);
    const sophisticatedCount = words.filter(word => 
      sophisticatedWords.some(sophisticated => word.includes(sophisticated))
    ).length;
    
    return Math.min(1, sophisticatedCount / (words.length * 0.05)); // 5% sophisticated words = 1.0
  }

  private assessAcademicTone(text: string): number {
    // Assess formal/academic tone
    const informalWords = ['banget', 'gimana', 'kayak', 'udah', 'gak'];
    const formalWords = ['oleh karena itu', 'dengan demikian', 'berdasarkan', 'menurut'];
    
    const words = text.toLowerCase().split(/\s+/);
    const informalCount = words.filter(word => informalWords.includes(word)).length;
    const formalCount = words.filter(word => formalWords.includes(word)).length;
    
    if (informalCount > 0) return Math.max(0, 1 - (informalCount / words.length * 100));
    return Math.min(1, formalCount / (words.length * 0.02)); // 2% formal markers = 1.0
  }

  private checkCitationFormat(text: string): number {
    // Simplified citation format checking for Indonesian academic style
    const citationPatterns = [
      /\([A-Za-z]+,\s*\d{4}\)/g, // (Author, Year)
      /\([A-Za-z]+\s+et\s+al\.,\s*\d{4}\)/g, // (Author et al., Year)
    ];
    
    let validCitations = 0;
    let totalCitations = 0;
    
    citationPatterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      totalCitations += matches.length;
      validCitations += matches.length; // Assume all matches are valid for simplification
    });
    
    return totalCitations > 0 ? validCitations / totalCitations : 0.5;
  }

  private calculateCitationDensity(text: string): number {
    const words = text.split(/\s+/).length;
    const citations = (text.match(/\([A-Za-z]+.*?\d{4}\)/g) || []).length;
    return citations / (words / 1000); // Citations per 1000 words
  }

  private calculateSourceDiversity(text: string): number {
    // Simplified source diversity calculation
    const citations = text.match(/\([A-Za-z]+.*?\d{4}\)/g) || [];
    const uniqueAuthors = new Set(citations.map(citation => 
      citation.match(/\(([A-Za-z]+)/)?.[1] || ''
    ));
    
    return citations.length > 0 ? uniqueAuthors.size / citations.length : 0;
  }

  private analyzeLogicalFlow(text: string): number {
    // Simplified logical flow analysis
    const transitionWords = ['oleh karena itu', 'dengan demikian', 'selain itu', 'namun', 'akan tetapi'];
    const paragraphs = text.split(/\n\s*\n/);
    let transitionCount = 0;
    
    paragraphs.forEach(paragraph => {
      if (transitionWords.some(word => paragraph.toLowerCase().includes(word))) {
        transitionCount++;
      }
    });
    
    return Math.min(1, transitionCount / (paragraphs.length * 0.5));
  }

  private evaluateTransitions(text: string): number {
    return this.analyzeLogicalFlow(text); // Simplified - same as logical flow
  }

  private assessThematicConsistency(text: string): number {
    // Simplified thematic consistency assessment
    return 0.8; // Placeholder
  }

  private async detectPlagiarism(text: string): Promise<number> {
    // Simulated plagiarism detection
    return Math.random() * 0.1; // 0-10% similarity
  }

  private assessOriginality(text: string): number {
    // Simplified originality assessment
    return 0.85; // Placeholder
  }

  private checkProperAttribution(text: string): number {
    // Check for proper source attribution
    const quotes = text.match(/"[^"]*"/g) || [];
    const citationsAfterQuotes = quotes.filter(quote => {
      const quoteIndex = text.indexOf(quote);
      const afterQuote = text.substring(quoteIndex + quote.length, quoteIndex + quote.length + 50);
      return /\([A-Za-z]+.*?\d{4}\)/.test(afterQuote);
    });
    
    return quotes.length > 0 ? citationsAfterQuotes.length / quotes.length : 1;
  }

  private checkGrammar(text: string): number {
    // Simplified grammar checking
    return 0.92; // Placeholder
  }

  private checkSpelling(text: string): number {
    // Simplified spelling checking
    return 0.96; // Placeholder
  }

  private assessAcademicVocabulary(text: string): number {
    return this.evaluateVocabularySophistication(text);
  }

  private assessEvidenceQuality(text: string): number {
    // Assess quality of evidence presented
    const evidenceMarkers = ['data menunjukkan', 'penelitian membuktikan', 'hasil analisis', 'berdasarkan temuan'];
    const sentences = text.split(/[.!?]+/);
    const evidenceCount = sentences.filter(sentence =>
      evidenceMarkers.some(marker => sentence.toLowerCase().includes(marker))
    ).length;
    
    return Math.min(1, evidenceCount / (sentences.length * 0.1));
  }

  private evaluateLogicalReasoning(text: string): number {
    // Assess logical reasoning patterns
    const reasoningMarkers = ['karena', 'sebab', 'akibatnya', 'dengan demikian', 'oleh karena itu'];
    const sentences = text.split(/[.!?]+/);
    const reasoningCount = sentences.filter(sentence =>
      reasoningMarkers.some(marker => sentence.toLowerCase().includes(marker))
    ).length;
    
    return Math.min(1, reasoningCount / (sentences.length * 0.15));
  }

  private assessCounterArguments(text: string): number {
    // Check for consideration of counter-arguments
    const counterMarkers = ['namun', 'akan tetapi', 'sebaliknya', 'di sisi lain', 'meskipun demikian'];
    return counterMarkers.some(marker => text.toLowerCase().includes(marker)) ? 0.8 : 0.3;
  }

  private calculateReadability(text: string): number {
    // Simplified readability calculation
    return 0.75; // Placeholder
  }

  private calculateVocabularyDiversity(text: string): number {
    const words = text.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    return uniqueWords.size / words.length;
  }

  private assessArgumentComplexity(text: string): number {
    return this.evaluateLogicalReasoning(text);
  }

  // Violation identification methods
  private async identifyWritingViolations(text: string): Promise<AcademicViolation[]> {
    const violations: AcademicViolation[] = [];
    
    if (this.calculatePassiveVoicePercentage(text) > this.config.writingStyle.maxPassiveVoicePercent) {
      violations.push({
        type: 'style_violation',
        severity: 'moderate',
        description: 'Excessive use of passive voice',
        suggestedFix: 'Convert passive constructions to active voice',
        violatedRule: 'Maximum passive voice percentage exceeded'
      });
    }
    
    return violations;
  }

  private async identifyCitationViolations(text: string): Promise<AcademicViolation[]> {
    const violations: AcademicViolation[] = [];
    
    if (this.calculateCitationDensity(text) < this.config.citationFormat.minCitationsPerSection / 1000) {
      violations.push({
        type: 'citation_error',
        severity: 'major',
        description: 'Insufficient citation density',
        suggestedFix: 'Add more relevant citations to support arguments',
        violatedRule: 'Minimum citations per section requirement'
      });
    }
    
    return violations;
  }

  private async identifyLanguageViolations(text: string): Promise<AcademicViolation[]> {
    const violations: AcademicViolation[] = [];
    
    // Check for informal language
    const informalWords = ['banget', 'gimana', 'kayak', 'udah', 'gak'];
    const foundInformal = informalWords.filter(word => text.toLowerCase().includes(word));
    
    if (foundInformal.length > 0) {
      violations.push({
        type: 'style_violation',
        severity: 'major',
        description: `Informal language detected: ${foundInformal.join(', ')}`,
        suggestedFix: 'Replace with formal academic language',
        violatedRule: 'Formal language requirement'
      });
    }
    
    return violations;
  }

  private async identifyIntegrityViolations(text: string): Promise<AcademicViolation[]> {
    const violations: AcademicViolation[] = [];
    
    const plagiarismScore = await this.detectPlagiarism(text);
    if (plagiarismScore > this.config.integrityRequirements.plagiarismThreshold) {
      violations.push({
        type: 'integrity_issue',
        severity: 'critical',
        description: `High similarity detected: ${(plagiarismScore * 100).toFixed(1)}%`,
        suggestedFix: 'Rewrite content or add proper attribution',
        violatedRule: 'Plagiarism threshold exceeded'
      });
    }
    
    return violations;
  }

  private getSeverityWeight(severity: AcademicViolation['severity']): number {
    switch (severity) {
      case 'critical': return 4;
      case 'major': return 3;
      case 'moderate': return 2;
      case 'minor': return 1;
      default: return 0;
    }
  }

  private createSuggestionFromViolation(violation: AcademicViolation): ImprovementSuggestion {
    const categoryMap: Record<AcademicViolation['type'], ImprovementSuggestion['category']> = {
      citation_error: 'citation',
      grammar_error: 'language',
      style_violation: 'writing',
      integrity_issue: 'writing',
      coherence_problem: 'structure',
      argument_weakness: 'argumentation'
    };

    return {
      category: categoryMap[violation.type],
      priority: violation.severity === 'critical' || violation.severity === 'major' ? 'high' : 'medium',
      description: violation.description,
      action: violation.suggestedFix,
      expectedImpact: 'Improved academic standards compliance'
    };
  }

  private mergeConfig(
    defaultConfig: AcademicStandardsConfig,
    userConfig: Partial<AcademicStandardsConfig>
  ): AcademicStandardsConfig {
    return {
      writingStyle: { ...defaultConfig.writingStyle, ...userConfig.writingStyle },
      citationFormat: { ...defaultConfig.citationFormat, ...userConfig.citationFormat },
      qualityThresholds: { ...defaultConfig.qualityThresholds, ...userConfig.qualityThresholds },
      languageStandards: { ...defaultConfig.languageStandards, ...userConfig.languageStandards },
      integrityRequirements: { ...defaultConfig.integrityRequirements, ...userConfig.integrityRequirements },
      evaluationWeights: { ...defaultConfig.evaluationWeights, ...userConfig.evaluationWeights }
    };
  }
}

/**
 * Academic Standards Middleware for AI SDK
 */
export function createAcademicStandardsMiddleware(
  config: Partial<AcademicStandardsConfig> = {}
): LanguageModelV2Middleware {
  const standardsService = new AcademicStandardsService(config);

  // Helper function to extract text from AI SDK v5 content array
  const extractTextFromContent = (content: any[]): string => {
    return content
      .filter(part => part.type === 'text')
      .map(part => part.text)
      .join('');
  };

  return {
    wrapGenerate: async ({ doGenerate, params }) => {
      const result = await doGenerate();

      // Extract text from AI SDK v5 content structure
      const generatedText = extractTextFromContent(result.content || []);

      if (generatedText) {
        const evaluation = await standardsService.evaluateText(generatedText);

        // If standards are not met, provide feedback
        if (evaluation.status === 'needs_improvement' || evaluation.status === 'unacceptable') {
          const improvementGuidance = formatImprovementGuidance(evaluation);

          // Update content array with feedback
          const feedbackContent: LanguageModelV2Content = {
            type: 'text',
            text: `\n\n<!-- ACADEMIC STANDARDS FEEDBACK -->\n${improvementGuidance}`
          };

          const updatedContent = [...result.content, feedbackContent];

          return {
            ...result,
            content: updatedContent,
            experimental: {
              academicStandardsEvaluation: evaluation
            }
          };
        }

        return {
          ...result,
          experimental: {
            academicStandardsEvaluation: evaluation
          }
        };
      }
      
      return result;
    },

    wrapStream: async ({ doStream, params }) => {
      const { stream, ...rest } = await doStream();
      
      return {
        stream: stream.pipeThrough(createAcademicStandardsValidationTransform(standardsService)),
        ...rest
      };
    }
  };
}

// Helper functions
function formatImprovementGuidance(evaluation: AcademicStandardsResult): string {
  const guidance: string[] = [
    `Overall Score: ${(evaluation.overallScore * 100).toFixed(1)}% (${evaluation.status})`,
    '',
    'Category Scores:',
    `- Writing Quality: ${(evaluation.categoryScores.writingQuality * 100).toFixed(1)}%`,
    `- Citation Accuracy: ${(evaluation.categoryScores.citationAccuracy * 100).toFixed(1)}%`,
    `- Content Coherence: ${(evaluation.categoryScores.contentCoherence * 100).toFixed(1)}%`,
    `- Academic Integrity: ${(evaluation.categoryScores.academicIntegrity * 100).toFixed(1)}%`,
    `- Language Standards: ${(evaluation.categoryScores.languageStandards * 100).toFixed(1)}%`,
    `- Argument Strength: ${(evaluation.categoryScores.argumentStrength * 100).toFixed(1)}%`,
    ''
  ];

  if (evaluation.violations.length > 0) {
    guidance.push('Key Issues:');
    evaluation.violations.slice(0, 3).forEach(violation => {
      guidance.push(`- ${violation.description} (${violation.severity})`);
    });
    guidance.push('');
  }

  if (evaluation.suggestions.length > 0) {
    guidance.push('Improvement Suggestions:');
    evaluation.suggestions.slice(0, 3).forEach(suggestion => {
      guidance.push(`- ${suggestion.description}: ${suggestion.action}`);
    });
  }

  return guidance.join('\n');
}

function createAcademicStandardsValidationTransform(service: AcademicStandardsService) {
  let accumulatedText = '';
  
  return new TransformStream({
    transform(chunk, controller) {
      // Accumulate text for final evaluation
      if (chunk.type === 'text-delta') {
        accumulatedText += chunk.delta;
      }
      
      controller.enqueue(chunk);
    },
    
    async flush(controller) {
      // Evaluate accumulated text at the end
      if (accumulatedText) {
        const evaluation = await service.evaluateText(accumulatedText);
        
        // Stream evaluation results as metadata
        controller.enqueue({
          type: 'metadata',
          data: { academicStandardsEvaluation: evaluation }
        } as any);
      }
    }
  });
}

export default AcademicStandardsService;