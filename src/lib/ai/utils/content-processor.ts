/**
 * Academic Content Processing Utilities
 *
 * Comprehensive content processing utilities for academic documents,
 * including text analysis, structure extraction, citation processing,
 * and content transformation for AI workflows.
 *
 * Features:
 * - Academic text analysis and metrics
 * - Document structure extraction
 * - Citation detection and validation
 * - Content chunking for AI processing
 * - Format standardization
 *
 * ENHANCEMENT: Now uses dynamic maxTokens from admin panel for compression and chunking
 * instead of hardcoded values
 *
 * @module ContentProcessor
 * @version 1.0.0
 */

import { AcademicPhase } from '../types';
import { BibliographyEntry, DocumentSection, ContentMetadata, SectionType } from '../config/system-types';
import { getDynamicModelConfig } from '../dynamic-config';

/**
 * Content analysis result
 */
export interface ContentAnalysis {
  metrics: ContentMetrics;
  structure: StructureAnalysis;
  citations: CitationAnalysis;
  quality: QualityAnalysis;
  readability: ReadabilityAnalysis;
  recommendations: ContentRecommendation[];
}

/**
 * Content metrics
 */
export interface ContentMetrics {
  wordCount: number;
  characterCount: number;
  paragraphCount: number;
  sentenceCount: number;
  averageWordsPerSentence: number;
  averageSentencesPerParagraph: number;
  uniqueWords: number;
  vocabularyRichness: number;
  formalityScore: number;
  complexityScore: number;
}

/**
 * Structure analysis
 */
export interface StructureAnalysis {
  hasTitle: boolean;
  hasAbstract: boolean;
  hasIntroduction: boolean;
  hasConclusion: boolean;
  hasReferences: boolean;
  sectionCount: number;
  headingLevels: number[];
  structureScore: number;
  missingElements: string[];
  organizationScore: number;
}

/**
 * Citation analysis
 */
export interface CitationAnalysis {
  totalCitations: number;
  inTextCitations: number;
  referenceCitations: number;
  citationDensity: number;
  citationStyles: string[];
  consistencyScore: number;
  issues: CitationIssue[];
  recommendations: string[];
}

/**
 * Citation issue
 */
export interface CitationIssue {
  type: 'missing-reference' | 'format-error' | 'inconsistent-style' | 'invalid-citation';
  location: number;
  text: string;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
}

/**
 * Quality analysis
 */
export interface QualityAnalysis {
  overallScore: number;
  coherenceScore: number;
  clarityScore: number;
  academicTone: number;
  evidenceSupport: number;
  argumentStrength: number;
  issues: QualityIssue[];
  strengths: string[];
  improvements: string[];
}

/**
 * Quality issue
 */
export interface QualityIssue {
  category: 'coherence' | 'clarity' | 'tone' | 'evidence' | 'structure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: {
    paragraph: number;
    sentence: number;
  };
  suggestion: string;
}

/**
 * Readability analysis
 */
export interface ReadabilityAnalysis {
  fleschScore: number;
  fleschKincaidGrade: number;
  colemanLiauIndex: number;
  automatedReadabilityIndex: number;
  averageReadabilityGrade: number;
  readabilityLevel: 'elementary' | 'middle-school' | 'high-school' | 'college' | 'graduate';
  recommendations: string[];
}

/**
 * Content recommendation
 */
export interface ContentRecommendation {
  category: 'structure' | 'style' | 'content' | 'citations' | 'readability';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  actionItems: string[];
  expectedImpact: 'minor' | 'moderate' | 'significant' | 'major';
}

/**
 * Content chunk for AI processing
 */
export interface ContentChunk {
  id: string;
  content: string;
  type: ChunkType;
  metadata: ChunkMetadata;
  context: ChunkContext;
  tokenCount: number;
  priority: number;
}

/**
 * Chunk types
 */
export type ChunkType = 
  | 'paragraph'
  | 'section'
  | 'citation'
  | 'header'
  | 'abstract'
  | 'conclusion'
  | 'reference';

/**
 * Chunk metadata
 */
export interface ChunkMetadata {
  originalPosition: number;
  sectionTitle?: string;
  sectionType?: SectionType;
  wordCount: number;
  citationCount: number;
  keyTerms: string[];
  complexity: number;
  importance: number;
}

/**
 * Chunk context
 */
export interface ChunkContext {
  precedingChunks: string[];
  followingChunks: string[];
  relatedChunks: string[];
  documentContext: {
    phase: AcademicPhase;
    discipline: string;
    language: 'id' | 'en';
    academicLevel: string;
  };
}

/**
 * Content processing options
 */
export interface ProcessingOptions {
  analysis: {
    enableMetrics: boolean;
    enableStructure: boolean;
    enableCitations: boolean;
    enableQuality: boolean;
    enableReadability: boolean;
  };
  chunking: {
    strategy: 'paragraph' | 'semantic' | 'fixed-size' | 'sentence';
    maxTokens: number;
    overlap: number;
    preserveStructure: boolean;
  };
  normalization: {
    removeExtraWhitespace: boolean;
    standardizeQuotes: boolean;
    fixCommonTypos: boolean;
    normalizeUnicode: boolean;
  };
  extraction: {
    extractCitations: boolean;
    extractKeyTerms: boolean;
    extractHeadings: boolean;
    extractAbstract: boolean;
  };
}

/**
 * Academic Content Processor Service
 * 
 * Main service for processing academic content with comprehensive analysis
 */
export class ContentProcessorService {
  private indonesianStopWords!: Set<string>;
  private englishStopWords!: Set<string>;
  private academicTerms!: Set<string>;
  private citationPatterns!: RegExp[];

  constructor() {
    this.initializeStopWords();
    this.initializeAcademicTerms();
    this.initializeCitationPatterns();
  }

  /**
   * Process content with comprehensive analysis
   */
  async processContent(
    content: string,
    options?: ProcessingOptions
  ): Promise<ContentAnalysis> {
    const resolvedOptions = options || await this.getDefaultOptions();
    // Normalize content first
    const normalizedContent = this.normalizeContent(content, resolvedOptions.normalization);

    const analysis: ContentAnalysis = {
      metrics: resolvedOptions.analysis.enableMetrics ?
        this.analyzeMetrics(normalizedContent) : this.getEmptyMetrics(),
      structure: resolvedOptions.analysis.enableStructure ?
        this.analyzeStructure(normalizedContent) : this.getEmptyStructure(),
      citations: resolvedOptions.analysis.enableCitations ?
        this.analyzeCitations(normalizedContent) : this.getEmptyCitations(),
      quality: resolvedOptions.analysis.enableQuality ?
        this.analyzeQuality(normalizedContent) : this.getEmptyQuality(),
      readability: resolvedOptions.analysis.enableReadability ?
        this.analyzeReadability(normalizedContent) : this.getEmptyReadability(),
      recommendations: []
    };

    // Generate recommendations based on analysis
    analysis.recommendations = this.generateRecommendations(analysis);

    return analysis;
  }

