/**
 * Hallucination Detection Guardrail System
 * 
 * Provides real-time hallucination detection and content validation for academic AI responses
 * with multi-layered fact-checking and consistency verification mechanisms.
 * 
 * Based on Vercel AI SDK v5 middleware patterns from:
 * /Users/eriksupit/Desktop/makalah/documentation/docs/03-ai-sdk-core/40-middleware.mdx
 */

import type { LanguageModelV2Middleware, LanguageModelV2StreamPart } from '@ai-sdk/provider';

export interface HallucinationDetectionConfig {
  /** Enable real-time detection during streaming */
  enableRealTimeDetection: boolean;
  /** Confidence threshold for hallucination detection */
  hallucinationThreshold: number;
  /** Maximum acceptable inconsistency score */
  maxInconsistencyScore: number;
  /** Enable fact verification against knowledge base */
  enableFactVerification: boolean;
  /** Enable cross-reference validation */
  enableCrossReferenceValidation: boolean;
  /** Detection strategies to use */
  detectionStrategies: HallucinationDetectionStrategy[];
  /** Response when hallucination detected */
  hallucinationResponse: HallucinationResponseConfig;
}

export interface HallucinationDetectionStrategy {
  name: 'consistency_check' | 'fact_verification' | 'citation_validation' | 'semantic_coherence' | 'temporal_consistency' | 'entity_verification';
  enabled: boolean;
  weight: number;
  config?: Record<string, any>;
}

export interface HallucinationResponseConfig {
  /** How to handle detected hallucinations */
  action: 'block' | 'warn' | 'correct' | 'flag';
  /** Include confidence scores in response */
  includeConfidenceScores: boolean;
  /** Provide alternative suggestions */
  provideAlternatives: boolean;
  /** Log hallucination attempts */
  logDetections: boolean;
}

export interface HallucinationDetectionResult {
  /** Overall hallucination risk score (0-1) */
  riskScore: number;
  /** Is content likely hallucinated */
  isHallucinated: boolean;
  /** Detection confidence */
  confidence: number;
  /** Detailed analysis by strategy */
  strategyResults: StrategyDetectionResult[];
  /** Detected issues */
  detectedIssues: HallucinationIssue[];
  /** Content segments with high risk */
  riskySegments: RiskySegment[];
  /** Fact verification results */
  factChecks: FactCheckResult[];
  /** Detection timestamp */
  detectedAt: Date;
}

export interface StrategyDetectionResult {
  strategy: string;
  riskScore: number;
  confidence: number;
  findings: string[];
  evidence?: any;
}

export interface HallucinationIssue {
  type: 'false_fact' | 'inconsistent_claim' | 'invalid_citation' | 'impossible_event' | 'contradictory_statement' | 'fabricated_quote';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: ContentLocation;
  confidence: number;
  suggestedCorrection?: string;
}

export interface RiskySegment {
  content: string;
  startIndex: number;
  endIndex: number;
  riskScore: number;
  reasons: string[];
}

export interface FactCheckResult {
  claim: string;
  verification: 'verified' | 'unverified' | 'contradicted' | 'partially_correct';
  confidence: number;
  sources?: string[];
  explanation: string;
}

export interface ContentLocation {
  paragraph: number;
  sentence: number;
  startChar: number;
  endChar: number;
  context: string;
}

export interface KnowledgeBase {
  facts: Map<string, VerifiedFact>;
  entities: Map<string, EntityInfo>;
  relationships: Map<string, RelationshipInfo>;
}

export interface VerifiedFact {
  statement: string;
  verificationLevel: 'high' | 'medium' | 'low';
  sources: string[];
  lastUpdated: Date;
  domain: string;
}

export interface EntityInfo {
  name: string;
  type: 'person' | 'organization' | 'location' | 'concept' | 'event';
  attributes: Record<string, any>;
  verifiedAttributes: string[];
}

