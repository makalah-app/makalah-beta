/**
 * System-wide Type Definitions for Academic AI Platform
 * 
 * Comprehensive TypeScript type definitions that provide type safety
 * across all components of the academic AI system.
 * 
 * Features:
 * - Complete type coverage for all system components
 * - Strict type safety and validation
 * - Extensible interfaces for future development
 * - Integration with Vercel AI SDK types
 * - Academic domain-specific types
 * 
 * @module SystemTypes
 * @version 1.0.0
 */

import { CoreMessage, StreamTextResult } from 'ai';
import { AcademicPhase } from '../types';

/**
 * Base system entity
 */
export interface SystemEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  version: string;
}

/**
 * User role types
 */
export type UserRole = 
  | 'student'
  | 'researcher' 
  | 'faculty'
  | 'admin'
  | 'guest';

/**
 * User profile
 */
export interface UserProfile extends SystemEntity {
  email: string;
  name: string;
  role: UserRole;
  institution?: string;
  department?: string;
  researchArea?: string[];
  preferences: UserPreferences;
  subscription: SubscriptionInfo;
  permissions: Permission[];
  metadata: Record<string, unknown>;
}

/**
 * User preferences
 */
export interface UserPreferences {
  language: 'id' | 'en';
  theme: 'light' | 'dark' | 'system';
  notifications: NotificationPreferences;
  ai: AiPreferences;
  accessibility: AccessibilityOptions;
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
  phases: Record<AcademicPhase, boolean>;
  reminders: boolean;
  updates: boolean;
}

/**
 * AI-specific user preferences
 */
export interface AiPreferences {
  preferredPersona: string;
  temperature: number;
  maxTokens: number;
  citationStyle: 'apa' | 'mla' | 'chicago' | 'harvard';
  formalityLevel: 'low' | 'medium' | 'high' | 'very-high';
  autoApproval: Record<AcademicPhase, boolean>;
  qualityThreshold: number;
}

/**
 * Accessibility options
 */
export interface AccessibilityOptions {
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  reducedMotion: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
}

/**
 * Subscription information
 */
export interface SubscriptionInfo {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: Date;
  endDate?: Date;
  usage: UsageInfo;
  limits: UsageLimits;
}

/**
 * Subscription plans
 */
export type SubscriptionPlan = 
  | 'free'
  | 'basic'
  | 'premium'
  | 'institutional'
  | 'enterprise';

/**
 * Subscription status
 */
export type SubscriptionStatus = 
  | 'active'
  | 'cancelled'
  | 'expired'
  | 'suspended'
  | 'trial';

/**
 * Usage information
 */
export interface UsageInfo {
  tokensUsed: number;
  requestsUsed: number;
  documentsCreated: number;
  storageUsed: number;
  period: {
    start: Date;
    end: Date;
  };
}

/**
 * Usage limits
 */
export interface UsageLimits {
  tokensPerMonth: number;
  requestsPerMonth: number;
  documentsPerMonth: number;
  storageLimit: number;
  concurrentSessions: number;
  maxDocumentSize: number;
}

/**
 * Permission types
 */
export type Permission = 
  | 'read:documents'
  | 'write:documents'
  | 'delete:documents'
  | 'share:documents'
  | 'admin:users'
  | 'admin:system'
  | 'ai:access'
  | 'ai:advanced';

/**
 * Document entity
 */
export interface Document extends SystemEntity {
  title: string;
  description?: string;
  type: DocumentType;
  status: DocumentStatus;
  content: DocumentContent;
  metadata: DocumentMetadata;
  sharing: SharingSettings;
  workflow: WorkflowState;
  analytics: DocumentAnalytics;
  tags: string[];
  userId: string;
}

/**
 * Document types
 */
export type DocumentType = 
  | 'research-paper'
  | 'thesis'
  | 'dissertation'
  | 'essay'
  | 'report'
  | 'proposal'
  | 'review'
  | 'other';

/**
 * Document status
 */
export type DocumentStatus = 
  | 'draft'
  | 'in-progress'
  | 'review'
  | 'completed'
  | 'published'
  | 'archived';

/**
 * Document content structure
 */
export interface DocumentContent {
  abstract?: string;
  sections: DocumentSection[];
  bibliography: BibliographyEntry[];
  appendices?: DocumentSection[];
  metadata: ContentMetadata;
}

