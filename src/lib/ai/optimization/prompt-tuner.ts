/**
 * AI Prompt Optimization and Performance Tuning System
 * 
 * Provides comprehensive prompt optimization, A/B testing, and performance tuning
 * capabilities for academic AI prompts with automated improvement suggestions.
 * 
 * Based on Vercel AI SDK v5 patterns from:
 * /Users/eriksupit/Desktop/makalah/documentation/docs/03-ai-sdk-core/25-settings.mdx
 * /Users/eriksupit/Desktop/makalah/documentation/docs/06-advanced/01-prompt-engineering.mdx
 */

import type { LanguageModelV2Middleware } from '@ai-sdk/provider';
import type { PromptTemplate } from '../prompts/template-registry';

export interface PromptTuningConfig {
  /** Enable automatic prompt optimization */
  enableAutoOptimization: boolean;
  /** Optimization strategies to use */
  optimizationStrategies: OptimizationStrategy[];
  /** A/B testing configuration */
  abTestingConfig: ABTestingConfig;
  /** Performance thresholds */
  performanceThresholds: PerformanceThresholds;
  /** Optimization targets */
  optimizationTargets: OptimizationTargets;
  /** Learning rate for automatic adjustments */
  learningRate: number;
}

export interface OptimizationStrategy {
  name: 'clarity_enhancement' | 'token_reduction' | 'specificity_improvement' | 'context_optimization' | 'parameter_tuning' | 'structure_refinement';
  enabled: boolean;
  weight: number;
  config?: Record<string, any>;
}

export interface ABTestingConfig {
  /** Enable A/B testing for prompts */
  enabled: boolean;
  /** Minimum sample size for statistical significance */
  minSampleSize: number;
  /** Confidence level for statistical tests */
  confidenceLevel: number;
  /** Traffic split ratio for A/B tests */
  trafficSplit: number;
  /** Test duration in milliseconds */
  testDuration: number;
  /** Metrics to track for A/B testing */
  trackedMetrics: string[];
}

export interface PerformanceThresholds {
  /** Minimum response quality score */
  minQualityScore: number;
  /** Maximum response time (ms) */
  maxResponseTime: number;
  /** Maximum token usage per request */
  maxTokenUsage: number;
  /** Minimum success rate */
  minSuccessRate: number;
  /** Maximum cost per request */
  maxCostPerRequest: number;
}

export interface OptimizationTargets {
  /** Target response quality score */
  targetQualityScore: number;
  /** Target response time (ms) */
  targetResponseTime: number;
  /** Target token efficiency */
  targetTokenEfficiency: number;
  /** Target cost efficiency */
  targetCostEfficiency: number;
  /** Target user satisfaction */
  targetSatisfaction: number;
}

export interface PromptOptimizationResult {
  /** Original prompt template */
  originalPrompt: PromptTemplate;
  /** Optimized prompt template */
  optimizedPrompt: PromptTemplate;
  /** Optimization strategies applied */
  appliedStrategies: AppliedStrategy[];
  /** Performance improvements */
  improvements: PerformanceImprovement[];
  /** A/B testing results */
  abTestResults?: ABTestResult;
  /** Optimization confidence */
  confidence: number;
  /** Recommended actions */
  recommendations: OptimizationRecommendation[];
  /** Optimization timestamp */
  optimizedAt: Date;
}

export interface AppliedStrategy {
  strategy: string;
  changes: PromptChange[];
  impact: StrategyImpact;
  confidence: number;
}

export interface PromptChange {
  type: 'addition' | 'removal' | 'modification' | 'reordering';
  section: 'instruction' | 'context' | 'examples' | 'parameters' | 'constraints';
  original: string;
  modified: string;
  reasoning: string;
}

export interface StrategyImpact {
  qualityImprovement: number;
  tokenReduction: number;
  timeImprovement: number;
  costReduction: number;
  satisfactionImprovement: number;
}

export interface PerformanceImprovement {
  metric: string;
  originalValue: number;
  optimizedValue: number;
  improvement: number;
  improvementPercent: number;
}

export interface ABTestResult {
  testId: string;
  variants: ABTestVariant[];
  winner?: string;
  confidence: number;
  significance: number;
  sampleSize: number;
  testDuration: number;
  metrics: ABTestMetric[];
}

export interface ABTestVariant {
  id: string;
  name: string;
  prompt: PromptTemplate;
  traffic: number;
  performance: VariantPerformance;
}