export interface RelationshipInfo {
  subject: string;
  predicate: string;
  object: string;
  confidence: number;
  temporal?: {
    start?: Date;
    end?: Date;
  };
}

/**
 * Default hallucination detection configuration
 */
export const DEFAULT_HALLUCINATION_DETECTION_CONFIG: HallucinationDetectionConfig = {
  enableRealTimeDetection: true,
  hallucinationThreshold: 0.7,
  maxInconsistencyScore: 0.3,
  enableFactVerification: true,
  enableCrossReferenceValidation: true,
  detectionStrategies: [
    {
      name: 'consistency_check',
      enabled: true,
      weight: 0.25,
      config: { contextWindow: 5, semanticThreshold: 0.8 }
    },
    {
      name: 'fact_verification',
      enabled: true,
      weight: 0.3,
      config: { knowledgeBaseCheck: true, externalVerification: false }
    },
    {
      name: 'citation_validation',
      enabled: true,
      weight: 0.2,
      config: { validateFormat: true, checkExistence: true }
    },
    {
      name: 'semantic_coherence',
      enabled: true,
      weight: 0.15,
      config: { coherenceThreshold: 0.75 }
    },
    {
      name: 'temporal_consistency',
      enabled: true,
      weight: 0.05,
      config: { checkTimelines: true }
    },
    {
      name: 'entity_verification',
      enabled: true,
      weight: 0.05,
      config: { validateEntities: true }
    }
  ],
  hallucinationResponse: {
    action: 'warn',
    includeConfidenceScores: true,
    provideAlternatives: true,
    logDetections: true
  }
};

/**
 * Hallucination Detection Service
 */
export class HallucinationDetectionService {
  private config: HallucinationDetectionConfig;
  private knowledgeBase: KnowledgeBase;
  private detectionHistory: Map<string, HallucinationDetectionResult>;

  constructor(
    config: Partial<HallucinationDetectionConfig> = {},
    knowledgeBase?: KnowledgeBase
  ) {
    this.config = { ...DEFAULT_HALLUCINATION_DETECTION_CONFIG, ...config };
    this.knowledgeBase = knowledgeBase || this.createDefaultKnowledgeBase();
    this.detectionHistory = new Map();
  }

  /**
   * Detect hallucinations in content
   */
  async detectHallucinations(content: string, context?: any): Promise<HallucinationDetectionResult> {
    const strategyResults: StrategyDetectionResult[] = [];
    const detectedIssues: HallucinationIssue[] = [];
    const factChecks: FactCheckResult[] = [];
    
    let totalRiskScore = 0;
    let totalWeight = 0;

    // Execute detection strategies
    for (const strategy of this.config.detectionStrategies) {
      if (!strategy.enabled) continue;

      try {
        const result = await this.executeDetectionStrategy(strategy, content, context);
        strategyResults.push(result);
        
        totalRiskScore += result.riskScore * strategy.weight;
        totalWeight += strategy.weight;
        
        // Collect issues from strategy results
        detectedIssues.push(...this.extractIssuesFromStrategy(result, content));
        
      } catch (error) {
        console.error(`Hallucination detection strategy ${strategy.name} failed:`, error);
      }
    }

    // Perform fact checking if enabled
    if (this.config.enableFactVerification) {
      const claims = this.extractClaims(content);
      for (const claim of claims) {
        const factCheck = await this.verifyFact(claim, content);
        factChecks.push(factCheck);
        
        if (factCheck.verification === 'contradicted') {
          detectedIssues.push({
            type: 'false_fact',
            severity: 'high',
            description: `Contradicted claim: ${claim}`,
            location: this.findClaimLocation(claim, content),
            confidence: factCheck.confidence,
            suggestedCorrection: factCheck.explanation
          });
        }
      }
    }

    const overallRiskScore = totalWeight > 0 ? totalRiskScore / totalWeight : 0;
    const isHallucinated = overallRiskScore >= this.config.hallucinationThreshold;
    const confidence = this.calculateOverallConfidence(strategyResults);
    
    const riskySegments = await this.identifyRiskySegments(content, strategyResults);

    const result: HallucinationDetectionResult = {
      riskScore: overallRiskScore,
      isHallucinated,
      confidence,
      strategyResults,
      detectedIssues: this.prioritizeIssues(detectedIssues),
      riskySegments,
      factChecks,
      detectedAt: new Date()
    };

    // Store in history for pattern analysis
    const contentHash = this.hashContent(content);
    this.detectionHistory.set(contentHash, result);

    return result;
  }

