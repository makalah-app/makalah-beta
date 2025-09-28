/**
 * AI Response Quality Analysis and Improvement Recommendation System
 * 
 * Provides comprehensive analysis of AI-generated responses with quality metrics,
 * improvement suggestions, and automated feedback mechanisms for academic content.
 * 
 * Based on Vercel AI SDK v5 patterns from:
 * /Users/eriksupit/Desktop/makalah/documentation/docs/03-ai-sdk-core/40-middleware.mdx
 */

import type { LanguageModelV2Middleware } from '@ai-sdk/provider';

export interface ResponseAnalysisConfig {
  /** Enable real-time response analysis */
  enableRealTimeAnalysis: boolean;
  /** Analysis dimensions to evaluate */
  analysisDimensions: AnalysisDimension[];
  /** Quality thresholds for automatic actions */
  qualityThresholds: ResponseQualityThresholds;
  /** Improvement suggestion configuration */
  improvementConfig: ImprovementConfig;
  /** Academic evaluation criteria */
  academicCriteria: AcademicEvaluationCriteria;
}

export interface AnalysisDimension {
  name: 'content_quality' | 'academic_rigor' | 'language_proficiency' | 'structure_coherence' | 'citation_accuracy' | 'originality' | 'relevance';
  enabled: boolean;
  weight: number;
  config?: Record<string, any>;
}

export interface ResponseQualityThresholds {
  /** Minimum acceptable quality score */
  minQualityScore: number;
  /** Minimum academic rigor score */
  minAcademicRigor: number;
  /** Minimum language proficiency score */
  minLanguageProficiency: number;
  /** Minimum coherence score */
  minCoherence: number;
  /** Maximum acceptable error rate */
  maxErrorRate: number;
  /** Action to take when below threshold */
  belowThresholdAction: 'reject' | 'flag' | 'suggest_improvements' | 'auto_improve';
}

export interface ImprovementConfig {
  /** Enable automatic improvement suggestions */
  enableAutoSuggestions: boolean;
  /** Maximum number of suggestions per response */
  maxSuggestions: number;
  /** Suggestion priority levels */
  suggestionPriorities: string[];
  /** Include specific examples in suggestions */
  includeExamples: boolean;
  /** Enable learning from feedback */
  enableLearning: boolean;
}

export interface AcademicEvaluationCriteria {
  /** Required academic writing style */
  writingStyle: 'formal' | 'semi-formal' | 'conversational';
  /** Expected citation format */
  citationFormat: 'APA' | 'MLA' | 'Chicago' | 'IEEE' | 'Harvard';
  /** Minimum evidence requirements */
  minEvidenceLevel: number;
  /** Required argument structure */
  argumentStructure: 'thesis-antithesis-synthesis' | 'claim-evidence-warrant' | 'problem-solution' | 'comparative';
  /** Language proficiency level */
  languageLevel: 'basic' | 'intermediate' | 'advanced' | 'expert';
}

export interface ResponseAnalysisResult {
  /** Overall quality assessment */
  overallAssessment: OverallAssessment;
  /** Detailed dimension scores */
  dimensionScores: DimensionScoreMap;
  /** Identified strengths */
  strengths: QualityStrength[];
  /** Identified weaknesses */
  weaknesses: QualityWeakness[];
  /** Improvement suggestions */
  improvements: ImprovementSuggestion[];
  /** Academic compliance status */
  academicCompliance: AcademicComplianceResult;
  /** Response metadata */
  metadata: ResponseMetadata;
  /** Analysis timestamp */
  analyzedAt: Date;
}

export interface OverallAssessment {
  /** Overall quality score (0-1) */
  qualityScore: number;
  /** Quality grade */
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  /** Quality level description */
  level: 'excellent' | 'good' | 'satisfactory' | 'needs_improvement' | 'poor';
  /** Key assessment summary */
  summary: string;
  /** Pass/fail status */
  passed: boolean;
}

export interface DimensionScoreMap {
  contentQuality: DimensionScore;
  academicRigor: DimensionScore;
  languageProficiency: DimensionScore;
  structureCoherence: DimensionScore;
  citationAccuracy: DimensionScore;
  originality: DimensionScore;
  relevance: DimensionScore;
}

export interface DimensionScore {
  score: number;
  weight: number;
  analysis: string;
  evidence: string[];
  recommendations: string[];
}

export interface QualityStrength {
  dimension: string;
  description: string;
  evidence: string;
  impact: 'high' | 'medium' | 'low';
}

export interface QualityWeakness {
  dimension: string;
  description: string;
  evidence: string;
  severity: 'critical' | 'major' | 'minor';
  suggestedFix: string;
}

export interface ImprovementSuggestion {
  category: 'structure' | 'content' | 'language' | 'citations' | 'argumentation' | 'clarity';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionSteps: string[];
  expectedImpact: string;
  difficulty: 'easy' | 'moderate' | 'challenging';
  examples?: ImprovementExample[];
}