  /**
   * Chunk content for AI processing
   */
  chunkContent(
    content: string,
    options: ProcessingOptions['chunking'],
    context: Partial<ChunkContext['documentContext']> = {}
  ): ContentChunk[] {
    const chunks: ContentChunk[] = [];
    
    switch (options.strategy) {
      case 'paragraph':
        return this.chunkByParagraph(content, options, context);
      case 'semantic':
        return this.chunkBySemantic(content, options, context);
      case 'fixed-size':
        return this.chunkByFixedSize(content, options, context);
      case 'sentence':
        return this.chunkBySentence(content, options, context);
      default:
        return this.chunkByParagraph(content, options, context);
    }
  }

  /**
   * Extract document sections
   */
  extractSections(content: string): DocumentSection[] {
    const sections: DocumentSection[] = [];
    const lines = content.split('\n');
    let currentSection: Partial<DocumentSection> | null = null;
    let sectionContent = '';
    let order = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if line is a heading
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/) || 
                          this.isHeading(line);
      
      if (headingMatch || this.isImplicitSectionBreak(line)) {
        // Save previous section
        if (currentSection && sectionContent.trim()) {
          sections.push({
            ...currentSection,
            content: sectionContent.trim(),
            order: order++,
            metadata: {
              wordCount: this.countWords(sectionContent),
              citationCount: this.countCitations(sectionContent),
              lastModified: new Date(),
              phase: this.inferPhaseFromContent(sectionContent),
              persona: 'academic-writer',
              aiGenerated: false,
              humanEdited: true
            }
          } as DocumentSection);
        }

        // Start new section
        if (headingMatch) {
          currentSection = {
            id: this.generateSectionId(),
            title: Array.isArray(headingMatch) ? headingMatch[2] || line : line,
            type: this.inferSectionType(line),
          };
          sectionContent = '';
        }
      } else {
        sectionContent += line + '\n';
      }
    }

    // Handle last section
    if (currentSection && sectionContent.trim()) {
      sections.push({
        ...currentSection,
        content: sectionContent.trim(),
        order: order++,
        metadata: {
          wordCount: this.countWords(sectionContent),
          citationCount: this.countCitations(sectionContent),
          lastModified: new Date(),
          phase: this.inferPhaseFromContent(sectionContent),
          persona: 'academic-writer',
          aiGenerated: false,
          humanEdited: true
        }
      } as DocumentSection);
    }

    return sections;
  }

  /**
   * Extract citations from content
   */
  extractCitations(content: string): BibliographyEntry[] {
    const citations: BibliographyEntry[] = [];
    
    for (const pattern of this.citationPatterns) {
      const matches = Array.from(content.matchAll(pattern));

      for (const match of matches) {
        const citation = this.parseCitationMatch(match);
        if (citation) {
          citations.push(citation);
        }
      }
    }

    return this.deduplicateCitations(citations);
  }

  /**
   * Calculate content metadata
   */
  calculateMetadata(content: string, language: 'id' | 'en' = 'id'): ContentMetadata {
    const sections = this.extractSections(content);
    const citations = this.extractCitations(content);
    const analysis = this.analyzeReadability(content);

    return {
      wordCount: this.countWords(content),
      pageCount: Math.ceil(this.countWords(content) / 250), // Approximate
      citationCount: citations.length,
      language,
      readabilityScore: analysis.fleschScore,
      academicLevel: this.inferAcademicLevel(content),
      discipline: this.inferDiscipline(content),
      keywords: this.extractKeywords(content, language)
    };
  }

  /**
   * Normalize content for processing
   */
  private normalizeContent(content: string, options: ProcessingOptions['normalization']): string {
    let normalized = content;

    if (options.removeExtraWhitespace) {
      normalized = normalized.replace(/\s+/g, ' ').trim();
    }

    if (options.standardizeQuotes) {
      normalized = normalized
        .replace(/[""]/g, '"')
        .replace(/['']/g, "'");
    }

    if (options.fixCommonTypos) {
      normalized = this.fixCommonTypos(normalized);
    }

    if (options.normalizeUnicode) {
      normalized = normalized.normalize('NFC');
    }

    return normalized;
  }

  /**
   * Analyze content metrics
   */
  private analyzeMetrics(content: string): ContentMetrics {
    const words = this.getWords(content);
    const sentences = this.getSentences(content);
    const paragraphs = this.getParagraphs(content);
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));

    return {
      wordCount: words.length,
      characterCount: content.length,
      paragraphCount: paragraphs.length,
      sentenceCount: sentences.length,
      averageWordsPerSentence: words.length / sentences.length || 0,
      averageSentencesPerParagraph: sentences.length / paragraphs.length || 0,
      uniqueWords: uniqueWords.size,
      vocabularyRichness: uniqueWords.size / words.length || 0,
      formalityScore: this.calculateFormalityScore(content),
      complexityScore: this.calculateComplexityScore(content)
    };
  }

  /**
   * Analyze document structure
   */
  private analyzeStructure(content: string): StructureAnalysis {
    const hasTitle = this.hasTitle(content);
    const hasAbstract = this.hasAbstract(content);
    const hasIntroduction = this.hasIntroduction(content);
    const hasConclusion = this.hasConclusion(content);
    const hasReferences = this.hasReferences(content);
    
    const headings = this.extractHeadings(content);
    const sectionCount = headings.length;
    const headingLevels = headings.map(h => this.getHeadingLevel(h.text));

    const missingElements = [];
    if (!hasTitle) missingElements.push('title');
    if (!hasAbstract) missingElements.push('abstract');
    if (!hasIntroduction) missingElements.push('introduction');
    if (!hasConclusion) missingElements.push('conclusion');
    if (!hasReferences) missingElements.push('references');

    const structureScore = this.calculateStructureScore(
      hasTitle, hasAbstract, hasIntroduction, hasConclusion, hasReferences, sectionCount
    );
    const organizationScore = this.calculateOrganizationScore(headingLevels);

    return {
      hasTitle,
      hasAbstract,
      hasIntroduction,
      hasConclusion,
      hasReferences,
      sectionCount,
      headingLevels,
      structureScore,
      missingElements,
      organizationScore
    };
  }

  /**
   * Analyze citations
   */
  private analyzeCitations(content: string): CitationAnalysis {
    const inTextCitations = this.countInTextCitations(content);
    const referenceCitations = this.countReferenceCitations(content);
    const totalCitations = inTextCitations + referenceCitations;
    const wordCount = this.countWords(content);
    const citationDensity = totalCitations / wordCount * 1000; // Citations per 1000 words

    const citationStyles = this.detectCitationStyles(content);
    const consistencyScore = this.calculateCitationConsistency(content);
    const issues = this.detectCitationIssues(content);
    const recommendations = this.generateCitationRecommendations(issues, citationDensity);

    return {
      totalCitations,
      inTextCitations,
      referenceCitations,
      citationDensity,
      citationStyles,
      consistencyScore,
      issues,
      recommendations
    };
  }

  /**
   * Analyze content quality
   */
  private analyzeQuality(content: string): QualityAnalysis {
    const coherenceScore = this.calculateCoherenceScore(content);
    const clarityScore = this.calculateClarityScore(content);
    const academicTone = this.calculateAcademicTone(content);
    const evidenceSupport = this.calculateEvidenceSupport(content);
    const argumentStrength = this.calculateArgumentStrength(content);

    const overallScore = (coherenceScore + clarityScore + academicTone + evidenceSupport + argumentStrength) / 5;

    const issues = this.identifyQualityIssues(content, {
      coherenceScore,
      clarityScore,
      academicTone,
      evidenceSupport,
      argumentStrength
    });

    const strengths = this.identifyStrengths(content, {
      coherenceScore,
      clarityScore,
      academicTone,
      evidenceSupport,
      argumentStrength
    });

    const improvements = this.suggestImprovements(issues);

    return {
      overallScore,
      coherenceScore,
      clarityScore,
      academicTone,
      evidenceSupport,
      argumentStrength,
      issues,
      strengths,
      improvements
    };
  }

  /**
   * Analyze readability
   */
  private analyzeReadability(content: string): ReadabilityAnalysis {
    const sentences = this.getSentences(content);
    const words = this.getWords(content);
    const syllables = this.countSyllables(content);

    // Flesch Reading Ease Score
    const fleschScore = 206.835 - (1.015 * (words.length / sentences.length)) - 
                       (84.6 * (syllables / words.length));

    // Flesch-Kincaid Grade Level
    const fleschKincaidGrade = (0.39 * (words.length / sentences.length)) + 
                              (11.8 * (syllables / words.length)) - 15.59;

    // Coleman-Liau Index (simplified)
    const avgWordsPerSentence = words.length / sentences.length;
    const avgSentencesPer100Words = (sentences.length / words.length) * 100;
    const colemanLiauIndex = (0.0588 * avgSentencesPer100Words) - 
                            (0.296 * avgWordsPerSentence) - 15.8;

    // Automated Readability Index
    const characters = content.replace(/\s/g, '').length;
    const automatedReadabilityIndex = (4.71 * (characters / words.length)) + 
                                     (0.5 * (words.length / sentences.length)) - 21.43;

    const averageReadabilityGrade = (fleschKincaidGrade + colemanLiauIndex + automatedReadabilityIndex) / 3;

    const readabilityLevel = this.determineReadabilityLevel(averageReadabilityGrade);
    const recommendations = this.generateReadabilityRecommendations(fleschScore, readabilityLevel);

    return {
      fleschScore,
      fleschKincaidGrade,
      colemanLiauIndex,
      automatedReadabilityIndex,
      averageReadabilityGrade,
      readabilityLevel,
      recommendations
    };
  }

  /**
   * Chunk content by paragraph
   */
  private chunkByParagraph(
    content: string,
    options: ProcessingOptions['chunking'],
    context: Partial<ChunkContext['documentContext']>
  ): ContentChunk[] {
    const paragraphs = this.getParagraphs(content);
    const chunks: ContentChunk[] = [];
    let position = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      const tokenCount = this.estimateTokenCount(paragraph);

      if (tokenCount <= options.maxTokens) {
        chunks.push({
          id: `chunk-${i}`,
          content: paragraph,
          type: 'paragraph',
          metadata: {
            originalPosition: position,
            wordCount: this.countWords(paragraph),
            citationCount: this.countCitations(paragraph),
            keyTerms: this.extractKeyTerms(paragraph),
            complexity: this.calculateComplexityScore(paragraph),
            importance: this.calculateImportanceScore(paragraph, content)
          },
          context: {
            precedingChunks: chunks.slice(Math.max(0, i - 2), i).map(c => c.id),
            followingChunks: [], // Will be filled later
            relatedChunks: [],
            documentContext: {
              phase: 'content_drafting',
              discipline: 'general',
              language: 'id',
              academicLevel: 'graduate',
              ...context
            }
          },
          tokenCount,
          priority: this.calculateChunkPriority(paragraph, i, paragraphs.length)
        });
      } else {
        // Split large paragraphs into smaller chunks
        const sentences = this.getSentences(paragraph);
        let currentChunk = '';
        let currentTokenCount = 0;

        for (const sentence of sentences) {
          const sentenceTokens = this.estimateTokenCount(sentence);
          
          if (currentTokenCount + sentenceTokens <= options.maxTokens) {
            currentChunk += sentence + ' ';
            currentTokenCount += sentenceTokens;
          } else {
            // Save current chunk and start new one
            if (currentChunk) {
              chunks.push(this.createChunk(currentChunk.trim(), i, position, context));
              currentChunk = sentence + ' ';
              currentTokenCount = sentenceTokens;
            }
          }
        }

        // Save final chunk
        if (currentChunk) {
          chunks.push(this.createChunk(currentChunk.trim(), i, position, context));
        }
      }

      position += paragraph.length;
    }

    // Fill in following chunks
    for (let i = 0; i < chunks.length; i++) {
      chunks[i].context.followingChunks = chunks.slice(i + 1, Math.min(chunks.length, i + 3)).map(c => c.id);
    }

    return chunks;
  }

  /**
   * Generate content recommendations
   */
  private generateRecommendations(analysis: ContentAnalysis): ContentRecommendation[] {
    const recommendations: ContentRecommendation[] = [];

    // Structure recommendations
    if (analysis.structure.structureScore < 0.7) {
      recommendations.push({
        category: 'structure',
        priority: 'high',
        title: 'Improve Document Structure',
        description: 'Your document is missing key structural elements',
        actionItems: analysis.structure.missingElements.map(e => `Add ${e} section`),
        expectedImpact: 'significant'
      });
    }

    // Citation recommendations
    if (analysis.citations.citationDensity < 5) {
      recommendations.push({
        category: 'citations',
        priority: 'medium',
        title: 'Increase Citation Density',
        description: 'Consider adding more citations to support your arguments',
        actionItems: ['Add more scholarly references', 'Include recent sources', 'Cite primary sources'],
        expectedImpact: 'moderate'
      });
    }

    // Quality recommendations
    if (analysis.quality.overallScore < 0.6) {
      recommendations.push({
        category: 'content',
        priority: 'high',
        title: 'Improve Content Quality',
        description: 'Several aspects of content quality need attention',
        actionItems: analysis.quality.improvements,
        expectedImpact: 'major'
      });
    }

    // Readability recommendations
    if (analysis.readability.fleschScore < 30) {
      recommendations.push({
        category: 'readability',
        priority: 'medium',
        title: 'Improve Readability',
        description: 'The text is quite difficult to read',
        actionItems: analysis.readability.recommendations,
        expectedImpact: 'moderate'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Helper methods for analysis
   */
  protected getWords(content: string): string[] {
    return content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  protected getSentences(content: string): string[] {
    return content.split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  protected getParagraphs(content: string): string[] {
    return content.split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }

  private countWords(content: string): number {
    return this.getWords(content).length;
  }

  private countCitations(content: string): number {
    const citationPattern = /\([^)]*\d{4}[^)]*\)|[\[\{][^}\]]*\d{4}[^}\]]*[\]\}]/g;
    const matches = content.match(citationPattern);
    return matches ? matches.length : 0;
  }

  protected estimateTokenCount(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for most languages
    return Math.ceil(text.length / 4);
  }

  private calculateComplexityScore(content: string): number {
    const words = this.getWords(content);
    const sentences = this.getSentences(content);
    const avgWordsPerSentence = words.length / sentences.length || 0;
    const longWords = words.filter(word => word.length > 6).length;
    const longWordRatio = longWords / words.length || 0;
    
    return Math.min(1, (avgWordsPerSentence / 20 + longWordRatio) / 2);
  }

  private calculateImportanceScore(chunk: string, fullContent: string): number {
    // Simple heuristic based on position and keyword frequency
    const position = fullContent.indexOf(chunk) / fullContent.length;
    const positionScore = position < 0.1 || position > 0.9 ? 0.8 : 0.5; // Intro and conclusion are important
    
    const keywordCount = this.academicTerms.size > 0 ? 
      this.getWords(chunk).filter(word => this.academicTerms.has(word)).length : 0;
    const keywordScore = Math.min(1, keywordCount / 5);
    
    return (positionScore + keywordScore) / 2;
  }

  private calculateChunkPriority(paragraph: string, index: number, total: number): number {
    const positionWeight = index === 0 || index === total - 1 ? 2 : 1; // First and last paragraphs
    const lengthWeight = paragraph.length > 500 ? 1.5 : 1;
    const citationWeight = this.countCitations(paragraph) > 0 ? 1.3 : 1;
    
    return positionWeight * lengthWeight * citationWeight;
  }

  private createChunk(
    content: string, 
    index: number, 
    position: number, 
    context: Partial<ChunkContext['documentContext']>
  ): ContentChunk {
    return {
      id: `chunk-${index}-${Date.now()}`,
      content,
      type: 'paragraph',
      metadata: {
        originalPosition: position,
        wordCount: this.countWords(content),
        citationCount: this.countCitations(content),
        keyTerms: this.extractKeyTerms(content),
        complexity: this.calculateComplexityScore(content),
        importance: 0.5 // Default importance
      },
      context: {
        precedingChunks: [],
        followingChunks: [],
        relatedChunks: [],
        documentContext: {
          phase: 'content_drafting',
          discipline: 'general',
          language: 'id',
          academicLevel: 'graduate',
          ...context
        }
      },
      tokenCount: this.estimateTokenCount(content),
      priority: 1
    };
  }

  /**
   * P0.2 INTEGRATION: Create phase snapshot from artifact
   */
  async createPhaseSnapshot(
    artifactContent: string,
    phase: number,
    options: Partial<SnapshotDistillationOptions> = {}
  ): Promise<DistillationResult> {
    // Stub implementation - to be overridden in extended class
    throw new Error('createPhaseSnapshot must be implemented in extended class');
  }

  /**
   * P0.2 VALIDATION: Validate snapshot meets requirements
   */
  validateSnapshot(snapshot: PhaseSnapshot, options: SnapshotDistillationOptions): {
    valid: boolean;
    issues: string[];
    tokenCount: number;
  } {
    const issues: string[] = [];
    const tokenCount = this.calculateSnapshotTokensStub(snapshot);

    if (tokenCount > options.maxTokens) {
      issues.push(`Exceeds maximum tokens: ${tokenCount}/${options.maxTokens}`);
    }

    if (tokenCount < options.targetTokens * 0.5) {
      issues.push(`Below minimum recommended tokens: ${tokenCount}/${Math.floor(options.targetTokens * 0.5)}`);
    }

    if (!snapshot.summary || snapshot.summary.length < 50) {
      issues.push('Summary too short or missing');
    }

    if (snapshot.decisions.length === 0) {
      issues.push('No decisions recorded');
    }

    return {
      valid: issues.length === 0,
      issues,
      tokenCount
    };
  }

  /**
   * P0.2 STUB: Calculate snapshot tokens (stub implementation)
   */
  protected calculateSnapshotTokensStub(snapshot: PhaseSnapshot): number {
    // Basic implementation - to be overridden in extended class
    return this.estimateTokenCount(snapshot.summary) +
           (snapshot.decisions.length * 20) +
           (snapshot.questions.length * 15) +
           this.estimateTokenCount(snapshot.scope) +
           (snapshot.sources.length * 10) +
           (snapshot.pending.length * 15);
  }

  // Additional helper methods would continue here...
  // For brevity, including just the key structure

  private initializeStopWords(): void {
    this.indonesianStopWords = new Set([
      'yang', 'dan', 'di', 'ke', 'dari', 'dengan', 'untuk', 'pada', 'dalam', 'adalah',
      'ini', 'itu', 'atau', 'juga', 'akan', 'telah', 'dapat', 'ada', 'tidak', 'ya'
      // Add more Indonesian stop words
    ]);

    this.englishStopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did'
      // Add more English stop words
    ]);
  }

  private initializeAcademicTerms(): void {
    this.academicTerms = new Set([
      'penelitian', 'analisis', 'metodologi', 'hipotesis', 'variabel', 'data', 'sampel',
      'research', 'analysis', 'methodology', 'hypothesis', 'variable', 'data', 'sample',
      'teori', 'konsep', 'framework', 'paradigma', 'empiris', 'signifikan'
    ]);
  }

  private initializeCitationPatterns(): void {
    this.citationPatterns = [
      /\(([^)]*\d{4}[^)]*)\)/g, // APA style: (Author, 2021)
      /\[([^\]]*\d{4}[^\]]*)\]/g, // Square brackets: [Author, 2021]
      /\{([^}]*\d{4}[^}]*)\}/g, // Curly braces: {Author, 2021}
    ];
  }

  private async getDefaultOptions(): Promise<ProcessingOptions> {
    // Get dynamic maxTokens from admin panel (primary model with proportional scaling)
    const dynamicConfig = await getDynamicModelConfig();
    const baseMaxTokens = dynamicConfig.primaryModel?.maxTokens || 8192;
    const chunkingMaxTokens = Math.floor(baseMaxTokens * 0.06); // ~6% for content chunking (500/8192 ≈ 0.06)

    return {
      analysis: {
        enableMetrics: true,
        enableStructure: true,
        enableCitations: true,
        enableQuality: true,
        enableReadability: true
      },
      chunking: {
        strategy: 'paragraph',
        maxTokens: chunkingMaxTokens,
        overlap: 50,
        preserveStructure: true
      },
      normalization: {
        removeExtraWhitespace: true,
        standardizeQuotes: true,
        fixCommonTypos: true,
        normalizeUnicode: true
      },
      extraction: {
        extractCitations: true,
        extractKeyTerms: true,
        extractHeadings: true,
        extractAbstract: true
      }
    };
  }

  // Placeholder implementations for remaining methods
  private getEmptyMetrics(): ContentMetrics {
    return {
      wordCount: 0, characterCount: 0, paragraphCount: 0, sentenceCount: 0,
      averageWordsPerSentence: 0, averageSentencesPerParagraph: 0, uniqueWords: 0,
      vocabularyRichness: 0, formalityScore: 0, complexityScore: 0
    };
  }

  private getEmptyStructure(): StructureAnalysis {
    return {
      hasTitle: false, hasAbstract: false, hasIntroduction: false, hasConclusion: false,
      hasReferences: false, sectionCount: 0, headingLevels: [], structureScore: 0,
      missingElements: [], organizationScore: 0
    };
  }

  private getEmptyCitations(): CitationAnalysis {
    return {
      totalCitations: 0, inTextCitations: 0, referenceCitations: 0, citationDensity: 0,
      citationStyles: [], consistencyScore: 0, issues: [], recommendations: []
    };
  }

  private getEmptyQuality(): QualityAnalysis {
    return {
      overallScore: 0, coherenceScore: 0, clarityScore: 0, academicTone: 0,
      evidenceSupport: 0, argumentStrength: 0, issues: [], strengths: [], improvements: []
    };
  }

  private getEmptyReadability(): ReadabilityAnalysis {
    return {
      fleschScore: 0, fleschKincaidGrade: 0, colemanLiauIndex: 0, automatedReadabilityIndex: 0,
      averageReadabilityGrade: 0, readabilityLevel: 'college', recommendations: []
    };
  }

  private fixCommonTypos(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\.\s*\./g, '.')
      .replace(/,\s*,/g, ',')
      .trim();
  }

  private extractKeyTerms(content: string): string[] {
    const words = this.getWords(content);
    return words
      .filter(word => word.length > 3)
      .filter(word => this.academicTerms.has(word))
      .slice(0, 10); // Top 10 key terms
  }

  // Additional method implementations would continue...
  // Simplified for demonstration purposes
  
  private calculateFormalityScore(content: string): number { return 0.7; }
  private hasTitle(content: string): boolean { return content.includes('title') || content.includes('judul'); }
  private hasAbstract(content: string): boolean { return content.toLowerCase().includes('abstract') || content.toLowerCase().includes('abstrak'); }
  private hasIntroduction(content: string): boolean { return content.toLowerCase().includes('introduction') || content.toLowerCase().includes('pendahuluan'); }
  private hasConclusion(content: string): boolean { return content.toLowerCase().includes('conclusion') || content.toLowerCase().includes('kesimpulan'); }
  private hasReferences(content: string): boolean { return content.toLowerCase().includes('references') || content.toLowerCase().includes('daftar pustaka'); }
  private extractHeadings(content: string): Array<{text: string; level: number}> { return []; }
  private getHeadingLevel(text: string): number { return 1; }
  private calculateStructureScore(...args: any[]): number { return 0.8; }
  private calculateOrganizationScore(levels: number[]): number { return 0.7; }
  private countInTextCitations(content: string): number { return this.countCitations(content); }
  private countReferenceCitations(content: string): number { return 0; }
  private detectCitationStyles(content: string): string[] { return ['APA']; }
  private calculateCitationConsistency(content: string): number { return 0.8; }
  private detectCitationIssues(content: string): CitationIssue[] { return []; }
  private generateCitationRecommendations(issues: CitationIssue[], density: number): string[] { return []; }
  private calculateCoherenceScore(content: string): number { return 0.7; }
  private calculateClarityScore(content: string): number { return 0.8; }
  private calculateAcademicTone(content: string): number { return 0.75; }
  private calculateEvidenceSupport(content: string): number { return 0.6; }
  private calculateArgumentStrength(content: string): number { return 0.7; }
  private identifyQualityIssues(content: string, scores: any): QualityIssue[] { return []; }
  private identifyStrengths(content: string, scores: any): string[] { return []; }
  private suggestImprovements(issues: QualityIssue[]): string[] { return []; }
  private countSyllables(content: string): number { return this.countWords(content) * 1.5; }
  private determineReadabilityLevel(grade: number): ReadabilityAnalysis['readabilityLevel'] { return 'college'; }
  private generateReadabilityRecommendations(score: number, level: string): string[] { return []; }
  private chunkBySemantic(content: string, options: any, context: any): ContentChunk[] { return []; }
  private chunkByFixedSize(content: string, options: any, context: any): ContentChunk[] { return []; }
  private chunkBySentence(content: string, options: any, context: any): ContentChunk[] { return []; }
  private isHeading(line: string): boolean { return false; }
  private isImplicitSectionBreak(line: string): boolean { return false; }
  private generateSectionId(): string { return `section-${Date.now()}`; }
  private inferSectionType(title: string): SectionType { return 'custom'; }
  private inferPhaseFromContent(content: string): AcademicPhase { return 'content_drafting'; }
  private parseCitationMatch(match: RegExpMatchArray): BibliographyEntry | null { return null; }
  private deduplicateCitations(citations: BibliographyEntry[]): BibliographyEntry[] { return citations; }
  private inferAcademicLevel(content: string): 'undergraduate' | 'graduate' | 'doctoral' | 'postdoc' { return 'graduate'; }
  private inferDiscipline(content: string): string { return 'general'; }
  private extractKeywords(content: string, language: 'id' | 'en'): string[] { return []; }
}