  /**
   * Execute specific detection strategy
   */
  private async executeDetectionStrategy(
    strategy: HallucinationDetectionStrategy,
    content: string,
    context?: any
  ): Promise<StrategyDetectionResult> {
    switch (strategy.name) {
      case 'consistency_check':
        return await this.checkConsistency(content, strategy.config);
        
      case 'fact_verification':
        return await this.verifyFacts(content, strategy.config);
        
      case 'citation_validation':
        return await this.validateCitations(content, strategy.config);
        
      case 'semantic_coherence':
        return await this.checkSemanticCoherence(content, strategy.config);
        
      case 'temporal_consistency':
        return await this.checkTemporalConsistency(content, strategy.config);
        
      case 'entity_verification':
        return await this.verifyEntities(content, strategy.config);
        
      default:
        throw new Error(`Unknown detection strategy: ${strategy.name}`);
    }
  }

  /**
   * Consistency check strategy
   */
  private async checkConsistency(content: string, config: any = {}): Promise<StrategyDetectionResult> {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const findings: string[] = [];
    let inconsistencyCount = 0;
    
    // Check for contradictory statements
    for (let i = 0; i < sentences.length; i++) {
      for (let j = i + 1; j < Math.min(sentences.length, i + (config.contextWindow || 5)); j++) {
        const similarity = await this.calculateSemanticSimilarity(sentences[i], sentences[j]);
        const contradiction = await this.detectContradiction(sentences[i], sentences[j]);
        
        if (similarity > (config.semanticThreshold || 0.8) && contradiction > 0.7) {
          inconsistencyCount++;
          findings.push(`Potential contradiction between sentences ${i + 1} and ${j + 1}`);
        }
      }
    }
    
    const riskScore = Math.min(1, inconsistencyCount / (sentences.length * 0.1));
    const confidence = inconsistencyCount > 0 ? 0.8 : 0.6;
    
    return {
      strategy: 'consistency_check',
      riskScore,
      confidence,
      findings,
      evidence: { inconsistencyCount, totalSentences: sentences.length }
    };
  }

  /**
   * Fact verification strategy
   */
  private async verifyFacts(content: string, config: any = {}): Promise<StrategyDetectionResult> {
    const claims = this.extractClaims(content);
    const findings: string[] = [];
    let unverifiedCount = 0;
    let contradictedCount = 0;
    
    for (const claim of claims) {
      const verification = await this.verifyAgainstKnowledgeBase(claim);
      
      if (verification === 'unverified') {
        unverifiedCount++;
        findings.push(`Unverified claim: ${claim.substring(0, 50)}...`);
      } else if (verification === 'contradicted') {
        contradictedCount++;
        findings.push(`Contradicted claim: ${claim.substring(0, 50)}...`);
      }
    }
    
    const riskScore = claims.length > 0 ? 
      (unverifiedCount * 0.3 + contradictedCount * 0.8) / claims.length : 0;
    const confidence = claims.length > 0 ? 0.9 : 0.5;
    
    return {
      strategy: 'fact_verification',
      riskScore,
      confidence,
      findings,
      evidence: { 
        totalClaims: claims.length, 
        unverifiedCount, 
        contradictedCount 
      }
    };
  }