export interface VariantPerformance {
  requests: number;
  successRate: number;
  avgQualityScore: number;
  avgResponseTime: number;
  avgTokenUsage: number;
  avgCost: number;
  userSatisfaction: number;
}

export interface ABTestMetric {
  name: string;
  controlValue: number;
  testValue: number;
  improvement: number;
  pValue: number;
  isSignificant: boolean;
}

export interface OptimizationRecommendation {
  category: 'clarity' | 'efficiency' | 'effectiveness' | 'cost' | 'performance';
  priority: 'high' | 'medium' | 'low';
  description: string;
  action: string;
  expectedImpact: string;
  effort: 'low' | 'medium' | 'high';
}

export interface PromptMetrics {
  /** Quality metrics */
  qualityScore: number;
  relevanceScore: number;
  coherenceScore: number;
  creativityScore: number;
  
  /** Performance metrics */
  responseTime: number;
  tokenUsage: number;
  costPerRequest: number;
  successRate: number;
  
  /** User experience metrics */
  userSatisfaction: number;
  taskCompletion: number;
  errorRate: number;
}

/**
 * Default prompt tuning configuration
 */
export const DEFAULT_PROMPT_TUNING_CONFIG: PromptTuningConfig = {
  enableAutoOptimization: true,
  optimizationStrategies: [
    {
      name: 'clarity_enhancement',
      enabled: true,
      weight: 0.25,
      config: { focusAreas: ['instructions', 'examples'] }
    },
    {
      name: 'token_reduction',
      enabled: true,
      weight: 0.20,
      config: { targetReduction: 0.15, preserveQuality: true }
    },
    {
      name: 'specificity_improvement',
      enabled: true,
      weight: 0.20,
      config: { addConstraints: true, clarifyExpectations: true }
    },
    {
      name: 'context_optimization',
      enabled: true,
      weight: 0.15,
      config: { contextWindow: 4096, prioritizeRecent: true }
    },
    {
      name: 'parameter_tuning',
      enabled: true,
      weight: 0.10,
      config: { tuneTemperature: true, tuneTopP: true }
    },
    {
      name: 'structure_refinement',
      enabled: true,
      weight: 0.10,
      config: { improveFlow: true, addSections: true }
    }
  ],
  abTestingConfig: {
    enabled: true,
    minSampleSize: 50,
    confidenceLevel: 0.95,
    trafficSplit: 0.2,
    testDuration: 7 * 24 * 60 * 60 * 1000, // 7 days
    trackedMetrics: ['qualityScore', 'responseTime', 'tokenUsage', 'userSatisfaction']
  },
  performanceThresholds: {
    minQualityScore: 0.7,
    maxResponseTime: 5000,
    maxTokenUsage: 4000,
    minSuccessRate: 0.95,
    maxCostPerRequest: 0.10
  },
  optimizationTargets: {
    targetQualityScore: 0.85,
    targetResponseTime: 3000,
    targetTokenEfficiency: 0.8,
    targetCostEfficiency: 0.7,
    targetSatisfaction: 0.9
  },
  learningRate: 0.1
};

/**
 * Prompt Tuning and Optimization Service
 */
export class PromptTunerService {
  private config: PromptTuningConfig;
  private performanceHistory: Map<string, PromptMetrics[]>;
  private activeTests: Map<string, ABTestResult>;
  private optimizationCache: Map<string, PromptOptimizationResult>;

  constructor(config: Partial<PromptTuningConfig> = {}) {
    this.config = { ...DEFAULT_PROMPT_TUNING_CONFIG, ...config };
    this.performanceHistory = new Map();
    this.activeTests = new Map();
    this.optimizationCache = new Map();
  }