/**
 * P0.2 SNAPSHOT DISTILLATION: Phase Context Snapshot Creation
 * Target: 600-800 tokens, cap 800, meta-summary ≤200 tokens
 */
export interface SnapshotDistillationOptions {
  targetTokens: number;        // Target: 600
  maxTokens: number;          // Cap: 800
  metaMaxTokens: number;      // Meta summary cap: 200
  priorityWeights: {
    decisions: number;         // Weight for decisions
    findings: number;          // Weight for key findings
    questions: number;         // Weight for outstanding questions
    sources: number;           // Weight for source references
    scope: number;            // Weight for scope definition
  };
  language: 'id' | 'en';
}

export interface PhaseSnapshot {
  summary: string;             // Key findings dan decisions (≤400 tokens)
  decisions: string[];         // Major decisions made (≤100 tokens)
  questions: string[];         // Outstanding questions (≤100 tokens)
  scope: string;              // Phase scope definition (≤100 tokens)
  sources: string[];          // Key sources referenced (≤100 tokens)
  pending: string[];          // Items untuk next phase (≤100 tokens)
}

export interface DistillationResult {
  snapshot: PhaseSnapshot;
  metaSummary: string;        // Cross-phase summary (≤200 tokens)
  tokenCount: number;
  compressionRatio: number;
  quality: {
    completeness: number;     // How complete is the snapshot
    coherence: number;        // How coherent is the content
    efficiency: number;       // Token efficiency score
  };
  warnings: string[];
}