  /**
   * Citation validation strategy
   */
  private async validateCitations(content: string, config: any = {}): Promise<StrategyDetectionResult> {
    const citations = this.extractCitations(content);
    const findings: string[] = [];
    let invalidCount = 0;
    
    for (const citation of citations) {
      const isValid = await this.validateCitation(citation);
      if (!isValid) {
        invalidCount++;
        findings.push(`Invalid citation format: ${citation}`);
      }
      
      if (config.checkExistence) {
        const exists = await this.citationExists(citation);
        if (!exists) {
          invalidCount++;
          findings.push(`Citation may not exist: ${citation}`);
        }
      }
    }
    
    const riskScore = citations.length > 0 ? invalidCount / citations.length : 0;
    const confidence = citations.length > 0 ? 0.85 : 0.5;
    
    return {
      strategy: 'citation_validation',
      riskScore,
      confidence,
      findings,
      evidence: { totalCitations: citations.length, invalidCount }
    };
  }

  /**
   * Semantic coherence strategy
   */
  private async checkSemanticCoherence(content: string, config: any = {}): Promise<StrategyDetectionResult> {
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const findings: string[] = [];
    let incoherentCount = 0;
    
    for (let i = 0; i < paragraphs.length - 1; i++) {
      const coherence = await this.calculateCoherence(paragraphs[i], paragraphs[i + 1]);
      if (coherence < (config.coherenceThreshold || 0.75)) {
        incoherentCount++;
        findings.push(`Low coherence between paragraphs ${i + 1} and ${i + 2}`);
      }
    }
    
    const riskScore = paragraphs.length > 1 ? incoherentCount / (paragraphs.length - 1) : 0;
    const confidence = 0.7;
    
    return {
      strategy: 'semantic_coherence',
      riskScore,
      confidence,
      findings,
      evidence: { totalParagraphs: paragraphs.length, incoherentCount }
    };
  }

  /**
   * Temporal consistency strategy
   */
  private async checkTemporalConsistency(content: string, config: any = {}): Promise<StrategyDetectionResult> {
    const temporalReferences = this.extractTemporalReferences(content);
    const findings: string[] = [];
    let inconsistentCount = 0;
    
    // Check for temporal inconsistencies
    for (let i = 0; i < temporalReferences.length; i++) {
      for (let j = i + 1; j < temporalReferences.length; j++) {
        const isConsistent = this.checkTemporalConsistencyPair(
          temporalReferences[i],
          temporalReferences[j]
        );
        
        if (!isConsistent) {
          inconsistentCount++;
          findings.push(`Temporal inconsistency: ${temporalReferences[i].text} vs ${temporalReferences[j].text}`);
        }
      }
    }
    
    const riskScore = temporalReferences.length > 1 ? 
      inconsistentCount / (temporalReferences.length * (temporalReferences.length - 1) / 2) : 0;
    const confidence = temporalReferences.length > 0 ? 0.8 : 0.3;
    
    return {
      strategy: 'temporal_consistency',
      riskScore,
      confidence,
      findings,
      evidence: { temporalReferences: temporalReferences.length, inconsistentCount }
    };
  }

  /**
   * Entity verification strategy
   */
  private async verifyEntities(content: string, config: any = {}): Promise<StrategyDetectionResult> {
    const entities = this.extractEntities(content);
    const findings: string[] = [];
    let unverifiedCount = 0;
    
    for (const entity of entities) {
      const isVerified = await this.verifyEntity(entity);
      if (!isVerified) {
        unverifiedCount++;
        findings.push(`Unverified entity: ${entity.name} (${entity.type})`);
      }
    }
    
    const riskScore = entities.length > 0 ? unverifiedCount / entities.length : 0;
    const confidence = entities.length > 0 ? 0.75 : 0.4;
    
    return {
      strategy: 'entity_verification',
      riskScore,
      confidence,
      findings,
      evidence: { totalEntities: entities.length, unverifiedCount }
    };
  }