export interface ImprovementExample {
  type: 'before_after' | 'good_example' | 'common_mistake';
  title: string;
  before?: string;
  after?: string;
  explanation: string;
}

export interface AcademicComplianceResult {
  /** Overall compliance status */
  isCompliant: boolean;
  /** Compliance score (0-1) */
  complianceScore: number;
  /** Specific compliance checks */
  complianceChecks: ComplianceCheck[];
  /** Non-compliant areas */
  violations: ComplianceViolation[];
}

export interface ComplianceCheck {
  criterion: string;
  passed: boolean;
  score: number;
  feedback: string;
}

export interface ComplianceViolation {
  type: 'style' | 'citation' | 'structure' | 'language' | 'evidence';
  severity: 'high' | 'medium' | 'low';
  description: string;
  location?: TextLocation;
  correction: string;
}

export interface ResponseMetadata {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  averageSentenceLength: number;
  readabilityScore: number;
  lexicalDiversity: number;
  citationCount: number;
  processingTime: number;
}

export interface TextLocation {
  start: number;
  end: number;
  paragraph: number;
  sentence: number;
  context: string;
}

export interface AnalysisHistory {
  responseId: string;
  analysis: ResponseAnalysisResult;
  feedback?: UserFeedback;
  improvements?: string[];
}

export interface UserFeedback {
  rating: number;
  helpful: boolean;
  comments?: string;
  suggestedImprovements?: string[];
}

/**
 * Default response analysis configuration
 */
export const DEFAULT_RESPONSE_ANALYSIS_CONFIG: ResponseAnalysisConfig = {
  enableRealTimeAnalysis: true,
  analysisDimensions: [
    {
      name: 'content_quality',
      enabled: true,
      weight: 0.25,
      config: { checkAccuracy: true, checkCompleteness: true }
    },
    {
      name: 'academic_rigor',
      enabled: true,
      weight: 0.20,
      config: { checkEvidence: true, checkReasoning: true }
    },
    {
      name: 'language_proficiency',
      enabled: true,
      weight: 0.15,
      config: { checkGrammar: true, checkVocabulary: true }
    },
    {
      name: 'structure_coherence',
      enabled: true,
      weight: 0.15,
      config: { checkFlow: true, checkTransitions: true }
    },
    {
      name: 'citation_accuracy',
      enabled: true,
      weight: 0.10,
      config: { checkFormat: true, checkRelevance: true }
    },
    {
      name: 'originality',
      enabled: true,
      weight: 0.10,
      config: { checkPlagiarism: true, checkNovelty: true }
    },
    {
      name: 'relevance',
      enabled: true,
      weight: 0.05,
      config: { checkTopicAlignment: true }
    }
  ],
  qualityThresholds: {
    minQualityScore: 0.7,
    minAcademicRigor: 0.6,
    minLanguageProficiency: 0.8,
    minCoherence: 0.7,
    maxErrorRate: 0.05,
    belowThresholdAction: 'suggest_improvements'
  },
  improvementConfig: {
    enableAutoSuggestions: true,
    maxSuggestions: 5,
    suggestionPriorities: ['high', 'medium', 'low'],
    includeExamples: true,
    enableLearning: true
  },
  academicCriteria: {
    writingStyle: 'formal',
    citationFormat: 'APA',
    minEvidenceLevel: 0.7,
    argumentStructure: 'claim-evidence-warrant',
    languageLevel: 'advanced'
  }
};

/**
 * Response Analysis and Quality Assessment Service
 */
export class ResponseAnalyzerService {
  private config: ResponseAnalysisConfig;
  private analysisHistory: Map<string, AnalysisHistory>;
  private learningData: Map<string, number>;

  constructor(config: Partial<ResponseAnalysisConfig> = {}) {
    this.config = { ...DEFAULT_RESPONSE_ANALYSIS_CONFIG, ...config };
    this.analysisHistory = new Map();
    this.learningData = new Map();
  }

  /**
   * Analyze response quality and generate improvement suggestions
   */
  async analyzeResponse(
    responseText: string,
    context?: {
      prompt?: string;
      expectedOutput?: string;
      academicPhase?: string;
      userId?: string;
    }
  ): Promise<ResponseAnalysisResult> {
    const startTime = Date.now();
    
    // Analyze each dimension
    const dimensionScores = await this.analyzeDimensions(responseText, context);
    
    // Calculate overall assessment
    const overallAssessment = this.calculateOverallAssessment(dimensionScores);
    
    // Identify strengths and weaknesses
    const strengths = this.identifyStrengths(dimensionScores);
    const weaknesses = this.identifyWeaknesses(dimensionScores);
    
    // Generate improvement suggestions
    const improvements = await this.generateImprovements(dimensionScores, weaknesses, responseText);
    
    // Check academic compliance
    const academicCompliance = await this.checkAcademicCompliance(responseText);
    
    // Calculate response metadata
    const metadata = this.calculateMetadata(responseText, Date.now() - startTime);

    const result: ResponseAnalysisResult = {
      overallAssessment,
      dimensionScores,
      strengths,
      weaknesses,
      improvements,
      academicCompliance,
      metadata,
      analyzedAt: new Date()
    };

    // Store analysis for learning
    const responseId = this.generateResponseId(responseText);
    this.analysisHistory.set(responseId, {
      responseId,
      analysis: result
    });

    return result;
  }

