/**
 * AI Utility Functions and Helpers
 * Common utilities for AI SDK operations and academic workflow management
 * 
 * Based on Vercel AI SDK v5 Core patterns from:
 * - /documentation/docs/03-ai-sdk-core/01-overview.mdx
 * - /documentation/docs/03-ai-sdk-core/25-settings.mdx
 */

import type { ModelMessage } from 'ai';
import { 
  AcademicPhase, 
  AcademicContext, 
  CitationStyle, 
  QualityMetrics,
  AcademicModelMessage,
  Citation,
  ContentAnalysis,
  TypeGuards 
} from './types';
import { ACADEMIC_PERSONA_CONFIG, ACADEMIC_WORKFLOW_CONFIG } from '../config/constants';
import { getDynamicSystemPrompt } from './dynamic-config';

/**
 * Message utilities for working with AI SDK messages
 */
export const MessageUtils = {
  /**
   * Create a system message with academic persona
   * Now uses database-driven system prompts instead of hardcoded ones
   */
  async createSystemMessage(phase?: AcademicPhase, customInstructions?: string): Promise<ModelMessage> {
    // Get system prompt from database instead of hardcoded constants
    let systemPrompt = await getDynamicSystemPrompt();
    
    if (phase) {
      const phaseDescription = ACADEMIC_PERSONA_CONFIG.phases[phase];
      systemPrompt += `\n\nCurrent Phase: ${phase}\nPhase Objective: ${phaseDescription}`;
    }
    
    if (customInstructions) {
      systemPrompt += `\n\nAdditional Instructions: ${customInstructions}`;
    }
    
    systemPrompt += '\n\nWriting Guidelines:\n' + 
      ACADEMIC_PERSONA_CONFIG.writingGuidelines
        .map((guideline, index) => `${index + 1}. ${guideline}`)
        .join('\n');

    return {
      role: 'system',
      content: systemPrompt,
    };
  },

  /**
   * Create a user message with academic context
   */
  createUserMessage(
    content: string, 
    academicContext?: AcademicContext,
    metadata?: any
  ): AcademicModelMessage {
    let enhancedContent = content;
    
    if (academicContext) {
      const contextInfo = [
        `Citation Style: ${academicContext.citationStyle}`,
        `Academic Level: ${academicContext.academicLevel}`,
        `Discipline: ${academicContext.disciplineArea}`,
        `Document Type: ${academicContext.documentType}`,
      ];
      
      if (academicContext.requirements) {
        const req = academicContext.requirements;
        if (req.wordCount) {
          contextInfo.push(`Word Count: ${req.wordCount.min}-${req.wordCount.max} words`);
        }
        if (req.citationCount) {
          contextInfo.push(`Citations: ${req.citationCount.min}-${req.citationCount.max} sources`);
        }
      }
      
      enhancedContent = `Context: ${contextInfo.join(', ')}\n\nRequest: ${content}`;
    }

    return {
      role: 'user',
      content: enhancedContent,
      metadata: {
        academicContext,
        timestamp: new Date(),
        ...metadata,
      },
    };
  },

  /**
   * Extract text content from messages
   */
  extractTextFromMessages(messages: ModelMessage[]): string {
    return messages
      .map(msg => {
        if (typeof msg.content === 'string') {
          return msg.content;
        } else if (Array.isArray(msg.content)) {
          return msg.content
            .filter(part => part && typeof part === 'object' && part.type === 'text')
            .map(part => {
              // Defensive type checking - ensure part is object before using 'in' operator
              if (typeof part === 'object' && part !== null && 'text' in part) {
                return (part as any).text || '';
              }
              return '';
            })
            .join(' ');
        }
        return '';
      })
      .join('\n\n');
  },

  /**
   * Filter messages by role
   */
  filterMessagesByRole(messages: ModelMessage[], role: ModelMessage['role']): ModelMessage[] {
    return messages.filter(msg => msg.role === role);
  },

  /**
   * Get last message of specific role
   */
  getLastMessageByRole(messages: ModelMessage[], role: ModelMessage['role']): ModelMessage | null {
    const filtered = this.filterMessagesByRole(messages, role);
    return filtered.length > 0 ? filtered[filtered.length - 1] : null;
  },

  /**
   * Count tokens in messages (approximate)
   */
  estimateTokenCount(messages: ModelMessage[]): number {
    const text = this.extractTextFromMessages(messages);
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  },

  /**
   * Truncate messages to fit within token limit
   */
  truncateMessages(messages: ModelMessage[], maxTokens: number): ModelMessage[] {
    if (messages.length === 0) return messages;
    
    let totalTokens = this.estimateTokenCount(messages);
    let truncatedMessages = [...messages];
    
    // Remove oldest user/assistant messages first, keep system messages
    while (totalTokens > maxTokens && truncatedMessages.length > 1) {
      const systemMessages = truncatedMessages.filter(msg => msg.role === 'system');
      const otherMessages = truncatedMessages.filter(msg => msg.role !== 'system');
      
      if (otherMessages.length > 0) {
        otherMessages.shift(); // Remove oldest non-system message
        truncatedMessages = [...systemMessages, ...otherMessages];
        totalTokens = this.estimateTokenCount(truncatedMessages);
      } else {
        break;
      }
    }
    
    return truncatedMessages;
  },
};