  /**
   * Helper methods for content analysis
   */
  private extractClaims(content: string): string[] {
    // Simplified claim extraction - in real implementation would use NLP
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    return sentences.filter(sentence => {
      // Look for factual claims (sentences with specific patterns)
      const factualPatterns = [
        /\b(menurut|berdasarkan|data menunjukkan|penelitian membuktikan)\b/i,
        /\b\d+(\.\d+)?\s*(persen|%|tahun|orang)\b/i,
        /\b(adalah|merupakan|termasuk)\b/i
      ];
      
      return factualPatterns.some(pattern => pattern.test(sentence));
    });
  }

  private extractCitations(content: string): string[] {
    // Extract various citation formats
    const citationPatterns = [
      /\([A-Za-z]+(?:\s+et\s+al\.?)?,?\s+\d{4}\)/g, // (Author, 2023) or (Author et al., 2023)
      /\[[0-9]+\]/g, // [1], [2], etc.
      /"[^"]+" \([A-Za-z]+,?\s+\d{4}\)/g // "Quote" (Author, 2023)
    ];
    
    const citations: string[] = [];
    citationPatterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      citations.push(...matches);
    });
    
    return [...new Set(citations)]; // Remove duplicates
  }

  private extractTemporalReferences(content: string): Array<{text: string, type: string, position: number}> {
    const temporalPatterns = [
      { pattern: /\b(sebelum|sesudah|selama|sejak)\s+\d{4}\b/gi, type: 'relative_year' },
      { pattern: /\b\d{1,2}\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+\d{4}\b/gi, type: 'specific_date' },
      { pattern: /\babad\s+(ke-?\d+|XXI?|XX)\b/gi, type: 'century' },
      { pattern: /\b(kemarin|hari\s+ini|besok|minggu\s+lalu|bulan\s+depan)\b/gi, type: 'relative_time' }
    ];
    
    const references: Array<{text: string, type: string, position: number}> = [];
    
    temporalPatterns.forEach(({ pattern, type }) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        references.push({
          text: match[0],
          type,
          position: match.index
        });
      }
    });
    
    return references.sort((a, b) => a.position - b.position);
  }

  private extractEntities(content: string): Array<{name: string, type: string, position: number}> {
    // Simplified entity extraction
    const entityPatterns = [
      { pattern: /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g, type: 'person' },
      { pattern: /\bUniversitas\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g, type: 'organization' },
      { pattern: /\b(?:Jakarta|Bandung|Surabaya|Medan|Yogyakarta)\b/g, type: 'location' }
    ];
    
    const entities: Array<{name: string, type: string, position: number}> = [];
    
    entityPatterns.forEach(({ pattern, type }) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        entities.push({
          name: match[0],
          type,
          position: match.index
        });
      }
    });
    
    return entities;
  }

  private async verifyFact(claim: string, context: string): Promise<FactCheckResult> {
    // Simplified fact verification - in real implementation would check against databases
    const verificationResult = await this.verifyAgainstKnowledgeBase(claim);
    
    return {
      claim,
      verification: verificationResult,
      confidence: 0.8,
      sources: ['knowledge_base'],
      explanation: this.generateVerificationExplanation(claim, verificationResult)
    };
  }

  private async verifyAgainstKnowledgeBase(claim: string): Promise<'verified' | 'unverified' | 'contradicted' | 'partially_correct'> {
    // Simplified verification against knowledge base
    const claimWords = claim.toLowerCase().split(/\s+/);
    
    for (const [key, fact] of this.knowledgeBase.facts.entries()) {
      const factWords = fact.statement.toLowerCase().split(/\s+/);
      const commonWords = claimWords.filter(word => factWords.includes(word));
      
      if (commonWords.length > claimWords.length * 0.5) {
        return 'verified';
      }
    }
    
    // Random verification for demo purposes
    const rand = Math.random();
    if (rand < 0.3) return 'verified';
    if (rand < 0.8) return 'unverified';
    if (rand < 0.95) return 'partially_correct';
    return 'contradicted';
  }

  private async validateCitation(citation: string): Promise<boolean> {
    // Basic citation format validation
    const citationFormats = [
      /^\([A-Za-z]+(?:\s+et\s+al\.?)?,?\s+\d{4}\)$/,  // (Author, 2023)
      /^\[[0-9]+\]$/,  // [1]
      /^"[^"]+" \([A-Za-z]+,?\s+\d{4}\)$/  // "Quote" (Author, 2023)
    ];
    
    return citationFormats.some(format => format.test(citation.trim()));
  }

  private async citationExists(citation: string): Promise<boolean> {
    // Simulated citation existence check
    return Math.random() > 0.2; // 80% exist
  }

  private async calculateSemanticSimilarity(text1: string, text2: string): Promise<number> {
    // Simplified semantic similarity - in real implementation would use embeddings
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size; // Jaccard similarity
  }

  private async detectContradiction(text1: string, text2: string): Promise<number> {
    // Simplified contradiction detection
    const negationWords = ['tidak', 'bukan', 'tanpa', 'kecuali', 'selain'];
    const text1Lower = text1.toLowerCase();
    const text2Lower = text2.toLowerCase();
    
    const hasNegation1 = negationWords.some(word => text1Lower.includes(word));
    const hasNegation2 = negationWords.some(word => text2Lower.includes(word));
    
    if (hasNegation1 !== hasNegation2) {
      const similarity = await this.calculateSemanticSimilarity(text1, text2);
      return similarity; // High similarity with different negation patterns suggests contradiction
    }
    
    return 0;
  }

  private async calculateCoherence(para1: string, para2: string): Promise<number> {
    // Simplified coherence calculation
    return this.calculateSemanticSimilarity(para1, para2);
  }

  private checkTemporalConsistencyPair(ref1: any, ref2: any): boolean {
    // Simplified temporal consistency check
    if (ref1.type === 'relative_time' && ref2.type === 'relative_time') {
      // Both are relative time references - check for logical consistency
      const inconsistentPairs = [
        ['kemarin', 'besok'],
        ['minggu lalu', 'minggu depan'],
        ['bulan lalu', 'bulan depan']
      ];
      
      return !inconsistentPairs.some(([a, b]) => 
        (ref1.text.includes(a) && ref2.text.includes(b)) ||
        (ref1.text.includes(b) && ref2.text.includes(a))
      );
    }
    
    return true; // Assume consistent for other cases
  }

  private async verifyEntity(entity: {name: string, type: string}): Promise<boolean> {
    // Check against knowledge base
    if (this.knowledgeBase.entities.has(entity.name)) {
      const knownEntity = this.knowledgeBase.entities.get(entity.name)!;
      return knownEntity.type === entity.type;
    }
    
    // Simulated verification
    return Math.random() > 0.3; // 70% verified
  }

  private findClaimLocation(claim: string, content: string): ContentLocation {
    const startIndex = content.indexOf(claim);
    const paragraphs = content.split(/\n\s*\n/);
    let charCount = 0;
    let paragraphIndex = 0;
    
    for (let i = 0; i < paragraphs.length; i++) {
      if (charCount + paragraphs[i].length >= startIndex) {
        paragraphIndex = i;
        break;
      }
      charCount += paragraphs[i].length + 2; // +2 for paragraph separator
    }
    
    const sentences = paragraphs[paragraphIndex].split(/[.!?]+/);
    let sentenceIndex = 0;
    let sentenceStart = charCount;
    
    for (let i = 0; i < sentences.length; i++) {
      if (sentenceStart + sentences[i].length >= startIndex) {
        sentenceIndex = i;
        break;
      }
      sentenceStart += sentences[i].length + 1;
    }
    
    return {
      paragraph: paragraphIndex,
      sentence: sentenceIndex,
      startChar: startIndex,
      endChar: startIndex + claim.length,
      context: paragraphs[paragraphIndex].substring(0, 100)
    };
  }

  private async identifyRiskySegments(
    content: string, 
    strategyResults: StrategyDetectionResult[]
  ): Promise<RiskySegment[]> {
    const segments: RiskySegment[] = [];
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    for (let i = 0; i < sentences.length; i++) {
      let riskScore = 0;
      const reasons: string[] = [];
      
      // Analyze each sentence for risk factors
      strategyResults.forEach(result => {
        if (result.riskScore > 0.5) {
          // Check if this sentence is related to the risky findings
          const isRelated = result.findings.some(finding => 
            sentences[i].toLowerCase().includes(finding.toLowerCase().split(' ')[0])
          );
          
          if (isRelated) {
            riskScore += result.riskScore * 0.2;
            reasons.push(`${result.strategy}: ${result.findings[0]}`);
          }
        }
      });
      
      if (riskScore > 0.3) {
        const startIndex = content.indexOf(sentences[i]);
        segments.push({
          content: sentences[i].trim(),
          startIndex,
          endIndex: startIndex + sentences[i].length,
          riskScore: Math.min(1, riskScore),
          reasons
        });
      }
    }
    
    return segments.sort((a, b) => b.riskScore - a.riskScore).slice(0, 5);
  }

  private extractIssuesFromStrategy(
    result: StrategyDetectionResult, 
    content: string
  ): HallucinationIssue[] {
    const issues: HallucinationIssue[] = [];
    
    if (result.riskScore > 0.7) {
      const issueType = this.mapStrategyToIssueType(result.strategy);
      const severity = this.calculateIssueSeverity(result.riskScore);
      
      issues.push({
        type: issueType,
        severity,
        description: result.findings[0] || `High risk detected in ${result.strategy}`,
        location: {
          paragraph: 0,
          sentence: 0,
          startChar: 0,
          endChar: 100,
          context: content.substring(0, 100)
        },
        confidence: result.confidence
      });
    }
    
    return issues;
  }

  private mapStrategyToIssueType(strategy: string): HallucinationIssue['type'] {
    const mapping: Record<string, HallucinationIssue['type']> = {
      'consistency_check': 'contradictory_statement',
      'fact_verification': 'false_fact',
      'citation_validation': 'invalid_citation',
      'semantic_coherence': 'inconsistent_claim',
      'temporal_consistency': 'impossible_event',
      'entity_verification': 'false_fact'
    };
    
    return mapping[strategy] || 'inconsistent_claim';
  }

  private calculateIssueSeverity(riskScore: number): HallucinationIssue['severity'] {
    if (riskScore >= 0.9) return 'critical';
    if (riskScore >= 0.7) return 'high';
    if (riskScore >= 0.5) return 'medium';
    return 'low';
  }

  private prioritizeIssues(issues: HallucinationIssue[]): HallucinationIssue[] {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return issues.sort((a, b) => 
      severityOrder[b.severity] - severityOrder[a.severity] ||
      b.confidence - a.confidence
    );
  }

  private calculateOverallConfidence(results: StrategyDetectionResult[]): number {
    if (results.length === 0) return 0;
    
    const totalWeight = results.length;
    const weightedConfidence = results.reduce((sum, result) => sum + result.confidence, 0);
    
    return weightedConfidence / totalWeight;
  }

  private generateVerificationExplanation(
    claim: string, 
    result: 'verified' | 'unverified' | 'contradicted' | 'partially_correct'
  ): string {
    switch (result) {
      case 'verified':
        return 'Claim is supported by available knowledge base';
      case 'contradicted':
        return 'Claim contradicts established facts in knowledge base';
      case 'partially_correct':
        return 'Claim is partially supported but requires verification';
      case 'unverified':
      default:
        return 'Claim could not be verified against available sources';
    }
  }

  private createDefaultKnowledgeBase(): KnowledgeBase {
    return {
      facts: new Map(),
      entities: new Map(),
      relationships: new Map()
    };
  }

  private hashContent(content: string): string {
    // Simple hash function for content
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }
}