/**
 * Document section
 */
export interface DocumentSection {
  id: string;
  title: string;
  content: string;
  type: SectionType;
  order: number;
  parentId?: string;
  children?: string[];
  metadata: SectionMetadata;
}

/**
 * Section types
 */
export type SectionType = 
  | 'title'
  | 'abstract'
  | 'introduction'
  | 'literature-review'
  | 'methodology'
  | 'results'
  | 'discussion'
  | 'conclusion'
  | 'references'
  | 'appendix'
  | 'custom';

/**
 * Section metadata
 */
export interface SectionMetadata {
  wordCount: number;
  citationCount: number;
  lastModified: Date;
  phase: AcademicPhase;
  persona: string;
  qualityScore?: number;
  aiGenerated: boolean;
  humanEdited: boolean;
}

/**
 * Content metadata
 */
export interface ContentMetadata {
  wordCount: number;
  pageCount: number;
  citationCount: number;
  language: 'id' | 'en';
  readabilityScore: number;
  academicLevel: 'undergraduate' | 'graduate' | 'doctoral' | 'postdoc';
  discipline: string;
  keywords: string[];
}

/**
 * Bibliography entry
 */
export interface BibliographyEntry {
  id: string;
  type: CitationType;
  authors: Author[];
  title: string;
  publication?: string;
  year: number;
  pages?: string;
  volume?: string;
  issue?: string;
  doi?: string;
  url?: string;
  accessDate?: Date;
  notes?: string;
}

/**
 * Citation types
 */
export type CitationType = 
  | 'journal-article'
  | 'book'
  | 'book-chapter'
  | 'conference-paper'
  | 'thesis'
  | 'website'
  | 'report'
  | 'newspaper'
  | 'other';

/**
 * Author information
 */
export interface Author {
  firstName: string;
  lastName: string;
  middleNames?: string[];
  suffix?: string;
  affiliation?: string;
  orcid?: string;
}

/**
 * Document metadata
 */
export interface DocumentMetadata {
  subject: string;
  keywords: string[];
  language: 'id' | 'en';
  discipline: string;
  institution?: string;
  supervisor?: string;
  committee?: string[];
  fundingSource?: string;
  ethicsApproval?: string;
  conflictOfInterest?: string;
}

/**
 * Sharing settings
 */
export interface SharingSettings {
  isPublic: boolean;
  collaborators: Collaborator[];
  permissions: SharingPermission[];
  linkSharing: LinkSharing;
  accessControls: AccessControl[];
}

/**
 * Collaborator information
 */
export interface Collaborator {
  userId: string;
  role: CollaboratorRole;
  permissions: Permission[];
  invitedAt: Date;
  acceptedAt?: Date;
  lastAccess?: Date;
}

/**
 * Collaborator roles
 */
export type CollaboratorRole = 
  | 'owner'
  | 'editor'
  | 'reviewer'
  | 'commenter'
  | 'viewer';

/**
 * Sharing permissions
 */
export interface SharingPermission {
  userId: string;
  permissions: Permission[];
  grantedAt: Date;
  grantedBy: string;
  expiresAt?: Date;
}

/**
 * Link sharing settings
 */
export interface LinkSharing {
  enabled: boolean;
  token?: string;
  permissions: Permission[];
  expiresAt?: Date;
  requiresAuth: boolean;
}

/**
 * Access control
 */
export interface AccessControl {
  type: 'ip' | 'domain' | 'user' | 'group';
  value: string;
  action: 'allow' | 'deny';
  priority: number;
}

/**
 * Document analytics
 */
export interface DocumentAnalytics {
  views: number;
  uniqueVisitors: number;
  lastViewed: Date;
  timeSpent: number;
  editHistory: EditHistory[];
  aiInteractions: AiInteraction[];
  qualityMetrics: QualityMetrics;
  performanceMetrics: PerformanceMetrics;
}

/**
 * Edit history
 */
export interface EditHistory {
  id: string;
  timestamp: Date;
  userId: string;
  action: EditAction;
  sectionId?: string;
  changes: ContentChange[];
  metadata: EditMetadata;
}

/**
 * Edit actions
 */
export type EditAction = 
  | 'create'
  | 'update'
  | 'delete'
  | 'move'
  | 'ai-generate'
  | 'ai-edit'
  | 'merge'
  | 'split';