/**
 * Extended ContentProcessorService dengan snapshot distillation
 */
export class ContentProcessorServiceExtended extends ContentProcessorService {
  /**
   * P0.2 OVERRIDE: Create phase snapshot from artifact
   */
  async createPhaseSnapshot(
    artifactContent: string,
    phase: number,
    options: Partial<SnapshotDistillationOptions> = {}
  ): Promise<DistillationResult> {
    return this.distillToSnapshot(artifactContent, phase, options);
  }

  /**
   * P0.2 CORE: Distill artifact content into phase context snapshot
   */
  async distillToSnapshot(
    artifactContent: string,
    phase: number,
    options: Partial<SnapshotDistillationOptions> = {}
  ): Promise<DistillationResult> {
    const config: SnapshotDistillationOptions = {
      targetTokens: 600,
      maxTokens: 800,
      metaMaxTokens: 200,
      priorityWeights: {
        decisions: 1.0,
        findings: 0.9,
        questions: 0.8,
        sources: 0.7,
        scope: 0.6
      },
      language: 'id',
      ...options
    };

    console.log(`[ContentProcessor] 🎯 Distilling phase ${phase} content (${artifactContent.length} chars)`);

    // Get dynamic maxTokens from admin panel for content analysis
    const dynamicConfig = await getDynamicModelConfig();
    const baseMaxTokens = dynamicConfig.primaryModel?.maxTokens || 8192;
    const analysisMaxTokens = Math.floor(baseMaxTokens * 0.024); // ~2.4% for content analysis (200/8192 ≈ 0.024)

    // Step 1: Extract structured content using analysis
    const analysis = await this.processContent(artifactContent, {
      analysis: {
        enableMetrics: true,
        enableStructure: true,
        enableCitations: true,
        enableQuality: true,
        enableReadability: false
      },
      chunking: {
        strategy: 'semantic',
        maxTokens: analysisMaxTokens,
        overlap: 50,
        preserveStructure: true
      },
      normalization: {
        removeExtraWhitespace: true,
        standardizeQuotes: true,
        fixCommonTypos: true,
        normalizeUnicode: true
      },
      extraction: {
        extractCitations: true,
        extractKeyTerms: true,
        extractHeadings: true,
        extractAbstract: true
      }
    });

    // Step 2: Identify key components
    const keyComponents = this.extractKeyComponents(artifactContent, phase, config);

    // Step 3: Apply intelligent compression
    const compressedSnapshot = this.compressToTargetTokens(keyComponents, config);

    // Step 4: Generate meta-summary
    const metaSummary = this.generateMetaSummary(compressedSnapshot, phase, config.metaMaxTokens);

    // Step 5: Calculate metrics
    const tokenCount = this.calculateSnapshotTokens(compressedSnapshot);
    const compressionRatio = artifactContent.length > 0 ?
      (tokenCount * 4) / artifactContent.length : 1;

    // Step 6: Quality assessment
    const quality = this.assessSnapshotQuality(compressedSnapshot, tokenCount, config);

    // Step 7: Generate warnings
    const warnings = this.generateSnapshotWarnings(compressedSnapshot, tokenCount, config);

    console.log(`[ContentProcessor] ✅ Distillation complete: ${tokenCount}/${config.maxTokens} tokens (${Math.round(compressionRatio * 100)}% compression)`);

    return {
      snapshot: compressedSnapshot,
      metaSummary,
      tokenCount,
      compressionRatio,
      quality,
      warnings
    };
  }