  /**
   * Analyze specific dimensions of response quality
   */
  private async analyzeDimensions(
    responseText: string,
    context?: any
  ): Promise<DimensionScoreMap> {
    const scores: Partial<DimensionScoreMap> = {};

    for (const dimension of this.config.analysisDimensions) {
      if (!dimension.enabled) continue;

      switch (dimension.name) {
        case 'content_quality':
          scores.contentQuality = await this.analyzeContentQuality(responseText, dimension.config);
          break;
          
        case 'academic_rigor':
          scores.academicRigor = await this.analyzeAcademicRigor(responseText, dimension.config);
          break;
          
        case 'language_proficiency':
          scores.languageProficiency = await this.analyzeLanguageProficiency(responseText, dimension.config);
          break;
          
        case 'structure_coherence':
          scores.structureCoherence = await this.analyzeStructureCoherence(responseText, dimension.config);
          break;
          
        case 'citation_accuracy':
          scores.citationAccuracy = await this.analyzeCitationAccuracy(responseText, dimension.config);
          break;
          
        case 'originality':
          scores.originality = await this.analyzeOriginality(responseText, dimension.config);
          break;
          
        case 'relevance':
          scores.relevance = await this.analyzeRelevance(responseText, context, dimension.config);
          break;
      }
    }

    return scores as DimensionScoreMap;
  }

  /**
   * Content Quality Analysis
   */
  private async analyzeContentQuality(responseText: string, config: any = {}): Promise<DimensionScore> {
    const evidence: string[] = [];
    let score = 0.5; // Base score

    // Check information accuracy (simplified)
    const hasFactualContent = /\b(data|statistik|penelitian|studi|analisis)\b/i.test(responseText);
    if (hasFactualContent) {
      score += 0.2;
      evidence.push('Contains factual information and data references');
    }

    // Check completeness
    const hasIntroduction = /\b(pendahuluan|latar belakang|pengantar)\b/i.test(responseText);
    const hasConclusion = /\b(kesimpulan|ringkasan|penutup)\b/i.test(responseText);
    
    if (hasIntroduction && hasConclusion) {
      score += 0.2;
      evidence.push('Has proper introduction and conclusion structure');
    }

    // Check depth of analysis
    const analysisWords = ['menganalisis', 'membahas', 'mengevaluasi', 'mengkaji', 'menelaah'];
    const analysisCount = analysisWords.filter(word => responseText.toLowerCase().includes(word)).length;
    
    if (analysisCount >= 2) {
      score += 0.1;
      evidence.push('Demonstrates analytical depth with multiple analysis approaches');
    }

    return {
      score: Math.min(1, score),
      weight: 0.25,
      analysis: 'Content quality assessed based on factual accuracy, completeness, and analytical depth',
      evidence,
      recommendations: score < 0.7 ? [
        'Include more factual data and references',
        'Ensure complete coverage of the topic',
        'Add deeper analytical insights'
      ] : []
    };
  }

  /**
   * Academic Rigor Analysis
   */
  private async analyzeAcademicRigor(responseText: string, config: any = {}): Promise<DimensionScore> {
    const evidence: string[] = [];
    let score = 0.4;

    // Check for evidence-based arguments
    const evidenceWords = ['berdasarkan', 'menurut', 'data menunjukkan', 'hasil penelitian'];
    const evidenceCount = evidenceWords.filter(word => responseText.toLowerCase().includes(word)).length;
    
    if (evidenceCount >= 2) {
      score += 0.3;
      evidence.push(`Contains ${evidenceCount} evidence-based statements`);
    }

    // Check for critical thinking indicators
    const criticalWords = ['namun', 'akan tetapi', 'di sisi lain', 'sebaliknya', 'meskipun'];
    const criticalCount = criticalWords.filter(word => responseText.toLowerCase().includes(word)).length;
    
    if (criticalCount >= 1) {
      score += 0.2;
      evidence.push('Shows critical thinking with counter-arguments or alternative perspectives');
    }

    // Check for academic vocabulary
    const academicWords = ['paradigma', 'metodologi', 'signifikan', 'komprehensif', 'substansial'];
    const academicCount = academicWords.filter(word => responseText.toLowerCase().includes(word)).length;
    
    if (academicCount >= 2) {
      score += 0.1;
      evidence.push('Uses appropriate academic vocabulary');
    }

    return {
      score: Math.min(1, score),
      weight: 0.20,
      analysis: 'Academic rigor evaluated based on evidence use, critical thinking, and scholarly vocabulary',
      evidence,
      recommendations: score < 0.6 ? [
        'Support arguments with more academic evidence',
        'Include critical analysis and counter-arguments',
        'Use more sophisticated academic vocabulary'
      ] : []
    };
  }