/**
 * Content changes
 */
export interface ContentChange {
  type: 'text' | 'structure' | 'metadata' | 'citation';
  before?: string;
  after?: string;
  position?: number;
  length?: number;
}

/**
 * Edit metadata
 */
export interface EditMetadata {
  aiAssisted: boolean;
  persona?: string;
  phase?: AcademicPhase;
  confidence?: number;
  userApproved: boolean;
  comment?: string;
}

/**
 * Workflow state
 */
export interface WorkflowState {
  currentPhase: AcademicPhase;
  completedPhases: AcademicPhase[];
  phaseHistory: PhaseTransition[];
  approvalGates: ApprovalGate[];
  blockers: WorkflowBlocker[];
  estimatedCompletion?: Date;
}

/**
 * Phase transition
 */
export interface PhaseTransition {
  from: AcademicPhase;
  to: AcademicPhase;
  timestamp: Date;
  userId: string;
  automatic: boolean;
  reason?: string;
  validationResults: ValidationResult[];
}

/**
 * Approval gate
 */
export interface ApprovalGate {
  phase: AcademicPhase;
  required: boolean;
  status: ApprovalStatus;
  approvers: string[];
  approvedBy?: string;
  approvedAt?: Date;
  comments?: string;
  conditions: ApprovalCondition[];
}

/**
 * Approval status
 */
export type ApprovalStatus = 
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'timeout'
  | 'skipped';

/**
 * Approval condition
 */
export interface ApprovalCondition {
  type: 'quality-score' | 'word-count' | 'citation-count' | 'custom';
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
  value: number | string;
  description: string;
}

/**
 * Workflow blocker
 */
export interface WorkflowBlocker {
  id: string;
  type: BlockerType;
  phase: AcademicPhase;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  resolution?: string;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

/**
 * Blocker types
 */
export type BlockerType = 
  | 'validation-failed'
  | 'quality-threshold'
  | 'citation-issues'
  | 'approval-required'
  | 'user-action-required'
  | 'system-error'
  | 'external-dependency';

/**
 * Validation result
 */
export interface ValidationResult {
  validator: string;
  passed: boolean;
  score?: number;
  issues: ValidationIssue[];
  recommendations: string[];
  timestamp: Date;
}

/**
 * Validation issue
 */
export interface ValidationIssue {
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  location?: {
    sectionId: string;
    position: number;
    length: number;
  };
  suggestion?: string;
}

/**
 * AI interaction record
 */
export interface AiInteraction {
  id: string;
  timestamp: Date;
  phase: AcademicPhase;
  persona: string;
  type: InteractionType;
  input: AiInput;
  output: AiOutput;
  metadata: InteractionMetadata;
  feedback?: UserFeedback;
}

/**
 * Interaction types
 */
export type InteractionType = 
  | 'generation'
  | 'editing'
  | 'review'
  | 'citation'
  | 'formatting'
  | 'translation'
  | 'summarization'
  | 'expansion'
  | 'validation';

/**
 * AI input data
 */
export interface AiInput {
  messages: CoreMessage[];
  context?: Record<string, unknown>;
  parameters: {
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
  };
  prompt: {
    templateId: string;
    variables: Record<string, unknown>;
  };
}

/**
 * AI output data
 */
export interface AiOutput {
  content: string;
  metadata: {
    model: string;
    provider: string;
    tokenCount: number;
    responseTime: number;
    finishReason: string;
  };
  quality: {
    score: number;
    dimensions: Record<string, number>;
    issues: string[];
  };
  citations?: CitationExtraction[];
}

/**
 * Citation extraction from AI output
 */
export interface CitationExtraction {
  text: string;
  position: number;
  confidence: number;
  verified: boolean;
  source?: BibliographyEntry;
  issues: string[];
}

/**
 * Interaction metadata
 */
export interface InteractionMetadata {
  sessionId: string;
  userId: string;
  documentId: string;
  sectionId?: string;
  requestId: string;
  clientInfo: {
    userAgent: string;
    ip: string;
    timestamp: Date;
  };
  performance: {
    requestTime: number;
    processingTime: number;
    totalTime: number;
  };
  cost: {
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
  };
}

/**
 * User feedback on AI interaction
 */
export interface UserFeedback {
  rating: 1 | 2 | 3 | 4 | 5;
  helpful: boolean;
  accurate: boolean;
  appropriate: boolean;
  comments?: string;
  suggestions?: string;
  timestamp: Date;
}

/**
 * Quality metrics
 */
export interface QualityMetrics {
  overall: number;
  dimensions: {
    coherence: number;
    clarity: number;
    accuracy: number;
    completeness: number;
    originality: number;
    citations: number;
    structure: number;
    language: number;
  };
  trends: Array<{
    timestamp: Date;
    score: number;
  }>;
  issues: QualityIssue[];
}

/**
 * Quality issue
 */
export interface QualityIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: string;
  suggestion?: string;
  automated: boolean;
  resolved: boolean;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  responseTime: {
    average: number;
    p95: number;
    p99: number;
  };
  throughput: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  errors: {
    total: number;
    byType: Record<string, number>;
    rate: number;
  };
  costs: {
    total: number;
    byProvider: Record<string, number>;
    perToken: number;
  };
}

