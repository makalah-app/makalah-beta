/**
 * Core AI SDK TypeScript Type Definitions
 * Central type definitions for the AI SDK implementation
 * 
 * Based on Vercel AI SDK v5 Core patterns from:
 * - /documentation/docs/03-ai-sdk-core/01-overview.mdx
 * - /documentation/docs/reference/ai-sdk-core/index.mdx
 */

import type {
  LanguageModelV2,
  LanguageModelV2Middleware,
  LanguageModelV2StreamPart,
} from '@ai-sdk/provider';
import type {
  ModelMessage,
  GenerateTextResult,
  StreamTextResult,
  GenerateObjectResult,
  StreamObjectResult,
  ToolSet,
} from 'ai';
import type { z } from 'zod';

/**
 * Academic workflow phase types
 */
export type AcademicPhase = 
  | 'research_analysis'
  | 'outline_generation' 
  | 'content_drafting'
  | 'citation_integration'
  | 'structure_refinement'
  | 'quality_review'
  | 'final_formatting';

/**
 * Approval gate types for human-in-the-loop workflow
 */
export type ApprovalGate = 
  | 'outline_approval'
  | 'content_approval'
  | 'citation_approval'
  | 'final_approval';

/**
 * Provider names for AI services
 */
export type ProviderName = 'openrouter' | 'openai';

/**
 * Provider health status
 */
export type ProviderHealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Provider selection strategies
 */
export type ProviderStrategy = 
  | 'primary-first'
  | 'health-based'
  | 'round-robin'
  | 'fallback-only';

/**
 * Academic citation styles
 */
export type CitationStyle = 'APA' | 'MLA' | 'Chicago' | 'Harvard';

/**
 * Academic levels
 */
export type AcademicLevel = 'undergraduate' | 'graduate' | 'doctoral';

/**
 * Document types
 */
export type DocumentType = 
  | 'research_paper'
  | 'thesis'
  | 'dissertation'
  | 'report'
  | 'essay';

/**
 * Enhanced model message with academic context
 */
export interface AcademicModelMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | Array<{ type: string; text?: string; [key: string]: any }>;
  metadata?: {
    phase?: AcademicPhase;
    workflowId?: string;
    userId?: string;
    timestamp?: Date;
    academicContext?: AcademicContext;
  };
}

/**
 * Academic context for AI operations
 */
export interface AcademicContext {
  citationStyle: CitationStyle;
  disciplineArea: string;
  academicLevel: AcademicLevel;
  documentType: DocumentType;
  researchFocus?: string;
  targetAudience?: string;
  requirements?: {
    wordCount?: { min: number; max: number };
    sectionCount?: number;
    citationCount?: { min: number; max: number };
    originalityThreshold?: number;
  };
}

/**
 * AI provider configuration interface
 */
export interface AIProviderConfig {
  name: ProviderName;
  displayName: string;
  apiKey: string;
  baseURL: string;
  model: string;
  maxTokens: number;
  temperature: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  timeout?: number;
  retryAttempts?: number;
  enabled: boolean;
  healthCheckEndpoint?: string;
  metadata?: Record<string, any>;
}

/**
 * Provider health check result
 */
export interface ProviderHealthResult {
  provider: ProviderName;
  status: ProviderHealthStatus;
  responseTimeMs: number;
  timestamp: Date;
  error?: string;
  metadata?: {
    availableModels?: string[];
    lastSuccess?: Date;
    errorCount?: number;
  };
}

/**
 * Provider selection result
 */
export interface ProviderSelectionResult {
  provider: LanguageModelV2;
  providerName: ProviderName;
  model: string;
  config: AIProviderConfig;
  isHealthy: boolean;
  responseTimeMs: number;
  selectionReason: string;
}

/**
 * Academic streaming configuration
 */
export interface AcademicStreamingConfig {
  phase?: AcademicPhase;
  enableApprovalGates?: boolean;
  enableReasoning?: boolean;
  maxSteps?: number;
  temperature?: number;
  maxTokens?: number;
  tools?: ToolSet;
  providerStrategy?: ProviderStrategy;
  academicContext?: AcademicContext;
  qualityThreshold?: number;
  timeout?: number;
}

/**
 * Enhanced generate text result with academic metadata
 */
export interface AcademicGenerateTextResult {
  text: string;
  finishReason: 'stop' | 'length' | 'content-filter' | 'tool-calls' | 'error' | 'other' | 'unknown';
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata: {
    provider: ProviderName;
    model: string;
    phase?: AcademicPhase;
    academicContext?: AcademicContext;
    qualityMetrics?: QualityMetrics;
    duration: number;
  };
}

/**
 * Enhanced stream text result with academic metadata
 */
export interface AcademicStreamTextResult {
  textStream: ReadableStream<string>;
  text: Promise<string>;
  usage: Promise<{
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }>;
  metadata: {
    provider: ProviderName;
    model: string;
    phase?: AcademicPhase;
    academicContext?: AcademicContext;
    config: AcademicStreamingConfig;
  };
}