  /**
   * Language Proficiency Analysis
   */
  private async analyzeLanguageProficiency(responseText: string, config: any = {}): Promise<DimensionScore> {
    const evidence: string[] = [];
    let score = 0.6;

    // Check grammar (simplified)
    const hasGrammarErrors = this.detectGrammarIssues(responseText);
    if (!hasGrammarErrors) {
      score += 0.2;
      evidence.push('No apparent grammar errors detected');
    }

    // Check vocabulary diversity
    const words = responseText.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    const diversityRatio = uniqueWords.size / words.length;
    
    if (diversityRatio > 0.6) {
      score += 0.15;
      evidence.push(`Good vocabulary diversity (${(diversityRatio * 100).toFixed(1)}%)`);
    }

    // Check sentence complexity
    const sentences = responseText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = words.length / sentences.length;
    
    if (avgSentenceLength > 15 && avgSentenceLength < 30) {
      score += 0.05;
      evidence.push('Appropriate sentence complexity');
    }

    return {
      score: Math.min(1, score),
      weight: 0.15,
      analysis: 'Language proficiency assessed through grammar, vocabulary diversity, and sentence structure',
      evidence,
      recommendations: score < 0.8 ? [
        'Review grammar and correct any errors',
        'Use more diverse vocabulary',
        'Vary sentence length and structure'
      ] : []
    };
  }

  /**
   * Structure and Coherence Analysis
   */
  private async analyzeStructureCoherence(responseText: string, config: any = {}): Promise<DimensionScore> {
    const evidence: string[] = [];
    let score = 0.5;

    // Check paragraph structure
    const paragraphs = responseText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    if (paragraphs.length >= 3) {
      score += 0.2;
      evidence.push(`Well-structured with ${paragraphs.length} paragraphs`);
    }

    // Check transition words
    const transitionWords = ['selanjutnya', 'kemudian', 'oleh karena itu', 'dengan demikian', 'selain itu'];
    const transitionCount = transitionWords.filter(word => responseText.toLowerCase().includes(word)).length;
    
    if (transitionCount >= 2) {
      score += 0.2;
      evidence.push('Good use of transition words for coherence');
    }

    // Check logical flow
    const hasLogicalMarkers = /\b(pertama|kedua|ketiga|akhirnya|kesimpulannya)\b/i.test(responseText);
    if (hasLogicalMarkers) {
      score += 0.1;
      evidence.push('Demonstrates logical sequencing');
    }

    return {
      score: Math.min(1, score),
      weight: 0.15,
      analysis: 'Structure and coherence evaluated based on organization, transitions, and logical flow',
      evidence,
      recommendations: score < 0.7 ? [
        'Improve paragraph organization',
        'Add more transition words between ideas',
        'Ensure logical progression of arguments'
      ] : []
    };
  }

  /**
   * Citation Accuracy Analysis
   */
  private async analyzeCitationAccuracy(responseText: string, config: any = {}): Promise<DimensionScore> {
    const evidence: string[] = [];
    let score = 0.5;

    // Check for citations
    const citations = this.extractCitations(responseText);
    if (citations.length > 0) {
      score += 0.3;
      evidence.push(`Contains ${citations.length} citations`);
      
      // Check citation format
      const formatCompliance = this.checkCitationFormat(citations);
      score += formatCompliance * 0.2;
      
      if (formatCompliance > 0.8) {
        evidence.push('Citations follow proper format');
      }
    } else {
      evidence.push('No citations found - consider adding references');
    }

    return {
      score: Math.min(1, score),
      weight: 0.10,
      analysis: 'Citation accuracy based on presence and proper formatting of references',
      evidence,
      recommendations: score < 0.7 ? [
        'Add relevant citations to support arguments',
        'Ensure citations follow required format',
        'Verify citation accuracy and relevance'
      ] : []
    };
  }