/**
 * Academic content analysis utilities
 */
export const ContentAnalysisUtils = {
  /**
   * Calculate quality metrics for academic content
   */
  calculateQualityMetrics(content: string, citationCount: number = 0): QualityMetrics {
    const words = content.trim().split(/\s+/).filter(word => word.length > 0);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    // Basic readability (Flesch Reading Ease approximation)
    const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
    const avgSyllablesPerWord = this.estimateSyllables(words);
    const readabilityScore = Math.max(0, Math.min(100, 
      206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord)
    ));
    
    // Academic tone analysis (simple heuristic)
    const academicTerms = this.countAcademicTerms(content);
    const academicTone = Math.min(100, (academicTerms / words.length) * 1000);
    
    // Argument strength (based on transition words and structure)
    const argumentStrength = this.analyzeArgumentStrength(content);
    
    // Citation quality (density and distribution)
    const citationQuality = this.analyzeCitationQuality(content, citationCount);
    
    // Coherence (based on topic consistency)
    const coherence = this.analyzeCoherence(content);
    
    return {
      readabilityScore: Math.round(readabilityScore),
      academicTone: Math.round(academicTone),
      argumentStrength: Math.round(argumentStrength),
      citationQuality: Math.round(citationQuality),
      coherence: Math.round(coherence),
      completeness: this.assessCompleteness(content),
      grammarScore: this.estimateGrammarScore(content),
      stylistics: {
        wordCount: words.length,
        sentenceCount: sentences.length,
        paragraphCount: paragraphs.length,
        averageWordsPerSentence: Math.round(avgWordsPerSentence * 100) / 100,
        averageSentencesPerParagraph: Math.round((sentences.length / Math.max(paragraphs.length, 1)) * 100) / 100,
      },
    };
  },

  /**
   * Estimate syllables in words (for readability calculation)
   */
  estimateSyllables(words: string[]): number {
    let totalSyllables = 0;
    
    for (const word of words) {
      const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
      if (cleanWord.length === 0) continue;
      
      // Simple syllable counting heuristic
      let syllables = cleanWord.split(/[aeiou]+/).length - 1;
      if (cleanWord.endsWith('e')) syllables--;
      if (syllables === 0) syllables = 1;
      
      totalSyllables += syllables;
    }
    
    return totalSyllables / Math.max(words.length, 1);
  },

  /**
   * Count academic terms in content
   */
  countAcademicTerms(content: string): number {
    const academicTerms = [
      'therefore', 'however', 'furthermore', 'moreover', 'consequently',
      'analysis', 'hypothesis', 'methodology', 'theoretical', 'empirical',
      'significant', 'correlation', 'evidence', 'demonstrate', 'indicate',
      'suggest', 'propose', 'examine', 'investigate', 'conclude',
      'according', 'research', 'study', 'findings', 'results',
    ];
    
    const words = content.toLowerCase().split(/\W+/);
    return words.filter(word => academicTerms.includes(word)).length;
  },

  /**
   * Analyze argument strength based on logical indicators
   */
  analyzeArgumentStrength(content: string): number {
    const transitionWords = [
      'because', 'since', 'due to', 'as a result', 'therefore',
      'consequently', 'thus', 'hence', 'accordingly', 'for this reason',
      'in contrast', 'however', 'nevertheless', 'on the other hand',
      'despite', 'although', 'whereas', 'conversely',
    ];
    
    const evidenceWords = [
      'evidence', 'data', 'statistics', 'research shows', 'studies indicate',
      'according to', 'findings suggest', 'results demonstrate',
    ];
    
    const words = content.toLowerCase();
    let score = 50; // Base score
    
    // Count logical transitions
    const transitionCount = transitionWords.filter(term => words.includes(term)).length;
    score += Math.min(30, transitionCount * 5);
    
    // Count evidence references  
    const evidenceCount = evidenceWords.filter(term => words.includes(term)).length;
    score += Math.min(20, evidenceCount * 3);
    
    return Math.min(100, score);
  },

  /**
   * Analyze citation quality
   */
  analyzeCitationQuality(content: string, citationCount: number): number {
    const wordCount = content.split(/\s+/).length;
    const citationDensity = citationCount / Math.max(wordCount, 1) * 1000; // Citations per 1000 words
    
    let score = 0;
    
    // Optimal citation density is 1-3 citations per 1000 words
    if (citationDensity >= 1 && citationDensity <= 3) {
      score = 100;
    } else if (citationDensity < 1) {
      score = citationDensity * 100; // Linear scaling below 1
    } else {
      score = Math.max(50, 100 - (citationDensity - 3) * 10); // Penalty for too many
    }
    
    return Math.max(0, Math.min(100, score));
  },

  /**
   * Analyze coherence based on topic consistency
   */
  analyzeCoherence(content: string): number {
    // Simple coherence analysis based on word repetition and structure
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length < 2) return 100;
    
    const words = content.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    const wordFreq: Record<string, number> = {};
    
    for (const word of words) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
    
    // Count repeated important terms
    const repeatedTerms = Object.values(wordFreq).filter(count => count > 1).length;
    const totalTerms = Object.keys(wordFreq).length;
    
    const repetitionRatio = repeatedTerms / Math.max(totalTerms, 1);
    return Math.min(100, 50 + (repetitionRatio * 50));
  },

  /**
   * Assess content completeness
   */
  assessCompleteness(content: string): number {
    const wordCount = content.split(/\s+/).length;
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    let score = 0;
    
    // Word count assessment
    if (wordCount >= 500) score += 30;
    else score += (wordCount / 500) * 30;
    
    // Structure assessment
    if (paragraphs.length >= 3) score += 25;
    else score += (paragraphs.length / 3) * 25;
    
    // Content depth (presence of complex sentences)
    const complexSentences = content.split(/[.!?]+/).filter(s => 
      s.length > 100 && (s.includes(',') || s.includes(';') || s.includes(':'))
    ).length;
    score += Math.min(25, complexSentences * 5);
    
    // Conclusion presence
    if (content.toLowerCase().includes('conclusion') || 
        content.toLowerCase().includes('in summary') ||
        content.toLowerCase().includes('therefore')) {
      score += 20;
    }
    
    return Math.min(100, score);
  },

  /**
   * Estimate grammar score (basic heuristic)
   */
  estimateGrammarScore(content: string): number {
    let score = 100;
    
    // Check for common grammar issues
    const issues = [
      /\b(there|their|they're)\b.*\b(there|their|they're)\b/gi,  // their/there/they're
      /\b(its|it's)\b.*\b(its|it's)\b/gi,                        // its/it's confusion
      /[.!?]\s*[a-z]/g,                                          // Missing capitalization
      /\s{2,}/g,                                                 // Multiple spaces
      /[.!?]{2,}/g,                                              // Multiple punctuation
    ];
    
    for (const pattern of issues) {
      const matches = content.match(pattern);
      if (matches) {
        score -= matches.length * 5;
      }
    }
    
    return Math.max(0, Math.min(100, score));
  },

  /**
   * Perform comprehensive content analysis
   */
  analyzeContent(content: string): ContentAnalysis {
    const words = content.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    // Extract themes
    const wordFreq: Record<string, number> = {};
    for (const word of words) {
      if (word.length > 4) { // Focus on longer words for themes
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    }
    
    const themes = Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word, freq]) => ({
        name: word,
        frequency: freq,
        relevance: Math.min(100, (freq / words.length) * 1000),
        examples: this.findWordContext(content, word, 2),
      }));
    
    // Analyze sentiment (basic)
    const sentiment = this.analyzeSentiment(content);
    
    // Structure analysis
    const structure = {
      sections: (content.match(/^#+\s/gm) || []).length,
      paragraphs: paragraphs.length,
      averageWordsPerParagraph: Math.round((words.length / Math.max(paragraphs.length, 1)) * 100) / 100,
      headingHierarchy: this.extractHeadings(content),
    };
    
    // Linguistic analysis
    const linguistics = {
      complexity: this.assessComplexity(sentences),
      readabilityGrade: this.calculateReadabilityGrade(content),
      vocabulary: {
        uniqueWords: Object.keys(wordFreq).length,
        academicTerms: this.countAcademicTerms(content),
        technicalTerms: this.countTechnicalTerms(content),
      },
    };
    
    return {
      themes,
      sentiment,
      structure,
      linguistics,
    };
  },

  /**
   * Find context examples for a word
   */
  findWordContext(content: string, word: string, contextWords: number): string[] {
    const words = content.split(/\s+/);
    const examples: string[] = [];
    
    for (let i = 0; i < words.length; i++) {
      if (words[i].toLowerCase().includes(word.toLowerCase())) {
        const start = Math.max(0, i - contextWords);
        const end = Math.min(words.length, i + contextWords + 1);
        const context = words.slice(start, end).join(' ');
        examples.push(context);
        
        if (examples.length >= 3) break; // Limit to 3 examples
      }
    }
    
    return examples;
  },

  /**
   * Analyze sentiment (basic implementation)
   */
  analyzeSentiment(content: string): ContentAnalysis['sentiment'] {
    const positiveWords = ['good', 'excellent', 'positive', 'effective', 'successful', 'beneficial', 'important', 'significant'];
    const negativeWords = ['bad', 'poor', 'negative', 'ineffective', 'failed', 'harmful', 'problematic', 'concerning'];
    
    const words = content.toLowerCase().split(/\W+/);
    const positiveCount = words.filter(word => positiveWords.includes(word)).length;
    const negativeCount = words.filter(word => negativeWords.includes(word)).length;
    
    let overall: 'positive' | 'neutral' | 'negative';
    let confidence: number;
    
    if (positiveCount > negativeCount) {
      overall = 'positive';
      confidence = Math.min(0.9, (positiveCount - negativeCount) / words.length * 100);
    } else if (negativeCount > positiveCount) {
      overall = 'negative';
      confidence = Math.min(0.9, (negativeCount - positiveCount) / words.length * 100);
    } else {
      overall = 'neutral';
      confidence = 0.5;
    }
    
    return {
      overall,
      confidence,
      aspects: [], // Would be implemented with more sophisticated analysis
    };
  },

  /**
   * Extract headings from content
   */
  extractHeadings(content: string): string[] {
    const headingMatches = content.match(/^#+\s(.+)$/gm);
    return headingMatches ? headingMatches.map(h => h.replace(/^#+\s/, '')) : [];
  },

  /**
   * Assess content complexity
   */
  assessComplexity(sentences: string[]): 'simple' | 'moderate' | 'complex' {
    const avgLength = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length;
    
    if (avgLength < 15) return 'simple';
    if (avgLength < 25) return 'moderate';
    return 'complex';
  },

  /**
   * Calculate readability grade
   */
  calculateReadabilityGrade(content: string): number {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((sum, word) => sum + this.countSyllablesInWord(word), 0);
    
    // Flesch-Kincaid Grade Level
    const grade = 0.39 * (words.length / sentences.length) + 11.8 * (syllables / words.length) - 15.59;
    return Math.max(0, Math.round(grade * 10) / 10);
  },

  /**
   * Count syllables in a single word
   */
  countSyllablesInWord(word: string): number {
    const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
    if (cleanWord.length === 0) return 1;
    
    let syllables = cleanWord.split(/[aeiou]+/).length - 1;
    if (cleanWord.endsWith('e')) syllables--;
    if (syllables === 0) syllables = 1;
    
    return syllables;
  },

  /**
   * Count technical terms
   */
  countTechnicalTerms(content: string): number {
    // This would be domain-specific; for now, count words with specific patterns
    const technicalPatterns = [
      /\w+tion\b/g,    // -tion endings
      /\w+ism\b/g,     // -ism endings  
      /\w+ology\b/g,   // -ology endings
      /\w+metric\b/g,  // -metric endings
    ];
    
    let count = 0;
    for (const pattern of technicalPatterns) {
      const matches = content.match(pattern);
      if (matches) count += matches.length;
    }
    
    return count;
  },
};

/**
 * Citation utilities for academic referencing
 */
export const CitationUtils = {
  /**
   * Format citation according to style guide
   */
  formatCitation(citation: Citation, style: CitationStyle): string {
    switch (style) {
      case 'APA':
        return this.formatAPACitation(citation);
      case 'MLA':
        return this.formatMLACitation(citation);
      case 'Chicago':
        return this.formatChicagoCitation(citation);
      case 'Harvard':
        return this.formatHarvardCitation(citation);
      default:
        return this.formatAPACitation(citation); // Default to APA
    }
  },

  /**
   * Format APA style citation
   */
  formatAPACitation(citation: Citation): string {
    const authors = citation.authors.length > 0 
      ? citation.authors.join(', ') 
      : 'Unknown Author';
    
    const year = citation.publicationDate ? 
      `(${new Date(citation.publicationDate).getFullYear()})` : '(n.d.)';
    
    let formatted = `${authors} ${year}. ${citation.title}`;
    
    if (citation.journal) {
      formatted += `. ${citation.journal}`;
      if (citation.volume) formatted += `, ${citation.volume}`;
      if (citation.issue) formatted += `(${citation.issue})`;
      if (citation.pages) formatted += `, ${citation.pages}`;
    } else if (citation.publisher) {
      formatted += `. ${citation.publisher}`;
    }
    
    if (citation.doi) {
      formatted += `. https://doi.org/${citation.doi}`;
    } else if (citation.url) {
      formatted += `. ${citation.url}`;
    }
    
    return formatted;
  },

  /**
   * Format MLA style citation
   */
  formatMLACitation(citation: Citation): string {
    const authors = citation.authors.length > 0 
      ? citation.authors[0] 
      : 'Unknown Author';
    
    let formatted = `${authors}. "${citation.title}."`;
    
    if (citation.journal) {
      formatted += ` ${citation.journal}`;
      if (citation.volume) formatted += `, vol. ${citation.volume}`;
      if (citation.issue) formatted += `, no. ${citation.issue}`;
      if (citation.publicationDate) {
        formatted += `, ${new Date(citation.publicationDate).getFullYear()}`;
      }
      if (citation.pages) formatted += `, pp. ${citation.pages}`;
    }
    
    return formatted;
  },

  /**
   * Format Chicago style citation
   */
  formatChicagoCitation(citation: Citation): string {
    const authors = citation.authors.length > 0 
      ? citation.authors.join(', ') 
      : 'Unknown Author';
    
    let formatted = `${authors}. "${citation.title}."`;
    
    if (citation.journal) {
      formatted += ` ${citation.journal}`;
      if (citation.volume) formatted += ` ${citation.volume}`;
      if (citation.issue) formatted += `, no. ${citation.issue}`;
      if (citation.publicationDate) {
        formatted += ` (${new Date(citation.publicationDate).getFullYear()})`;
      }
      if (citation.pages) formatted += `: ${citation.pages}`;
    }
    
    return formatted;
  },

  /**
   * Format Harvard style citation
   */
  formatHarvardCitation(citation: Citation): string {
    const authors = citation.authors.length > 0 
      ? citation.authors.join(', ') 
      : 'Unknown Author';
    
    const year = citation.publicationDate ? 
      new Date(citation.publicationDate).getFullYear() : 'n.d.';
    
    let formatted = `${authors} (${year}) '${citation.title}'`;
    
    if (citation.journal) {
      formatted += `, ${citation.journal}`;
      if (citation.volume) formatted += `, ${citation.volume}`;
      if (citation.issue) formatted += `(${citation.issue})`;
      if (citation.pages) formatted += `, pp. ${citation.pages}`;
    }
    
    return formatted;
  },

  /**
   * Generate in-text citation
   */
  generateInTextCitation(citation: Citation, style: CitationStyle, pageNumber?: string): string {
    const year = citation.publicationDate ? 
      new Date(citation.publicationDate).getFullYear() : 'n.d.';
    
    const firstAuthor = citation.authors.length > 0 ? 
      citation.authors[0].split(',')[0] : 'Unknown';
    
    switch (style) {
      case 'APA':
        const apaBase = `(${firstAuthor}, ${year}`;
        return pageNumber ? `${apaBase}, p. ${pageNumber})` : `${apaBase})`;
      
      case 'MLA':
        return pageNumber ? `(${firstAuthor} ${pageNumber})` : `(${firstAuthor})`;
      
      case 'Chicago':
        const chicagoBase = `(${firstAuthor} ${year}`;
        return pageNumber ? `${chicagoBase}, ${pageNumber})` : `${chicagoBase})`;
      
      case 'Harvard':
        const harvardBase = `(${firstAuthor} ${year}`;
        return pageNumber ? `${harvardBase}: ${pageNumber})` : `${harvardBase})`;
      
      default:
        return `(${firstAuthor}, ${year})`;
    }
  },

  /**
   * Validate citation format
   */
  validateCitation(citation: Citation): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (!citation.title || citation.title.trim() === '') {
      issues.push('Title is required');
    }
    
    if (!citation.authors || citation.authors.length === 0) {
      issues.push('At least one author is required');
    }
    
    if (!citation.publicationDate) {
      issues.push('Publication date is required');
    }
    
    if (citation.type === 'journal' && !citation.journal) {
      issues.push('Journal name is required for journal articles');
    }
    
    if (citation.doi && !/^10\.\d{4,}\/\S+/.test(citation.doi)) {
      issues.push('Invalid DOI format');
    }
    
    return {
      valid: issues.length === 0,
      issues,
    };
  },

  /**
   * Extract citations from text
   */
  extractCitationsFromText(text: string, style: CitationStyle): Array<{ citation: string; position: number }> {
    const citations: Array<{ citation: string; position: number }> = [];
    let patterns: RegExp[];
    
    switch (style) {
      case 'APA':
        patterns = [
          /\(([^)]+),\s*(\d{4}[a-z]?)(,\s*p+\.\s*\d+(?:-\d+)?)?\)/g,
          /\(([^)]+)\s+(\d{4}[a-z]?)(,\s*p+\.\s*\d+(?:-\d+)?)?\)/g,
        ];
        break;
      case 'MLA':
        patterns = [
          /\(([^)]+)\s+(\d+(?:-\d+)?)\)/g,
          /\(([^)]+)\)/g,
        ];
        break;
      default:
        patterns = [/\(([^)]+)\)/g]; // Generic pattern
    }
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        citations.push({
          citation: match[0],
          position: match.index,
        });
      }
    }
    
    return citations.sort((a, b) => a.position - b.position);
  },
};