/**
 * Quality metrics for academic content
 */
export interface QualityMetrics {
  readabilityScore: number;        // 0-100
  academicTone: number;           // 0-100
  argumentStrength: number;       // 0-100
  citationQuality: number;        // 0-100
  originalityScore?: number;      // 0-100
  coherence: number;              // 0-100
  completeness: number;           // 0-100
  grammarScore: number;           // 0-100
  stylistics: {
    wordCount: number;
    sentenceCount: number;
    paragraphCount: number;
    averageWordsPerSentence: number;
    averageSentencesPerParagraph: number;
  };
}

/**
 * Workflow state interface
 */
export interface WorkflowState {
  workflowId: string;
  currentPhase: AcademicPhase;
  completedPhases: AcademicPhase[];
  pendingApproval?: ApprovalGate;
  approvalHistory: ApprovalRecord[];
  phaseOutputs: Record<AcademicPhase, any>;
  metadata: {
    userId?: string;
    connectionId: string;
    academicContext: AcademicContext;
    startedAt: Date;
    updatedAt: Date;
    totalDuration?: number;
    qualityMetrics?: QualityMetrics;
  };
  config: WorkflowConfiguration;
}

/**
 * Workflow configuration
 */
export interface WorkflowConfiguration {
  enableApprovalGates: boolean;
  autoAdvancePhases: boolean;
  qualityThreshold: number;
  maxRetries: number;
  timeout: number;
  customPhases?: AcademicPhase[];
  skipPhases?: AcademicPhase[];
  phaseConfigs?: Record<AcademicPhase, AcademicStreamingConfig>;
  notificationSettings?: {
    email?: boolean;
    webhook?: string;
    realtime?: boolean;
  };
}

/**
 * Approval record for audit trail
 */
export interface ApprovalRecord {
  gate: ApprovalGate;
  action: 'approve' | 'reject' | 'modify';
  timestamp: Date;
  userId?: string;
  feedback?: string;
  modifications?: string[];
  durationMs: number;
}

/**
 * SSE event types for academic workflow
 */
export interface AcademicSSEEvent {
  type: 'start' | 'text-delta' | 'text-end' | 'tool-call' | 'tool-result' 
       | 'phase-transition' | 'error' | 'done' | 'ping';
  id?: string;
  data: any;
  timestamp: number;
  retry?: number;
  metadata?: {
    provider?: ProviderName;
    phase?: AcademicPhase;
    workflowId?: string;
    userId?: string;
  };
}

/**
 * Tool execution context with academic information
 */
export interface AcademicToolContext {
  toolCallId: string;
  workflowId?: string;
  userId?: string;
  sessionId?: string;
  phase?: AcademicPhase;
  stepNumber?: number;
  academicContext?: AcademicContext;
  messages?: AcademicModelMessage[];
  abortSignal?: AbortSignal;
  metadata?: Record<string, any>;
}

/**
 * Tool execution result with academic metadata
 */
export interface AcademicToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    retryable: boolean;
  };
  metadata: {
    executionTime: number;
    provider?: ProviderName;
    tokensUsed?: number;
    cacheHit?: boolean;
    qualityScore?: number;
    confidence?: number;
    citations?: Citation[];
  };
  warnings?: string[];
  recommendations?: string[];
}

/**
 * Citation interface for academic references
 */
export interface Citation {
  id: string;
  type: 'journal' | 'book' | 'website' | 'conference' | 'report' | 'thesis';
  title: string;
  authors: string[];
  publicationDate: string;
  publisher?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  url?: string;
  doi?: string;
  isbn?: string;
  location?: string;
  accessDate?: string;
  language?: string;
  abstract?: string;
  keywords?: string[];
  citationStyle?: CitationStyle;
  formattedCitation?: string;
  inTextCitation?: string;
}

/**
 * Research source interface
 */
export interface ResearchSource {
  id: string;
  title: string;
  authors: string[];
  abstract?: string;
  url?: string;
  doi?: string;
  publishedDate?: string;
  source: 'academic' | 'web' | 'book' | 'report';
  relevanceScore: number;
  citationCount?: number;
  keywords?: string[];
  methodology?: string;
  findings?: string[];
  quality: 'high' | 'medium' | 'low';
  credibility: 'peer_reviewed' | 'authoritative' | 'general';
}

/**
 * Content analysis result
 */
export interface ContentAnalysis {
  themes: Array<{
    name: string;
    frequency: number;
    relevance: number;
    examples: string[];
  }>;
  sentiment: {
    overall: 'positive' | 'neutral' | 'negative';
    confidence: number;
    aspects: Array<{
      aspect: string;
      sentiment: 'positive' | 'neutral' | 'negative';
      confidence: number;
    }>;
  };
  structure: {
    sections: number;
    paragraphs: number;
    averageWordsPerParagraph: number;
    headingHierarchy: string[];
  };
  linguistics: {
    complexity: 'simple' | 'moderate' | 'complex';
    readabilityGrade: number;
    vocabulary: {
      uniqueWords: number;
      academicTerms: number;
      technicalTerms: number;
    };
  };
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  requestsPerMinute: number;
  tokensPerMinute: number;
  burstSize: number;
  windowSizeMs: number;
  keyPrefix: string;
  enabled: boolean;
}