  /**
   * Optimize a prompt template for better performance
   */
  async optimizePrompt(
    prompt: PromptTemplate,
    performanceData?: PromptMetrics[]
  ): Promise<PromptOptimizationResult> {
    const cacheKey = this.generatePromptCacheKey(prompt);
    
    // Check cache first
    if (this.optimizationCache.has(cacheKey)) {
      const cached = this.optimizationCache.get(cacheKey)!;
      // Return cached result if recent (less than 24 hours old)
      if (Date.now() - cached.optimizedAt.getTime() < 24 * 60 * 60 * 1000) {
        return cached;
      }
    }

    const appliedStrategies: AppliedStrategy[] = [];
    let currentPrompt = { ...prompt };
    
    // Apply optimization strategies
    for (const strategy of this.config.optimizationStrategies) {
      if (!strategy.enabled) continue;
      
      const optimizedPrompt = await this.applyOptimizationStrategy(
        strategy,
        currentPrompt,
        performanceData
      );
      
      if (optimizedPrompt) {
        const changes = this.identifyPromptChanges(currentPrompt, optimizedPrompt);
        const impact = await this.calculateStrategyImpact(changes, performanceData);
        
        appliedStrategies.push({
          strategy: strategy.name,
          changes,
          impact,
          confidence: this.calculateStrategyConfidence(strategy, impact)
        });
        
        currentPrompt = optimizedPrompt;
      }
    }

    const improvements = await this.calculateImprovements(prompt, currentPrompt, performanceData);
    const confidence = this.calculateOptimizationConfidence(appliedStrategies, improvements);
    const recommendations = this.generateOptimizationRecommendations(appliedStrategies, improvements);

    const result: PromptOptimizationResult = {
      originalPrompt: prompt,
      optimizedPrompt: currentPrompt,
      appliedStrategies,
      improvements,
      confidence,
      recommendations,
      optimizedAt: new Date()
    };

    // Cache result
    this.optimizationCache.set(cacheKey, result);

    return result;
  }

  /**
   * Start A/B testing for prompt variants
   */
  async startABTest(
    testId: string,
    controlPrompt: PromptTemplate,
    testPrompts: PromptTemplate[],
    config?: Partial<ABTestingConfig>
  ): Promise<string> {
    const testConfig = { ...this.config.abTestingConfig, ...config };
    
    const variants: ABTestVariant[] = [
      {
        id: 'control',
        name: 'Control (Original)',
        prompt: controlPrompt,
        traffic: 1 - testConfig.trafficSplit,
        performance: this.createEmptyPerformance()
      }
    ];

    // Add test variants
    testPrompts.forEach((prompt, index) => {
      variants.push({
        id: `test_${index}`,
        name: `Test Variant ${index + 1}`,
        prompt,
        traffic: testConfig.trafficSplit / testPrompts.length,
        performance: this.createEmptyPerformance()
      });
    });

    const abTest: ABTestResult = {
      testId,
      variants,
      confidence: 0,
      significance: 0,
      sampleSize: 0,
      testDuration: 0,
      metrics: []
    };

    this.activeTests.set(testId, abTest);

    // Schedule test completion
    setTimeout(() => {
      this.completeABTest(testId);
    }, testConfig.testDuration);

    return testId;
  }

  /**
   * Record performance metrics for a prompt
   */
  async recordPerformance(
    promptId: string,
    metrics: PromptMetrics,
    testId?: string
  ): Promise<void> {
    // Store in performance history
    if (!this.performanceHistory.has(promptId)) {
      this.performanceHistory.set(promptId, []);
    }
    this.performanceHistory.get(promptId)!.push(metrics);

    // Update A/B test metrics if applicable
    if (testId && this.activeTests.has(testId)) {
      const test = this.activeTests.get(testId)!;
      const variant = test.variants.find(v => v.id === promptId);
      
      if (variant) {
        this.updateVariantPerformance(variant, metrics);
        test.sampleSize++;
        
        // Check if test should be completed early
        if (this.shouldCompleteTestEarly(test)) {
          this.completeABTest(testId);
        }
      }
    }

    // Trigger auto-optimization if enabled
    if (this.config.enableAutoOptimization) {
      await this.checkAutoOptimizationTriggers(promptId, metrics);
    }
  }