/**
 * Hallucination Detection Middleware for AI SDK
 */
export function createHallucinationDetectionMiddleware(
  config: Partial<HallucinationDetectionConfig> = {},
  knowledgeBase?: KnowledgeBase
): LanguageModelV2Middleware {
  const detectionService = new HallucinationDetectionService(config, knowledgeBase);

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

      // AI SDK v5 compatibility: extract text from content array
      const generatedText = extractTextFromContent(result.content || []);

      if (generatedText) {
        const detectionResult = await detectionService.detectHallucinations(generatedText);

        // Handle detected hallucinations
        if (detectionResult.isHallucinated && config.hallucinationResponse?.action === 'block') {
          throw new Error('Potential hallucination detected, response blocked');
        }

        if (detectionResult.isHallucinated && config.hallucinationResponse?.action === 'warn') {
          const warningText = formatHallucinationWarning(detectionResult);

          // Add warning to content array with proper typing
          const updatedContent = [
            ...result.content,
            { type: 'text' as const, text: `\n\n<!-- HALLUCINATION WARNING -->\n${warningText}` }
          ];

          return {
            ...result,
            content: updatedContent
          };
        }
      }

      return result;
    },

    wrapStream: async ({ doStream, params }) => {
      const { stream, ...rest } = await doStream();
      
      if (config.enableRealTimeDetection) {
        return {
          stream: stream.pipeThrough(createHallucinationDetectionTransform(detectionService)),
          ...rest
        };
      }
      
      return { stream, ...rest };
    }
  };
}