/**
 * Workflow utilities for academic phase management
 */
export const WorkflowUtils = {
  /**
   * Get next phase in workflow
   */
  getNextPhase(currentPhase: AcademicPhase): AcademicPhase | null {
    const phases = ACADEMIC_WORKFLOW_CONFIG.phases;
    const currentIndex = phases.indexOf(currentPhase);
    return currentIndex < phases.length - 1 ? phases[currentIndex + 1] : null;
  },

  /**
   * Get previous phase in workflow
   */
  getPreviousPhase(currentPhase: AcademicPhase): AcademicPhase | null {
    const phases = ACADEMIC_WORKFLOW_CONFIG.phases;
    const currentIndex = phases.indexOf(currentPhase);
    return currentIndex > 0 ? phases[currentIndex - 1] : null;
  },

  /**
   * Calculate workflow progress percentage
   */
  calculateProgress(completedPhases: AcademicPhase[]): number {
    const totalPhases = ACADEMIC_WORKFLOW_CONFIG.phases.length;
    return Math.round((completedPhases.length / totalPhases) * 100);
  },

  /**
   * Estimate remaining time for workflow
   */
  estimateRemainingTime(currentPhase: AcademicPhase, completedPhases: AcademicPhase[]): number {
    const phases = ACADEMIC_WORKFLOW_CONFIG.phases;
    const currentIndex = phases.indexOf(currentPhase);
    const remainingPhases = phases.slice(currentIndex + 1);
    
    // Rough estimation: 2 minutes per phase (would be more sophisticated in practice)
    return remainingPhases.length * 120000; // milliseconds
  },

  /**
   * Validate phase transition
   */
  canTransitionTo(fromPhase: AcademicPhase, toPhase: AcademicPhase): boolean {
    const phases = ACADEMIC_WORKFLOW_CONFIG.phases;
    const fromIndex = phases.indexOf(fromPhase);
    const toIndex = phases.indexOf(toPhase);
    
    // Can only move forward one phase at a time, or stay in same phase
    return toIndex === fromIndex || toIndex === fromIndex + 1;
  },

  /**
   * Get phase description
   */
  getPhaseDescription(phase: AcademicPhase): string {
    return ACADEMIC_PERSONA_CONFIG.phases[phase] || '';
  },

  /**
   * Generate workflow ID
   */
  generateWorkflowId(): string {
    return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Validate academic context
   */
  validateAcademicContext(context: AcademicContext): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (!TypeGuards.isCitationStyle(context.citationStyle)) {
      issues.push('Invalid citation style');
    }
    
    if (!context.disciplineArea || context.disciplineArea.trim() === '') {
      issues.push('Discipline area is required');
    }
    
    if (!['undergraduate', 'graduate', 'doctoral'].includes(context.academicLevel)) {
      issues.push('Invalid academic level');
    }
    
    if (context.requirements?.wordCount) {
      const { min, max } = context.requirements.wordCount;
      if (min >= max) {
        issues.push('Word count minimum must be less than maximum');
      }
    }
    
    return {
      valid: issues.length === 0,
      issues,
    };
  },
};