/**
 * System configuration
 */
export interface SystemConfiguration {
  version: string;
  environment: 'development' | 'staging' | 'production';
  features: FeatureFlags;
  limits: SystemLimits;
  providers: ProviderConfiguration[];
  monitoring: MonitoringConfiguration;
  security: SecurityConfiguration;
}

/**
 * Feature flags
 */
export interface FeatureFlags {
  aiAssistance: boolean;
  realTimeCollab: boolean;
  advancedAnalytics: boolean;
  multiLanguage: boolean;
  apiAccess: boolean;
  integrations: boolean;
  beta: Record<string, boolean>;
}

/**
 * System limits
 */
export interface SystemLimits {
  maxUsers: number;
  maxDocuments: number;
  maxFileSize: number;
  maxRequestsPerMinute: number;
  maxTokensPerRequest: number;
  maxConcurrentSessions: number;
}

/**
 * Provider configuration
 */
export interface ProviderConfiguration {
  id: string;
  name: string;
  type: 'ai' | 'storage' | 'database' | 'auth' | 'analytics';
  status: 'active' | 'inactive' | 'maintenance';
  config: Record<string, unknown>;
  metrics: {
    uptime: number;
    responseTime: number;
    errorRate: number;
  };
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfiguration {
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
    destinations: string[];
  };
  metrics: {
    enabled: boolean;
    interval: number;
    retention: number;
  };
  alerting: {
    enabled: boolean;
    channels: string[];
    rules: AlertRule[];
  };
}

/**
 * Alert rule
 */
export interface AlertRule {
  name: string;
  condition: string;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cooldown: number;
  enabled: boolean;
}

/**
 * Security configuration
 */
export interface SecurityConfiguration {
  authentication: {
    methods: string[];
    tokenExpiry: number;
    refreshTokenExpiry: number;
  };
  authorization: {
    enabled: boolean;
    defaultRole: UserRole;
    adminRoles: UserRole[];
  };
  rateLimit: {
    enabled: boolean;
    requests: number;
    window: number;
    skipSuccessfulRequests: boolean;
  };
  cors: {
    enabled: boolean;
    origins: string[];
    methods: string[];
    headers: string[];
  };
}

/**
 * API request context
 */
export interface ApiContext {
  user: UserProfile;
  session: SessionInfo;
  request: {
    id: string;
    timestamp: Date;
    method: string;
    path: string;
    headers: Record<string, string>;
    body?: unknown;
  };
  permissions: Permission[];
  rateLimit: {
    remaining: number;
    reset: Date;
  };
}

/**
 * Session information
 */
export interface SessionInfo {
  id: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivity: Date;
  ipAddress: string;
  userAgent: string;
  metadata: Record<string, unknown>;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata: {
    requestId: string;
    timestamp: Date;
    version: string;
    processingTime: number;
  };
  pagination?: PaginationInfo;
}

/**
 * API error
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
  requestId: string;
  timestamp: Date;
}

/**
 * Pagination information
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Search criteria
 */
export interface SearchCriteria {
  query?: string;
  filters: Record<string, unknown>;
  sort: SortOption[];
  pagination: {
    page: number;
    limit: number;
  };
}

/**
 * Sort option
 */
export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Audit log entry
 */