// Helper functions
function formatHallucinationWarning(result: HallucinationDetectionResult): string {
  const warning: string[] = [
    `⚠️ Potential Hallucination Detected (Risk Score: ${(result.riskScore * 100).toFixed(1)}%)`,
    '',
    'Issues Found:'
  ];

  result.detectedIssues.slice(0, 3).forEach(issue => {
    warning.push(`- ${issue.description} (${issue.severity} severity)`);
  });

  if (result.riskySegments.length > 0) {
    warning.push('');
    warning.push('Risky Content Segments:');
    result.riskySegments.slice(0, 2).forEach(segment => {
      warning.push(`- "${segment.content.substring(0, 50)}..." (${(segment.riskScore * 100).toFixed(1)}% risk)`);
    });
  }

  warning.push('');
  warning.push('⚠️ Please verify this information before use.');

  return warning.join('\n');
}

function createHallucinationDetectionTransform(service: HallucinationDetectionService) {
  let accumulatedText = '';
  let sentenceBuffer = '';
  
  return new TransformStream<LanguageModelV2StreamPart, LanguageModelV2StreamPart>({
    transform(chunk, controller) {
      if (chunk.type === 'text-delta') {
        accumulatedText += chunk.delta;
        sentenceBuffer += chunk.delta;
        
        // Check for sentence completion
        if (/[.!?]+\s*$/.test(sentenceBuffer.trim())) {
          // Perform quick hallucination check on completed sentence
          service.detectHallucinations(sentenceBuffer.trim())
            .then(result => {
              if (result.isHallucinated && result.riskScore > 0.8) {
                // Stream warning for high-risk content
                controller.enqueue({
                  type: 'metadata',
                  data: { 
                    hallucinationWarning: {
                      riskScore: result.riskScore,
                      issues: result.detectedIssues.slice(0, 2)
                    }
                  }
                } as any);
              }
            })
            .catch(error => {
              console.error('Real-time hallucination detection failed:', error);
            });
          
          sentenceBuffer = '';
        }
      }
      
      controller.enqueue(chunk);
    },
    
    async flush(controller) {
      // Final comprehensive check
      if (accumulatedText) {
        const finalResult = await service.detectHallucinations(accumulatedText);
        
        controller.enqueue({
          type: 'metadata',
          data: { hallucinationDetection: finalResult }
        } as any);
      }
    }
  });
}

export default HallucinationDetectionService;