  /**
   * Originality Analysis
   */
  private async analyzeOriginality(responseText: string, config: any = {}): Promise<DimensionScore> {
    const evidence: string[] = [];
    let score = 0.7; // Assume original unless detected otherwise

    // Check for unique insights
    const insightWords = ['pendapat', 'pandangan', 'perspektif', 'interpretasi', 'analisis penulis'];
    const insightCount = insightWords.filter(word => responseText.toLowerCase().includes(word)).length;
    
    if (insightCount >= 1) {
      score += 0.2;
      evidence.push('Contains original insights and perspectives');
    }

    // Simplified plagiarism check
    const commonPhrases = this.detectCommonPhrases(responseText);
    if (commonPhrases.length > 0) {
      score -= 0.1 * commonPhrases.length;
      evidence.push(`Detected ${commonPhrases.length} common phrases that may need revision`);
    }

    return {
      score: Math.max(0, Math.min(1, score)),
      weight: 0.10,
      analysis: 'Originality assessed based on unique insights and absence of common phrases',
      evidence,
      recommendations: score < 0.7 ? [
        'Add more original analysis and interpretation',
        'Avoid overuse of common academic phrases',
        'Develop unique perspectives on the topic'
      ] : []
    };
  }

  /**
   * Relevance Analysis
   */
  private async analyzeRelevance(responseText: string, context: any = {}, config: any = {}): Promise<DimensionScore> {
    const evidence: string[] = [];
    let score = 0.8; // Assume relevant unless context suggests otherwise

    // If prompt context is available, check alignment
    if (context?.prompt) {
      const promptKeywords = this.extractKeywords(context.prompt);
      const responseKeywords = this.extractKeywords(responseText);
      
      const overlap = promptKeywords.filter(keyword => 
        responseKeywords.includes(keyword)
      ).length;
      
      const relevanceRatio = overlap / Math.max(promptKeywords.length, 1);
      score = Math.max(0.5, relevanceRatio);
      
      evidence.push(`${overlap}/${promptKeywords.length} key topics addressed`);
    }

    return {
      score: Math.min(1, score),
      weight: 0.05,
      analysis: 'Relevance assessed based on alignment with prompt requirements and topic focus',
      evidence,
      recommendations: score < 0.7 ? [
        'Better address the specific questions asked',
        'Stay focused on the main topic',
        'Include all required elements from the prompt'
      ] : []
    };
  }

  /**
   * Calculate overall assessment from dimension scores
   */
  private calculateOverallAssessment(dimensionScores: DimensionScoreMap): OverallAssessment {
    const dimensions = Object.values(dimensionScores);
    const weightedScore = dimensions.reduce((sum, dim) => sum + (dim.score * dim.weight), 0);
    const totalWeight = dimensions.reduce((sum, dim) => sum + dim.weight, 0);
    const qualityScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

    // Determine grade and level
    let grade: OverallAssessment['grade'];
    let level: OverallAssessment['level'];
    
    if (qualityScore >= 0.9) {
      grade = 'A';
      level = 'excellent';
    } else if (qualityScore >= 0.8) {
      grade = 'B';
      level = 'good';
    } else if (qualityScore >= 0.7) {
      grade = 'C';
      level = 'satisfactory';
    } else if (qualityScore >= 0.6) {
      grade = 'D';
      level = 'needs_improvement';
    } else {
      grade = 'F';
      level = 'poor';
    }

    const passed = qualityScore >= this.config.qualityThresholds.minQualityScore;

    return {
      qualityScore,
      grade,
      level,
      summary: this.generateAssessmentSummary(qualityScore, level, dimensions),
      passed
    };
  }