  /**
   * Get optimization recommendations for a prompt
   */
  async getOptimizationRecommendations(
    promptId: string,
    prompt: PromptTemplate
  ): Promise<OptimizationRecommendation[]> {
    const performanceData = this.performanceHistory.get(promptId) || [];
    const currentMetrics = this.calculateAverageMetrics(performanceData);
    
    const recommendations: OptimizationRecommendation[] = [];

    // Check against performance thresholds
    if (currentMetrics.qualityScore < this.config.performanceThresholds.minQualityScore) {
      recommendations.push({
        category: 'effectiveness',
        priority: 'high',
        description: 'Quality score below threshold',
        action: 'Improve prompt clarity and specificity',
        expectedImpact: `Increase quality score by ${((this.config.optimizationTargets.targetQualityScore - currentMetrics.qualityScore) * 100).toFixed(1)}%`,
        effort: 'medium'
      });
    }

    if (currentMetrics.responseTime > this.config.performanceThresholds.maxResponseTime) {
      recommendations.push({
        category: 'performance',
        priority: 'medium',
        description: 'Response time above threshold',
        action: 'Reduce prompt complexity and token usage',
        expectedImpact: `Reduce response time by ${((currentMetrics.responseTime - this.config.optimizationTargets.targetResponseTime) / 1000).toFixed(1)}s`,
        effort: 'low'
      });
    }

    if (currentMetrics.tokenUsage > this.config.performanceThresholds.maxTokenUsage) {
      recommendations.push({
        category: 'cost',
        priority: 'medium',
        description: 'Token usage above threshold',
        action: 'Optimize prompt length while preserving functionality',
        expectedImpact: `Reduce token usage by ${currentMetrics.tokenUsage - this.config.optimizationTargets.targetTokenEfficiency * this.config.performanceThresholds.maxTokenUsage} tokens`,
        effort: 'low'
      });
    }

    // Add strategy-specific recommendations
    await Promise.all(
      this.config.optimizationStrategies.map(async strategy => {
        if (strategy.enabled) {
          const strategyRecommendations = await this.getStrategyRecommendations(
            strategy,
            prompt,
            currentMetrics
          );
          recommendations.push(...strategyRecommendations);
        }
      })
    );

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Get A/B test results
   */
  getABTestResults(testId: string): ABTestResult | null {
    return this.activeTests.get(testId) || null;
  }

  /**
   * Apply specific optimization strategy
   */
  private async applyOptimizationStrategy(
    strategy: OptimizationStrategy,
    prompt: PromptTemplate,
    performanceData?: PromptMetrics[]
  ): Promise<PromptTemplate | null> {
    switch (strategy.name) {
      case 'clarity_enhancement':
        return await this.enhanceClarity(prompt, strategy.config);
        
      case 'token_reduction':
        return await this.reduceTokens(prompt, strategy.config);
        
      case 'specificity_improvement':
        return await this.improveSpecificity(prompt, strategy.config);
        
      case 'context_optimization':
        return await this.optimizeContext(prompt, strategy.config);
        
      case 'parameter_tuning':
        return await this.tuneParameters(prompt, strategy.config, performanceData);
        
      case 'structure_refinement':
        return await this.refineStructure(prompt, strategy.config);
        
      default:
        console.warn(`Unknown optimization strategy: ${strategy.name}`);
        return null;
    }
  }

  /**
   * Enhance prompt clarity
   */
  private async enhanceClarity(
    prompt: PromptTemplate,
    config: any = {}
  ): Promise<PromptTemplate> {
    const enhancedPrompt = { ...prompt };
    
    // Enhance instructions clarity
    if (config.focusAreas?.includes('instructions') && enhancedPrompt.content.includes('{{instruction}}')) {
      const clearer = this.makeClearer(enhancedPrompt.content);
      enhancedPrompt.content = clearer;
    }

    // Add specific examples if missing
    if (config.focusAreas?.includes('examples') && !enhancedPrompt.content.includes('Contoh:')) {
      enhancedPrompt.content += '\n\nContoh:\n{{examples}}';
    }

    // Add output format specification
    if (!enhancedPrompt.content.includes('Format output')) {
      enhancedPrompt.content += '\n\nFormat output: Berikan respons yang terstruktur dan jelas.';
    }

    return enhancedPrompt;
  }

  /**
   * Reduce token usage
   */
  private async reduceTokens(
    prompt: PromptTemplate,
    config: any = {}
  ): Promise<PromptTemplate> {
    const optimizedPrompt = { ...prompt };
    const targetReduction = config.targetReduction || 0.15;
    
    // Remove redundant phrases
    let content = optimizedPrompt.content;
    const redundantPhrases = [
      'mohon untuk ',
      'silakan ',
      'tolong ',
      'dengan sangat ',
      'yang sangat '
    ];
    
    redundantPhrases.forEach(phrase => {
      content = content.replace(new RegExp(phrase, 'gi'), '');
    });

    // Condense repetitive instructions
    content = content.replace(/\n\n+/g, '\n\n'); // Remove excessive line breaks
    content = content.replace(/\s{2,}/g, ' '); // Remove excessive spaces

    // Shorten while preserving meaning
    if (config.preserveQuality) {
      const originalLength = optimizedPrompt.content.length;
      const targetLength = originalLength * (1 - targetReduction);
      
      if (content.length > targetLength) {
        content = this.intelligentTruncate(content, targetLength);
      }
    }

    optimizedPrompt.content = content;
    return optimizedPrompt;
  }

  /**
   * Improve prompt specificity
   */
  private async improveSpecificity(
    prompt: PromptTemplate,
    config: any = {}
  ): Promise<PromptTemplate> {
    const specificPrompt = { ...prompt };
    
    if (config.addConstraints) {
      // Add specific constraints
      if (!specificPrompt.content.includes('Batasan:')) {
        specificPrompt.content += '\n\nBatasan:\n- Gunakan bahasa formal akademis\n- Sertakan referensi yang relevan\n- Maksimal 500 kata per bagian';
      }
    }

    if (config.clarifyExpectations) {
      // Add clear expectations
      if (!specificPrompt.content.includes('Ekspektasi:')) {
        specificPrompt.content += '\n\nEkspektasi:\n- Analisis mendalam dan komprehensif\n- Argumentasi yang didukung data\n- Kesimpulan yang logis';
      }
    }

    return specificPrompt;
  }

  /**
   * Optimize context usage
   */
  private async optimizeContext(
    prompt: PromptTemplate,
    config: any = {}
  ): Promise<PromptTemplate> {
    const optimizedPrompt = { ...prompt };
    
    // Add context optimization instructions
    if (config.contextWindow && config.prioritizeRecent) {
      optimizedPrompt.content = `Konteks: Prioritaskan informasi terbaru dalam ${config.contextWindow} token terakhir.\n\n${optimizedPrompt.content}`;
    }

    return optimizedPrompt;
  }

  /**
   * Tune model parameters
   */
  private async tuneParameters(
    prompt: PromptTemplate,
    config: any = {},
    performanceData?: PromptMetrics[]
  ): Promise<PromptTemplate> {
    const tunedPrompt = { ...prompt };
    
    if (!tunedPrompt.parameters) {
      tunedPrompt.parameters = {};
    }

    // Tune temperature based on performance
    if (config.tuneTemperature && performanceData) {
      const avgCreativity = this.calculateAverageMetrics(performanceData).creativityScore;
      if (avgCreativity < 0.5) {
        tunedPrompt.parameters.temperature = Math.min(1.0, (tunedPrompt.parameters.temperature || 0.7) + 0.1);
      } else if (avgCreativity > 0.8) {
        tunedPrompt.parameters.temperature = Math.max(0.1, (tunedPrompt.parameters.temperature || 0.7) - 0.1);
      }
    }

    // Tune topP based on coherence
    if (config.tuneTopP && performanceData) {
      const avgCoherence = this.calculateAverageMetrics(performanceData).coherenceScore;
      if (avgCoherence < 0.7) {
        tunedPrompt.parameters.topP = Math.max(0.1, (tunedPrompt.parameters.topP || 0.9) - 0.1);
      }
    }

    return tunedPrompt;
  }

  /**
   * Refine prompt structure
   */
  private async refineStructure(
    prompt: PromptTemplate,
    config: any = {}
  ): Promise<PromptTemplate> {
    const refinedPrompt = { ...prompt };
    
    if (config.improveFlow) {
      // Add clear section dividers
      let content = refinedPrompt.content;
      
      if (!content.includes('## ')) {
        content = content.replace(/\n([A-Z][^:\n]*:)/g, '\n## $1');
      }
    }

    if (config.addSections) {
      // Ensure key sections exist
      const requiredSections = ['Instruksi', 'Konteks', 'Output'];
      requiredSections.forEach(section => {
        if (!refinedPrompt.content.includes(section)) {
          refinedPrompt.content = `## ${section}\n{{${section.toLowerCase()}}}\n\n${refinedPrompt.content}`;
        }
      });
    }

    return refinedPrompt;
  }

  /**
   * Helper methods
   */
  private identifyPromptChanges(
    original: PromptTemplate,
    modified: PromptTemplate
  ): PromptChange[] {
    const changes: PromptChange[] = [];
    
    // Compare content
    if (original.content !== modified.content) {
      changes.push({
        type: 'modification',
        section: 'instruction',
        original: original.content,
        modified: modified.content,
        reasoning: 'Content optimized for better performance'
      });
    }

    // Compare parameters
    const originalParams = original.parameters || {};
    const modifiedParams = modified.parameters || {};
    
    Object.keys({ ...originalParams, ...modifiedParams }).forEach(key => {
      if (originalParams[key] !== modifiedParams[key]) {
        changes.push({
          type: 'modification',
          section: 'parameters',
          original: String(originalParams[key] || 'undefined'),
          modified: String(modifiedParams[key] || 'undefined'),
          reasoning: `Parameter ${key} tuned for optimal performance`
        });
      }
    });

    return changes;
  }

  private async calculateStrategyImpact(
    changes: PromptChange[],
    performanceData?: PromptMetrics[]
  ): Promise<StrategyImpact> {
    // Simplified impact calculation - in real implementation would use ML models
    const baseImpact: StrategyImpact = {
      qualityImprovement: 0,
      tokenReduction: 0,
      timeImprovement: 0,
      costReduction: 0,
      satisfactionImprovement: 0
    };

    changes.forEach(change => {
      switch (change.section) {
        case 'instruction':
          baseImpact.qualityImprovement += 0.05;
          baseImpact.satisfactionImprovement += 0.03;
          break;
        case 'parameters':
          baseImpact.timeImprovement += 0.1;
          baseImpact.costReduction += 0.05;
          break;
      }
    });

    return baseImpact;
  }

  private calculateStrategyConfidence(
    strategy: OptimizationStrategy,
    impact: StrategyImpact
  ): number {
    // Calculate confidence based on strategy reliability and impact magnitude
    const baseConfidence = 0.7;
    const impactMagnitude = Math.max(
      impact.qualityImprovement,
      impact.tokenReduction,
      impact.timeImprovement,
      impact.costReduction,
      impact.satisfactionImprovement
    );
    
    return Math.min(1, baseConfidence + impactMagnitude);
  }

  private async calculateImprovements(
    original: PromptTemplate,
    optimized: PromptTemplate,
    performanceData?: PromptMetrics[]
  ): Promise<PerformanceImprovement[]> {
    const improvements: PerformanceImprovement[] = [];
    
    // Estimate token reduction
    const tokenReduction = Math.max(0, original.content.length - optimized.content.length);
    if (tokenReduction > 0) {
      improvements.push({
        metric: 'tokenUsage',
        originalValue: original.content.length * 0.75, // Rough token estimate
        optimizedValue: optimized.content.length * 0.75,
        improvement: tokenReduction * 0.75,
        improvementPercent: (tokenReduction / original.content.length) * 100
      });
    }

    return improvements;
  }

  private calculateOptimizationConfidence(
    strategies: AppliedStrategy[],
    improvements: PerformanceImprovement[]
  ): number {
    if (strategies.length === 0) return 0;
    
    const avgStrategyConfidence = strategies.reduce((sum, s) => sum + s.confidence, 0) / strategies.length;
    const improvementFactor = improvements.length > 0 ? 0.1 : 0;
    
    return Math.min(1, avgStrategyConfidence + improvementFactor);
  }

  private generateOptimizationRecommendations(
    strategies: AppliedStrategy[],
    improvements: PerformanceImprovement[]
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    
    // Add recommendations based on applied strategies
    strategies.forEach(strategy => {
      if (strategy.confidence > 0.7) {
        recommendations.push({
          category: 'effectiveness',
          priority: 'medium',
          description: `${strategy.strategy} showed positive impact`,
          action: `Continue applying ${strategy.strategy} optimizations`,
          expectedImpact: `Quality improvement: ${(strategy.impact.qualityImprovement * 100).toFixed(1)}%`,
          effort: 'low'
        });
      }
    });

    return recommendations;
  }

  private generatePromptCacheKey(prompt: PromptTemplate): string {
    return `${prompt.id}-${prompt.version}-${prompt.content.substring(0, 100)}`;
  }

  private createEmptyPerformance(): VariantPerformance {
    return {
      requests: 0,
      successRate: 0,
      avgQualityScore: 0,
      avgResponseTime: 0,
      avgTokenUsage: 0,
      avgCost: 0,
      userSatisfaction: 0
    };
  }

  private updateVariantPerformance(variant: ABTestVariant, metrics: PromptMetrics): void {
    const perf = variant.performance;
    const n = perf.requests;
    
    // Update running averages
    perf.avgQualityScore = (perf.avgQualityScore * n + metrics.qualityScore) / (n + 1);
    perf.avgResponseTime = (perf.avgResponseTime * n + metrics.responseTime) / (n + 1);
    perf.avgTokenUsage = (perf.avgTokenUsage * n + metrics.tokenUsage) / (n + 1);
    perf.avgCost = (perf.avgCost * n + metrics.costPerRequest) / (n + 1);
    perf.userSatisfaction = (perf.userSatisfaction * n + metrics.userSatisfaction) / (n + 1);
    perf.successRate = (perf.successRate * n + (1 - metrics.errorRate)) / (n + 1);
    
    perf.requests++;
  }

  private shouldCompleteTestEarly(test: ABTestResult): boolean {
    // Check if we have enough statistical power to conclude
    return test.sampleSize >= this.config.abTestingConfig.minSampleSize * 2;
  }

  private completeABTest(testId: string): void {
    const test = this.activeTests.get(testId);
    if (!test) return;

    // Calculate statistical significance and determine winner
    test.metrics = this.calculateABTestMetrics(test);
    test.winner = this.determineWinner(test);
    test.confidence = this.calculateTestConfidence(test);
    
    console.log(`A/B Test ${testId} completed. Winner: ${test.winner || 'No significant difference'}`);
  }

  private calculateABTestMetrics(test: ABTestResult): ABTestMetric[] {
    if (test.variants.length < 2) return [];
    
    const control = test.variants[0];
    const metrics: ABTestMetric[] = [];
    
    // Compare each test variant against control
    for (let i = 1; i < test.variants.length; i++) {
      const variant = test.variants[i];
      
      // Quality score comparison
      const qualityImprovement = variant.performance.avgQualityScore - control.performance.avgQualityScore;
      metrics.push({
        name: `qualityScore_variant${i}`,
        controlValue: control.performance.avgQualityScore,
        testValue: variant.performance.avgQualityScore,
        improvement: qualityImprovement,
        pValue: this.calculatePValue(
          control.performance.avgQualityScore,
          variant.performance.avgQualityScore,
          control.performance.requests,
          variant.performance.requests
        ),
        isSignificant: Math.abs(qualityImprovement) > 0.05
      });
    }
    
    return metrics;
  }

  private determineWinner(test: ABTestResult): string | undefined {
    const significantMetrics = test.metrics.filter(m => m.isSignificant && m.pValue < 0.05);
    
    if (significantMetrics.length === 0) return undefined;
    
    // Find variant with most positive improvements
    const variantScores = new Map<string, number>();
    
    significantMetrics.forEach(metric => {
      const variantId = metric.name.split('_')[1];
      const currentScore = variantScores.get(variantId) || 0;
      variantScores.set(variantId, currentScore + (metric.improvement > 0 ? 1 : -1));
    });
    
    let bestVariant = 'control';
    let bestScore = 0;
    
    variantScores.forEach((score, variant) => {
      if (score > bestScore) {
        bestScore = score;
        bestVariant = variant;
      }
    });
    
    return bestScore > 0 ? bestVariant : undefined;
  }

  private calculateTestConfidence(test: ABTestResult): number {
    const significantMetrics = test.metrics.filter(m => m.isSignificant);
    return significantMetrics.length / test.metrics.length;
  }

  private calculatePValue(
    controlMean: number,
    testMean: number,
    controlN: number,
    testN: number
  ): number {
    // Simplified p-value calculation - in real implementation would use proper statistical tests
    if (controlN < 30 || testN < 30) return 1; // Insufficient sample size
    
    const pooledStd = 0.1; // Assumed standard deviation
    const standardError = pooledStd * Math.sqrt(1/controlN + 1/testN);
    const zScore = Math.abs(testMean - controlMean) / standardError;
    
    // Approximate p-value from z-score
    if (zScore > 2.58) return 0.01;
    if (zScore > 1.96) return 0.05;
    if (zScore > 1.65) return 0.1;
    
    return 0.2;
  }

  private calculateAverageMetrics(performanceData: PromptMetrics[]): PromptMetrics {
    if (performanceData.length === 0) {
      return {
        qualityScore: 0,
        relevanceScore: 0,
        coherenceScore: 0,
        creativityScore: 0,
        responseTime: 0,
        tokenUsage: 0,
        costPerRequest: 0,
        successRate: 0,
        userSatisfaction: 0,
        taskCompletion: 0,
        errorRate: 0
      };
    }

    const sums = performanceData.reduce((acc, metrics) => {
      Object.keys(metrics).forEach(key => {
        acc[key] = (acc[key] || 0) + (metrics as any)[key];
      });
      return acc;
    }, {} as any);

    const averages = {} as any;
    Object.keys(sums).forEach(key => {
      averages[key] = sums[key] / performanceData.length;
    });

    return averages;
  }

  private async checkAutoOptimizationTriggers(
    promptId: string,
    metrics: PromptMetrics
  ): Promise<void> {
    // Check if performance has degraded significantly
    const history = this.performanceHistory.get(promptId) || [];
    if (history.length < 10) return; // Need sufficient history
    
    const recentAvg = this.calculateAverageMetrics(history.slice(-5));
    const historicalAvg = this.calculateAverageMetrics(history.slice(0, -5));
    
    const qualityDrop = historicalAvg.qualityScore - recentAvg.qualityScore;
    
    if (qualityDrop > 0.1) {
      console.log(`Auto-optimization triggered for prompt ${promptId} due to quality drop`);
      // In real implementation, would trigger automatic re-optimization
    }
  }

  private async getStrategyRecommendations(
    strategy: OptimizationStrategy,
    prompt: PromptTemplate,
    metrics: PromptMetrics
  ): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];
    