  /**
   * P0.2 EXTRACTION: Extract key components from artifact
   */
  private extractKeyComponents(
    content: string,
    phase: number,
    config: SnapshotDistillationOptions
  ): PhaseSnapshot {
    // Extract decisions using pattern matching
    const decisions = this.extractDecisions(content, config.language);

    // Extract key findings and main content
    const findings = this.extractKeyFindings(content, config.language);

    // Extract outstanding questions
    const questions = this.extractQuestions(content, config.language);

    // Extract scope definition
    const scope = this.extractScope(content, phase, config.language);

    // Extract source references
    const sources = this.extractSourceReferences(content);

    // Extract pending items
    const pending = this.extractPendingItems(content, config.language);

    return {
      summary: findings,
      decisions,
      questions,
      scope,
      sources,
      pending
    };
  }

  /**
   * P0.2 COMPRESSION: Compress to target token count
   */
  private compressToTargetTokens(
    components: PhaseSnapshot,
    config: SnapshotDistillationOptions
  ): PhaseSnapshot {
    const currentTokens = this.calculateSnapshotTokens(components);

    if (currentTokens <= config.targetTokens) {
      return components; // Already within target
    }

    console.log(`[ContentProcessor] 🔧 Compressing from ${currentTokens} to ${config.targetTokens} tokens`);

    // Apply priority-based compression
    const compressed: PhaseSnapshot = {
      summary: this.compressText(components.summary, 400, config.priorityWeights.findings),
      decisions: this.compressArray(components.decisions, 100, config.priorityWeights.decisions),
      questions: this.compressArray(components.questions, 100, config.priorityWeights.questions),
      scope: this.compressText(components.scope, 100, config.priorityWeights.scope),
      sources: this.compressArray(components.sources, 100, config.priorityWeights.sources),
      pending: this.compressArray(components.pending, 100, 0.5) // Lower priority
    };

    // Verify compression
    const finalTokens = this.calculateSnapshotTokens(compressed);
    if (finalTokens > config.maxTokens) {
      console.warn(`[ContentProcessor] ⚠️ Compression exceeded cap: ${finalTokens}/${config.maxTokens} tokens`);
      // Apply emergency compression
      return this.emergencyCompress(compressed, config.maxTokens);
    }

    return compressed;
  }