/**
 * Rate limiting state
 */
export interface RateLimitState {
  key: string;
  requests: number;
  tokens: number;
  windowStart: number;
  resetTime: number;
  isBlocked: boolean;
}

/**
 * AI SDK middleware configuration
 */
export interface AIMiddlewareConfig {
  rateLimiting?: RateLimitConfig;
  logging?: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
    logRequests: boolean;
    logResponses: boolean;
    logErrors: boolean;
  };
  monitoring?: {
    enabled: boolean;
    metricsEndpoint?: string;
    healthCheckInterval: number;
  };
  security?: {
    validateInputs: boolean;
    sanitizeOutputs: boolean;
    maskSensitiveData: boolean;
  };
}

/**
 * Performance metrics for AI operations
 */
export interface AIPerformanceMetrics {
  requestCount: number;
  successCount: number;
  errorCount: number;
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  tokensPerSecond: number;
  totalTokensUsed: number;
  providerDistribution: Record<ProviderName, number>;
  phaseDistribution: Record<AcademicPhase, number>;
  errorsByType: Record<string, number>;
}

/**
 * Academic workflow event data
 */
export interface AcademicWorkflowEventData {
  phase_started: {
    phase: AcademicPhase;
    description: string;
    expectedOutputs: string[];
    estimatedDuration?: number;
  };
  
  phase_completed: {
    phase: AcademicPhase;
    outputs: any[];
    qualityMetrics?: QualityMetrics;
    nextPhase?: AcademicPhase;
  };

  approval_required: {
    gate: ApprovalGate;
    content: string;
    reason: string;
    options: Array<{
      action: 'approve' | 'reject' | 'modify';
      label: string;
      description: string;
    }>;
    timeout?: number;
  };

  content_generated: {
    phase: AcademicPhase;
    content: string;
    wordCount: number;
    qualityMetrics: QualityMetrics;
  };

  citations_added: {
    count: number;
    style: CitationStyle;
    sources: Citation[];
  };

  quality_issue_detected: {
    type: 'grammar' | 'style' | 'citation' | 'structure' | 'argument';
    severity: 'low' | 'medium' | 'high';
    location: string;
    description: string;
    suggestion?: string;
  };
}

/**
 * Export utility types
 */
export type AcademicEventType = keyof AcademicWorkflowEventData;

/**
 * Type guards for runtime type checking
 */
export const TypeGuards = {
  isAcademicPhase: (value: any): value is AcademicPhase => {
    const phases: AcademicPhase[] = [
      'research_analysis',
      'outline_generation',
      'content_drafting',
      'citation_integration',
      'structure_refinement',
      'quality_review',
      'final_formatting'
    ];
    return phases.includes(value);
  },

  isApprovalGate: (value: any): value is ApprovalGate => {
    const gates: ApprovalGate[] = [
      'outline_approval',
      'content_approval',
      'citation_approval',
      'final_approval'
    ];
    return gates.includes(value);
  },

  isProviderName: (value: any): value is ProviderName => {
    return value === 'openrouter' || value === 'openai';
  },

  isCitationStyle: (value: any): value is CitationStyle => {
    const styles: CitationStyle[] = ['APA', 'MLA', 'Chicago', 'Harvard'];
    return styles.includes(value);
  },

  isProviderHealthStatus: (value: any): value is ProviderHealthStatus => {
    return value === 'healthy' || value === 'degraded' || value === 'unhealthy';
  }
};

/**
 * Utility types for advanced TypeScript patterns
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Required<T, K extends keyof T> = T & {
  [P in K]-?: T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & {
  [P in K]?: T[P];
};

export type NonEmptyArray<T> = [T, ...T[]];

export type ValueOf<T> = T[keyof T];

export type AsyncReturnType<T extends (...args: any) => Promise<any>> = T extends (...args: any) => Promise<infer R> ? R : any;

/**
 * Error types for the AI SDK implementation
 */
export class AcademicAIError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider?: ProviderName,
    public phase?: AcademicPhase,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'AcademicAIError';
  }
}

export class ProviderError extends AcademicAIError {
  constructor(message: string, provider: ProviderName, retryable: boolean = true) {
    super(message, 'PROVIDER_ERROR', provider, undefined, retryable);
    this.name = 'ProviderError';
  }
}

export class WorkflowError extends AcademicAIError {
  constructor(message: string, phase: AcademicPhase, retryable: boolean = false) {
    super(message, 'WORKFLOW_ERROR', undefined, phase, retryable);
    this.name = 'WorkflowError';
  }
}

export class ValidationError extends AcademicAIError {
  constructor(message: string, field: string) {
    super(`Validation failed for ${field}: ${message}`, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}