    switch (strategy.name) {
      case 'clarity_enhancement':
        if (metrics.coherenceScore < 0.7) {
          recommendations.push({
            category: 'clarity',
            priority: 'high',
            description: 'Improve prompt clarity and coherence',
            action: 'Add more specific instructions and examples',
            expectedImpact: 'Increase coherence score by 15-20%',
            effort: 'medium'
          });
        }
        break;
        
      case 'token_reduction':
        if (metrics.tokenUsage > this.config.performanceThresholds.maxTokenUsage) {
          recommendations.push({
            category: 'cost',
            priority: 'medium',
            description: 'Reduce token usage to improve cost efficiency',
            action: 'Remove redundant phrases and compress instructions',
            expectedImpact: `Save ${metrics.tokenUsage - this.config.performanceThresholds.maxTokenUsage} tokens per request`,
            effort: 'low'
          });
        }
        break;
    }
    
    return recommendations;
  }

  // Utility methods for text processing
  private makeClearer(text: string): string {
    // Add clarity improvements
    return text
      .replace(/silakan/gi, '')
      .replace(/mohon untuk/gi, '')
      .replace(/tolong/gi, '')
      .replace(/\b(sangat|amat|benar-benar)\s+/gi, '');
  }

  private intelligentTruncate(text: string, targetLength: number): string {
    if (text.length <= targetLength) return text;
    
    // Try to truncate at sentence boundaries
    const sentences = text.split(/[.!?]+/);
    let truncated = '';
    
    for (const sentence of sentences) {
      if ((truncated + sentence).length <= targetLength) {
        truncated += sentence + '.';
      } else {
        break;
      }
    }
    
    return truncated || text.substring(0, targetLength);
  }
}