  /**
   * P0.2 META SUMMARY: Generate cross-phase summary
   */
  private generateMetaSummary(
    snapshot: PhaseSnapshot,
    phase: number,
    maxTokens: number
  ): string {
    const phaseNames: Record<number, string> = {
      1: 'Klarifikasi',
      2: 'Literatur',
      3: 'Kerangka',
      4: 'Pengembangan',
      5: 'Sintesis',
      6: 'Review',
      7: 'Finalisasi'
    };

    const phaseName = phaseNames[phase] || `Fase ${phase}`;

    // Generate concise meta-summary
    const keyDecisions = snapshot.decisions.slice(0, 2).join('; ');
    const mainFinding = this.extractFirstSentence(snapshot.summary);
    const nextSteps = snapshot.pending.slice(0, 2).join('; ');

    let metaSummary = `${phaseName}: ${mainFinding}`;

    if (keyDecisions) {
      metaSummary += ` Keputusan: ${keyDecisions}.`;
    }

    if (nextSteps) {
      metaSummary += ` Lanjutan: ${nextSteps}.`;
    }

    // Ensure within token limit
    return this.compressText(metaSummary, maxTokens, 1.0);
  }

  /**
   * P0.2 UTILITIES: Helper methods for extraction and compression
   */
  private extractDecisions(content: string, language: 'id' | 'en'): string[] {
    const patterns = language === 'id' ? [
      /(?:memutuskan|menetapkan|menentukan|sepakat)\s+[^.!?]+[.!?]/gi,
      /keputusan[^.!?]+[.!?]/gi,
      /disepakati[^.!?]+[.!?]/gi
    ] : [
      /(?:decided|determined|agreed)\s+[^.!?]+[.!?]/gi,
      /decision[^.!?]+[.!?]/gi,
      /conclusion[^.!?]+[.!?]/gi
    ];

    const decisions: string[] = [];
    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches) {
        decisions.push(...matches.map(m => m.trim()));
      }
    }

    return this.deduplicateAndRank(decisions).slice(0, 5);
  }

  private extractKeyFindings(content: string, language: 'id' | 'en'): string {
    // Extract first significant paragraph
    const paragraphs = this.getParagraphs(content);
    const significantParagraphs = paragraphs.filter(p => p.length > 100);

    if (significantParagraphs.length === 0) {
      return this.compressText(content, 400, 1.0);
    }

    // Prioritize paragraphs with academic terms
    const rankedParagraphs = significantParagraphs
      .map(p => ({
        text: p,
        score: this.calculateAcademicScore(p)
      }))
      .sort((a, b) => b.score - a.score);

    return rankedParagraphs[0].text;
  }

  private extractQuestions(content: string, language: 'id' | 'en'): string[] {
    const questionMarkers = language === 'id' ? [
      '?', 'bagaimana', 'mengapa', 'kapan', 'dimana', 'siapa', 'apa'
    ] : [
      '?', 'how', 'why', 'when', 'where', 'who', 'what'
    ];

    const sentences = this.getSentences(content);
    const questions = sentences.filter(s =>
      s.includes('?') || questionMarkers.some(marker =>
        s.toLowerCase().includes(marker.toLowerCase())
      )
    );

    return questions.slice(0, 3);
  }

  private extractScope(content: string, phase: number, language: 'id' | 'en'): string {
    const scopeKeywords = language === 'id' ? [
      'ruang lingkup', 'batasan', 'fokus', 'cakupan', 'target'
    ] : [
      'scope', 'limitation', 'focus', 'coverage', 'target'
    ];

    const sentences = this.getSentences(content);
    const scopeSentences = sentences.filter(s =>
      scopeKeywords.some(keyword =>
        s.toLowerCase().includes(keyword.toLowerCase())
      )
    );

    if (scopeSentences.length > 0) {
      return scopeSentences[0];
    }

    // Fallback: extract first meaningful sentence
    const meaningfulSentences = sentences.filter(s => s.length > 50);
    return meaningfulSentences[0] || `Fase ${phase} penelitian akademik`;
  }

  private extractSourceReferences(content: string): string[] {
    // Extract citations and references
    const citationPatterns = [
      /\([^)]*\d{4}[^)]*\)/g,  // (Author, 2021)
      /\[[^\]]*\d{4}[^\]]*\]/g, // [Author, 2021]
      /https?:\/\/[^\s]+/g      // URLs
    ];

    const sources: string[] = [];
    for (const pattern of citationPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        sources.push(...matches);
      }
    }

    return this.deduplicateAndRank(sources).slice(0, 5);
  }

  private extractPendingItems(content: string, language: 'id' | 'en'): string[] {
    const pendingMarkers = language === 'id' ? [
      'selanjutnya', 'berikutnya', 'akan', 'perlu', 'harus', 'rencana'
    ] : [
      'next', 'following', 'will', 'need', 'must', 'plan'
    ];

    const sentences = this.getSentences(content);
    const pendingItems = sentences.filter(s =>
      pendingMarkers.some(marker =>
        s.toLowerCase().includes(marker.toLowerCase())
      )
    );

    return pendingItems.slice(0, 3);
  }

  private compressText(text: string, maxTokens: number, priority: number): string {
    const currentTokens = this.estimateTokenCount(text);

    if (currentTokens <= maxTokens) {
      return text;
    }

    // Apply compression based on priority
    const targetRatio = maxTokens / currentTokens;
    const sentences = this.getSentences(text);
    const targetSentences = Math.max(1, Math.floor(sentences.length * targetRatio * priority));

    // Keep most important sentences
    const rankedSentences = sentences
      .map(s => ({
        text: s,
        score: this.calculateSentenceImportance(s)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, targetSentences)
      .map(s => s.text);

    return rankedSentences.join(' ');
  }

  private compressArray(items: string[], maxTokens: number, priority: number): string[] {
    const totalTokens = items.reduce((sum, item) => sum + this.estimateTokenCount(item), 0);

    if (totalTokens <= maxTokens) {
      return items;
    }

    // Keep most important items within token budget
    const rankedItems = items
      .map(item => ({
        text: item,
        tokens: this.estimateTokenCount(item),
        score: this.calculateSentenceImportance(item) * priority
      }))
      .sort((a, b) => b.score - a.score);

    const result: string[] = [];
    let usedTokens = 0;

    for (const item of rankedItems) {
      if (usedTokens + item.tokens <= maxTokens) {
        result.push(item.text);
        usedTokens += item.tokens;
      }
    }

    return result;
  }

  private emergencyCompress(snapshot: PhaseSnapshot, maxTokens: number): PhaseSnapshot {
    console.warn('[ContentProcessor] 🚨 Applying emergency compression');

    // Aggressive compression - reduce all sections proportionally
    const ratio = maxTokens / this.calculateSnapshotTokens(snapshot) * 0.9; // Safety margin

    return {
      summary: this.compressText(snapshot.summary, Math.floor(400 * ratio), 1.0),
      decisions: this.compressArray(snapshot.decisions, Math.floor(100 * ratio), 1.0),
      questions: this.compressArray(snapshot.questions, Math.floor(80 * ratio), 0.8),
      scope: this.compressText(snapshot.scope, Math.floor(80 * ratio), 0.8),
      sources: this.compressArray(snapshot.sources, Math.floor(60 * ratio), 0.6),
      pending: this.compressArray(snapshot.pending, Math.floor(60 * ratio), 0.5)
    };
  }

  private calculateSnapshotTokens(snapshot: PhaseSnapshot): number {
    return [
      this.estimateTokenCount(snapshot.summary),
      ...snapshot.decisions.map(d => this.estimateTokenCount(d)),
      ...snapshot.questions.map(q => this.estimateTokenCount(q)),
      this.estimateTokenCount(snapshot.scope),
      ...snapshot.sources.map(s => this.estimateTokenCount(s)),
      ...snapshot.pending.map(p => this.estimateTokenCount(p))
    ].reduce((sum, tokens) => sum + tokens, 0);
  }

  private assessSnapshotQuality(
    snapshot: PhaseSnapshot,
    tokenCount: number,
    config: SnapshotDistillationOptions
  ): DistillationResult['quality'] {
    // Completeness: how many sections are filled
    const filledSections = [
      snapshot.summary.length > 0,
      snapshot.decisions.length > 0,
      snapshot.questions.length > 0,
      snapshot.scope.length > 0,
      snapshot.sources.length > 0,
      snapshot.pending.length > 0
    ].filter(Boolean).length;

    const completeness = filledSections / 6;

    // Coherence: based on content quality
    const coherence = this.calculateAcademicScore(snapshot.summary) / 10;

    // Efficiency: token usage efficiency
    const targetRange = { min: config.targetTokens, max: config.maxTokens };
    let efficiency = 1.0;

    if (tokenCount < targetRange.min) {
      efficiency = tokenCount / targetRange.min;
    } else if (tokenCount > targetRange.max) {
      efficiency = targetRange.max / tokenCount;
    }

    return { completeness, coherence, efficiency };
  }

  private generateSnapshotWarnings(
    snapshot: PhaseSnapshot,
    tokenCount: number,
    config: SnapshotDistillationOptions
  ): string[] {
    const warnings: string[] = [];

    if (tokenCount > config.maxTokens) {
      warnings.push(`Token count exceeded cap: ${tokenCount}/${config.maxTokens}`);
    }

    if (tokenCount < config.targetTokens * 0.7) {
      warnings.push(`Token count below optimal range: ${tokenCount}/${config.targetTokens}`);
    }

    if (!snapshot.summary) {
      warnings.push('Missing summary content');
    }

    if (snapshot.decisions.length === 0) {
      warnings.push('No decisions extracted');
    }

    return warnings;
  }

  private calculateAcademicScore(text: string): number {
    const academicTerms = [
      'penelitian', 'analisis', 'metodologi', 'hipotesis', 'variabel',
      'research', 'analysis', 'methodology', 'hypothesis', 'variable'
    ];

    const words = this.getWords(text);
    const academicWordCount = words.filter(word =>
      academicTerms.some(term => word.toLowerCase().includes(term.toLowerCase()))
    ).length;

    return (academicWordCount / words.length) * 10;
  }

  private calculateSentenceImportance(sentence: string): number {
    let score = 1;

    // Boost for academic terms
    score += this.calculateAcademicScore(sentence) / 10;

    // Boost for length (not too short, not too long)
    const wordCount = this.getWords(sentence).length;
    if (wordCount >= 10 && wordCount <= 30) {
      score += 0.5;
    }

    // Boost for citations
    if (/\([^)]*\d{4}[^)]*\)|\[[^\]]*\d{4}[^\]]*\]/.test(sentence)) {
      score += 0.3;
    }

    return score;
  }

  private extractFirstSentence(text: string): string {
    const sentences = this.getSentences(text);
    return sentences[0] || text.substring(0, 100) + '...';
  }

  private deduplicateAndRank(items: string[]): string[] {
    const unique = Array.from(new Set(items));
    return unique
      .map(item => ({
        text: item,
        score: this.calculateSentenceImportance(item)
      }))
      .sort((a, b) => b.score - a.score)
      .map(item => item.text);
  }
}

/**
 * Export default service instance (extended)
 */
export const contentProcessor = new ContentProcessorServiceExtended();

/**
 * Export legacy service for compatibility
 */
export const contentProcessorLegacy = new ContentProcessorService();