  /**
   * Identify response strengths
   */
  private identifyStrengths(dimensionScores: DimensionScoreMap): QualityStrength[] {
    const strengths: QualityStrength[] = [];
    
    Object.entries(dimensionScores).forEach(([dimension, score]) => {
      if (score.score >= 0.8) {
        strengths.push({
          dimension,
          description: this.getStrengthDescription(dimension, score.score),
          evidence: score.evidence.join(', '),
          impact: score.score >= 0.9 ? 'high' : 'medium'
        });
      }
    });

    return strengths.sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 };
      return impactOrder[b.impact] - impactOrder[a.impact];
    });
  }

  /**
   * Identify response weaknesses
   */
  private identifyWeaknesses(dimensionScores: DimensionScoreMap): QualityWeakness[] {
    const weaknesses: QualityWeakness[] = [];
    
    Object.entries(dimensionScores).forEach(([dimension, score]) => {
      if (score.score < 0.7) {
        let severity: QualityWeakness['severity'];
        if (score.score < 0.4) severity = 'critical';
        else if (score.score < 0.6) severity = 'major';
        else severity = 'minor';
        
        weaknesses.push({
          dimension,
          description: this.getWeaknessDescription(dimension, score.score),
          evidence: score.evidence.join(', '),
          severity,
          suggestedFix: score.recommendations[0] || 'Review and improve this aspect'
        });
      }
    });

    return weaknesses.sort((a, b) => {
      const severityOrder = { critical: 3, major: 2, minor: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Generate improvement suggestions
   */
  private async generateImprovements(
    dimensionScores: DimensionScoreMap,
    weaknesses: QualityWeakness[],
    responseText: string
  ): Promise<ImprovementSuggestion[]> {
    const improvements: ImprovementSuggestion[] = [];

    // Generate suggestions based on weaknesses
    for (const weakness of weaknesses.slice(0, this.config.improvementConfig.maxSuggestions)) {
      const suggestion = await this.createImprovementSuggestion(weakness, responseText);
      improvements.push(suggestion);
    }

    // Add general improvements even for good responses
    if (improvements.length < this.config.improvementConfig.maxSuggestions) {
      const generalSuggestions = this.generateGeneralImprovements(dimensionScores, responseText);
      improvements.push(...generalSuggestions.slice(0, this.config.improvementConfig.maxSuggestions - improvements.length));
    }

    return improvements.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Create improvement suggestion from weakness
   */
  private async createImprovementSuggestion(
    weakness: QualityWeakness,
    responseText: string
  ): Promise<ImprovementSuggestion> {
    const category = this.mapDimensionToCategory(weakness.dimension);
    const priority = weakness.severity === 'critical' ? 'high' : 
                    weakness.severity === 'major' ? 'medium' : 'low';

    let actionSteps: string[] = [];
    let examples: ImprovementExample[] = [];

    switch (weakness.dimension) {
      case 'contentQuality':
        actionSteps = [
          'Review factual accuracy of all statements',
          'Add supporting data and evidence',
          'Ensure complete coverage of topic',
          'Increase analytical depth'
        ];
        break;
        
      case 'academicRigor':
        actionSteps = [
          'Include more academic references',
          'Add critical analysis and evaluation',
          'Consider alternative perspectives',
          'Strengthen argumentation with evidence'
        ];
        break;
        
      case 'languageProficiency':
        actionSteps = [
          'Proofread for grammar and spelling',
          'Use more varied vocabulary',
          'Improve sentence structure',
          'Ensure clarity and precision'
        ];
        break;
    }

    if (this.config.improvementConfig.includeExamples) {
      examples = this.generateImprovementExamples(weakness.dimension);
    }

    return {
      category,
      priority,
      title: this.getImprovementTitle(weakness.dimension),
      description: weakness.description,
      actionSteps,
      expectedImpact: this.calculateExpectedImpact(weakness),
      difficulty: this.assessImprovementDifficulty(weakness.dimension),
      examples
    };
  }

  /**
   * Check academic compliance
   */
  private async checkAcademicCompliance(responseText: string): Promise<AcademicComplianceResult> {
    const complianceChecks: ComplianceCheck[] = [];
    const violations: ComplianceViolation[] = [];

    // Writing style check
    const styleCheck = this.checkWritingStyle(responseText);
    complianceChecks.push({
      criterion: 'Writing Style',
      passed: styleCheck.score >= 0.7,
      score: styleCheck.score,
      feedback: styleCheck.feedback
    });

    if (styleCheck.score < 0.7) {
      violations.push({
        type: 'style',
        severity: 'medium',
        description: 'Writing style does not meet academic standards',
        correction: 'Use more formal academic language and structure'
      });
    }

    // Citation format check
    const citationCheck = this.checkCitationCompliance(responseText);
    complianceChecks.push({
      criterion: 'Citation Format',
      passed: citationCheck.score >= 0.8,
      score: citationCheck.score,
      feedback: citationCheck.feedback
    });

    const overallScore = complianceChecks.reduce((sum, check) => sum + check.score, 0) / complianceChecks.length;
    const isCompliant = overallScore >= 0.75 && violations.length === 0;

    return {
      isCompliant,
      complianceScore: overallScore,
      complianceChecks,
      violations
    };
  }

  /**
   * Calculate response metadata
   */
  private calculateMetadata(responseText: string, processingTime: number): ResponseMetadata {
    const words = responseText.split(/\s+/).filter(word => word.length > 0);
    const sentences = responseText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = responseText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const citations = this.extractCitations(responseText);
    
    const uniqueWords = new Set(words.map(word => word.toLowerCase()));
    const lexicalDiversity = uniqueWords.size / words.length;

    return {
      wordCount: words.length,
      sentenceCount: sentences.length,
      paragraphCount: paragraphs.length,
      averageSentenceLength: words.length / sentences.length,
      readabilityScore: this.calculateReadabilityScore(responseText),
      lexicalDiversity,
      citationCount: citations.length,
      processingTime
    };
  }

  /**
   * Helper methods
   */
  private detectGrammarIssues(text: string): boolean {
    // Simplified grammar checking - would use proper NLP in real implementation
    const commonErrors = [
      /\bdi\s+[A-Z]/g, // "di Jakarta" should be "di jakarta"
      /\bke\s+[A-Z]/g, // Similar pattern
      /\btidak\s+bisa\s+di/g, // Common Indonesian grammar error
    ];
    
    return commonErrors.some(pattern => pattern.test(text));
  }

  private extractCitations(text: string): string[] {
    const citationPatterns = [
      /\([A-Za-z]+(?:\s+et\s+al\.?)?,?\s+\d{4}\)/g,
      /\[[0-9]+\]/g,
      /"[^"]+" \([A-Za-z]+,?\s+\d{4}\)/g
    ];
    
    const citations: string[] = [];
    citationPatterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      citations.push(...matches);
    });
    
    return [...new Set(citations)];
  }

  private checkCitationFormat(citations: string[]): number {
    let correctFormat = 0;
    
    citations.forEach(citation => {
      // Check APA format (simplified)
      if (/\([A-Za-z]+,?\s+\d{4}\)/.test(citation)) {
        correctFormat++;
      }
    });
    
    return citations.length > 0 ? correctFormat / citations.length : 1;
  }

  private extractKeywords(text: string): string[] {
    // Simplified keyword extraction
    const words = text.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word));
    
    return [...new Set(words)];
  }

  private isStopWord(word: string): boolean {
    const stopWords = ['yang', 'adalah', 'dengan', 'untuk', 'dari', 'dalam', 'pada', 'akan', 'dapat', 'atau'];
    return stopWords.includes(word);
  }

  private detectCommonPhrases(text: string): string[] {
    const commonPhrases = [
      'dapat disimpulkan bahwa',
      'berdasarkan hasil penelitian',
      'dalam konteks ini',
      'hal ini menunjukkan bahwa'
    ];
    
    return commonPhrases.filter(phrase => text.toLowerCase().includes(phrase));
  }

  private calculateReadabilityScore(text: string): number {
    // Simplified readability calculation
    const words = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).length;
    const avgWordsPerSentence = words / sentences;
    
    // Flesch-like formula adapted for Indonesian
    return Math.max(0, Math.min(100, 100 - (avgWordsPerSentence - 15) * 2));
  }

  private generateResponseId(text: string): string {
    // Simple hash for response ID
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  }

  private generateAssessmentSummary(score: number, level: string, dimensions: DimensionScore[]): string {
    const strongAreas = dimensions.filter(d => d.score >= 0.8).length;
    const weakAreas = dimensions.filter(d => d.score < 0.6).length;
    
    return `Response shows ${level} quality (${(score * 100).toFixed(1)}%) with ${strongAreas} strong areas and ${weakAreas} areas needing improvement.`;
  }

  private getStrengthDescription(dimension: string, score: number): string {
    const descriptions: Record<string, string> = {
      contentQuality: `Excellent content quality with comprehensive coverage and accuracy (${(score * 100).toFixed(1)}%)`,
      academicRigor: `Strong academic rigor with solid evidence and reasoning (${(score * 100).toFixed(1)}%)`,
      languageProficiency: `High language proficiency with clear and precise expression (${(score * 100).toFixed(1)}%)`,
      structureCoherence: `Well-structured and coherent presentation (${(score * 100).toFixed(1)}%)`,
      citationAccuracy: `Proper citation format and usage (${(score * 100).toFixed(1)}%)`,
      originality: `Good originality with unique insights (${(score * 100).toFixed(1)}%)`,
      relevance: `Highly relevant to the topic (${(score * 100).toFixed(1)}%)`
    };
    
    return descriptions[dimension] || `Strong performance in ${dimension}`;
  }

  private getWeaknessDescription(dimension: string, score: number): string {
    const descriptions: Record<string, string> = {
      contentQuality: `Content quality needs improvement (${(score * 100).toFixed(1)}%)`,
      academicRigor: `Academic rigor requires strengthening (${(score * 100).toFixed(1)}%)`,
      languageProficiency: `Language proficiency could be enhanced (${(score * 100).toFixed(1)}%)`,
      structureCoherence: `Structure and coherence need work (${(score * 100).toFixed(1)}%)`,
      citationAccuracy: `Citation accuracy requires attention (${(score * 100).toFixed(1)}%)`,
      originality: `Originality could be improved (${(score * 100).toFixed(1)}%)`,
      relevance: `Relevance to topic needs improvement (${(score * 100).toFixed(1)}%)`
    };
    
    return descriptions[dimension] || `Weakness identified in ${dimension}`;
  }

  private mapDimensionToCategory(dimension: string): ImprovementSuggestion['category'] {
    const mapping: Record<string, ImprovementSuggestion['category']> = {
      contentQuality: 'content',
      academicRigor: 'argumentation',
      languageProficiency: 'language',
      structureCoherence: 'structure',
      citationAccuracy: 'citations',
      originality: 'content',
      relevance: 'clarity'
    };
    
    return mapping[dimension] || 'content';
  }

  private getImprovementTitle(dimension: string): string {
    const titles: Record<string, string> = {
      contentQuality: 'Enhance Content Quality',
      academicRigor: 'Strengthen Academic Rigor',
      languageProficiency: 'Improve Language Proficiency',
      structureCoherence: 'Better Structure and Coherence',
      citationAccuracy: 'Correct Citation Issues',
      originality: 'Increase Originality',
      relevance: 'Improve Relevance'
    };
    
    return titles[dimension] || 'General Improvement';
  }

  private calculateExpectedImpact(weakness: QualityWeakness): string {
    const impact: Record<QualityWeakness['severity'], string> = {
      critical: 'High impact - significant quality improvement expected',
      major: 'Medium impact - noticeable quality enhancement',
      minor: 'Low impact - minor but valuable improvement'
    };
    
    return impact[weakness.severity];
  }

  private assessImprovementDifficulty(dimension: string): ImprovementSuggestion['difficulty'] {
    const difficulty: Record<string, ImprovementSuggestion['difficulty']> = {
      contentQuality: 'challenging',
      academicRigor: 'challenging',
      languageProficiency: 'moderate',
      structureCoherence: 'moderate',
      citationAccuracy: 'easy',
      originality: 'challenging',
      relevance: 'moderate'
    };
    
    return difficulty[dimension] || 'moderate';
  }

  private generateImprovementExamples(dimension: string): ImprovementExample[] {
    // Return example improvements based on dimension
    const examples: Record<string, ImprovementExample[]> = {
      languageProficiency: [
        {
          type: 'before_after',
          title: 'Sentence Structure Improvement',
          before: 'Hal ini yang membuat penelitian ini penting.',
          after: 'Hal inilah yang menjadikan penelitian ini penting.',
          explanation: 'Improved grammar and word choice for clarity'
        }
      ],
      structureCoherence: [
        {
          type: 'good_example',
          title: 'Good Transition Example',
          after: 'Oleh karena itu, dapat disimpulkan bahwa...',
          explanation: 'Effective transition connecting ideas logically'
        }
      ]
    };
    
    return examples[dimension] || [];
  }

  private generateGeneralImprovements(
    dimensionScores: DimensionScoreMap,
    responseText: string
  ): ImprovementSuggestion[] {
    const suggestions: ImprovementSuggestion[] = [];
    
    // Add general suggestions for enhancement
    if (responseText.length < 500) {
      suggestions.push({
        category: 'content',
        priority: 'medium',
        title: 'Expand Content Depth',
        description: 'Response could benefit from more detailed analysis',
        actionSteps: [
          'Add more supporting details',
          'Include additional examples',
          'Expand on key points'
        ],
        expectedImpact: 'Better coverage and depth of analysis',
        difficulty: 'moderate'
      });
    }
    
    return suggestions;
  }

  private checkWritingStyle(text: string): { score: number; feedback: string } {
    let score = 0.7;
    const feedback: string[] = [];
    
    // Check for formal language
    const informalWords = ['banget', 'gimana', 'kayak', 'udah'];
    const hasInformal = informalWords.some(word => text.toLowerCase().includes(word));
    
    if (hasInformal) {
      score -= 0.2;
      feedback.push('Avoid informal language');
    } else {
      feedback.push('Appropriate formal language use');
    }
    
    return {
      score: Math.max(0, score),
      feedback: feedback.join('; ')
    };
  }

  private checkCitationCompliance(text: string): { score: number; feedback: string } {
    const citations = this.extractCitations(text);
    const formatScore = this.checkCitationFormat(citations);
    
    return {
      score: formatScore,
      feedback: formatScore > 0.8 ? 'Citations properly formatted' : 'Citation format needs improvement'
    };
  }
}