/**
 * Prompt Tuning Middleware for AI SDK
 */
export function createPromptTuningMiddleware(
  config: Partial<PromptTuningConfig> = {}
): LanguageModelV2Middleware {
  const tuner = new PromptTunerService(config);

  return {
    wrapGenerate: async ({ doGenerate, params }) => {
      const startTime = Date.now();
      const result = await doGenerate();
      const endTime = Date.now();

      // Record performance metrics
      const metrics: PromptMetrics = {
        qualityScore: 0.8, // Would be calculated from actual response
        relevanceScore: 0.8,
        coherenceScore: 0.8,
        creativityScore: 0.7,
        responseTime: endTime - startTime,
        tokenUsage: result.usage?.totalTokens || 0,
        costPerRequest: (result.usage?.totalTokens || 0) * 0.00001, // Rough estimate
        successRate: result.text ? 1 : 0,
        userSatisfaction: 0.8,
        taskCompletion: 1,
        errorRate: 0
      };

      // Record metrics for optimization
      const promptId = params.providerMetadata?.promptId as string;
      if (promptId) {
        await tuner.recordPerformance(promptId, metrics);
      }

      return {
        ...result,
        experimental: {
          ...result.experimental,
          promptMetrics: metrics
        }
      };
    }
  };
}

export default PromptTunerService;