/**
 * Performance monitoring utilities
 */
export const PerformanceUtils = {
  /**
   * Create a performance timer
   */
  createTimer(): { start: () => void; stop: () => number; elapsed: () => number } {
    let startTime = 0;
    let endTime = 0;
    
    return {
      start: () => {
        startTime = Date.now();
      },
      stop: () => {
        endTime = Date.now();
        return endTime - startTime;
      },
      elapsed: () => {
        return (endTime || Date.now()) - startTime;
      },
    };
  },

  /**
   * Format duration for display
   */
  formatDuration(milliseconds: number): string {
    if (milliseconds < 1000) return `${milliseconds}ms`;
    if (milliseconds < 60000) return `${(milliseconds / 1000).toFixed(1)}s`;
    return `${(milliseconds / 60000).toFixed(1)}m`;
  },

  /**
   * Calculate tokens per second
   */
  calculateTokensPerSecond(tokens: number, durationMs: number): number {
    return tokens / (durationMs / 1000);
  },

  /**
   * Monitor async function performance
   */
  async monitorPerformance<T>(
    fn: () => Promise<T>,
    label?: string
  ): Promise<{ result: T; duration: number; tokensPerSecond?: number }> {
    const timer = this.createTimer();
    timer.start();
    
    try {
      const result = await fn();
      const duration = timer.stop();
      
      if (label && process.env.NODE_ENV === 'development') {
      }
      
      return { result, duration };
    } catch (error) {
      const duration = timer.stop();
      
      if (label && process.env.NODE_ENV === 'development') {
      }
      
      throw error;
    }
  },
};

/**
 * Export all utilities as a single object for convenience
 */
export const AIUtils = {
  Message: MessageUtils,
  ContentAnalysis: ContentAnalysisUtils,
  Citation: CitationUtils,
  Workflow: WorkflowUtils,
  Performance: PerformanceUtils,
};