export interface AuditLogEntry extends SystemEntity {
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  changes?: Record<string, unknown>;
  metadata: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

/**
 * System health status
 */
export interface SystemHealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  timestamp: Date;
  uptime: number;
  services: ServiceHealthStatus[];
  metrics: HealthMetrics;
  alerts: ActiveAlert[];
}

/**
 * Service health status
 */
export interface ServiceHealthStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  errorRate: number;
  lastCheck: Date;
  details?: Record<string, unknown>;
}

/**
 * Health metrics
 */
export interface HealthMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: {
    inbound: number;
    outbound: number;
  };
  requests: {
    total: number;
    success: number;
    errors: number;
  };
}

/**
 * Active alert
 */
export interface ActiveAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  service: string;
  createdAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

/**
 * Export utility types for common patterns
 */
export type ID = string;
export type Timestamp = Date;
export type Optional<T> = T | undefined;
export type Nullable<T> = T | null;
export type KeyOf<T> = keyof T;
export type ValueOf<T> = T[keyof T];
export type Partial<T> = { [P in keyof T]?: T[P] };
export type Required<T> = { [P in keyof T]-?: T[P] };
export type DeepPartial<T> = { [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P] };
export type DeepRequired<T> = { [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P] };

/**
 * Branded types for type safety
 */
export type UserId = string & { readonly brand: 'UserId' };
export type DocumentId = string & { readonly brand: 'DocumentId' };
export type SessionId = string & { readonly brand: 'SessionId' };
export type TemplateId = string & { readonly brand: 'TemplateId' };
export type InteractionId = string & { readonly brand: 'InteractionId' };

/**
 * Type guards for runtime type checking
 */
export const isUserId = (value: unknown): value is UserId => 
  typeof value === 'string' && value.length > 0;

export const isDocumentId = (value: unknown): value is DocumentId => 
  typeof value === 'string' && value.length > 0;

export const isValidPhase = (value: unknown): value is AcademicPhase => 
  typeof value === 'string' && 
  ['scope', 'research', 'outlining', 'drafting', 'citing', 'reviewing', 'final'].includes(value);

export const isValidUserRole = (value: unknown): value is UserRole => 
  typeof value === 'string' && 
  ['student', 'researcher', 'faculty', 'admin', 'guest'].includes(value);

/**
 * Utility functions for type operations
 */
export const createUserId = (value: string): UserId => value as UserId;
export const createDocumentId = (value: string): DocumentId => value as DocumentId;
export const createSessionId = (value: string): SessionId => value as SessionId;
export const createTemplateId = (value: string): TemplateId => value as TemplateId;
export const createInteractionId = (value: string): InteractionId => value as InteractionId;

/**
 * Constants for system-wide use
 */
export const SYSTEM_CONSTANTS = {
  MAX_DOCUMENT_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_TITLE_LENGTH: 200,
  MAX_DESCRIPTION_LENGTH: 1000,
  MIN_PASSWORD_LENGTH: 8,
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
  MAX_CONCURRENT_SESSIONS: 5,
  RATE_LIMIT_REQUESTS: 100,
  RATE_LIMIT_WINDOW: 60 * 1000, // 1 minute
  TOKEN_EXPIRY: 15 * 60 * 1000, // 15 minutes
  REFRESH_TOKEN_EXPIRY: 30 * 24 * 60 * 60 * 1000, // 30 days
} as const;

/**
 * Error codes for consistent error handling
 */
export const ERROR_CODES = {
  // Authentication errors
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS',
  
  // Validation errors
  VALIDATION_REQUIRED_FIELD: 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
  VALIDATION_OUT_OF_RANGE: 'VALIDATION_OUT_OF_RANGE',
  
  // Resource errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_LIMIT_EXCEEDED: 'RESOURCE_LIMIT_EXCEEDED',
  
  // AI errors
  AI_PROVIDER_ERROR: 'AI_PROVIDER_ERROR',
  AI_QUOTA_EXCEEDED: 'AI_QUOTA_EXCEEDED',
  AI_INVALID_PROMPT: 'AI_INVALID_PROMPT',
  
  // System errors
  SYSTEM_INTERNAL_ERROR: 'SYSTEM_INTERNAL_ERROR',
  SYSTEM_MAINTENANCE: 'SYSTEM_MAINTENANCE',
  SYSTEM_OVERLOAD: 'SYSTEM_OVERLOAD',
} as const;

export type ErrorCode = ValueOf<typeof ERROR_CODES>;