/**
 * Response Analysis Middleware for AI SDK
 */
export function createResponseAnalysisMiddleware(
  config: Partial<ResponseAnalysisConfig> = {}
): LanguageModelV2Middleware {
  const analyzer = new ResponseAnalyzerService(config);

  return {
    wrapGenerate: async ({ doGenerate, params }) => {
      const result = await doGenerate();
      
      // Extract text from AI SDK v5 content array
      const resultText = (result as any).content?.find((c: any) => c.type === 'text')?.text || '';

      if (resultText && config.enableRealTimeAnalysis) {
        const analysis = await analyzer.analyzeResponse(resultText, {
          prompt: (params as any).prompt
        });

        // Handle quality thresholds
        if (!analysis.overallAssessment.passed) {
          const action = config.qualityThresholds?.belowThresholdAction;
          
          if (action === 'reject') {
            throw new Error('Response quality below acceptable threshold');
          } else if (action === 'suggest_improvements') {
            const suggestions = analysis.improvements
              .slice(0, 3)
              .map(s => `- ${s.title}: ${s.description}`)
              .join('\n');
            
            return {
              ...result,
              text: resultText + `\n\n<!-- QUALITY IMPROVEMENT SUGGESTIONS -->\n${suggestions}`,
              experimental: {
                ...(result as any).experimental,
                responseAnalysis: analysis
              }
            } as any;
          }
        }

        return {
          ...result,
          experimental: {
            ...(result as any).experimental,
            responseAnalysis: analysis
          }
        } as any;
      }
      
      return result;
    }
  };
}

export default ResponseAnalyzerService;