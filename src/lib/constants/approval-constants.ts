/**
 * Approval Constants - Constants untuk approval states dan transitions
 * 
 * DOCUMENTATION COMPLIANCE:
 * - Defines academic workflow phases according to 7-phase system
 * - Compatible dengan AI SDK v5 event patterns
 * - Supports streaming approval events
 */

import { ApprovalStatus, ApprovalPriority, WorkflowPhase } from '../types/approval-types';

// Approval status configurations
export const APPROVAL_STATUS_CONFIG = {
  pending: {
    label: 'Pending Review',
    color: 'amber',
    icon: 'clock',
    canTransition: ['approved', 'revision_requested', 'cancelled', 'expired'],
  },
  approved: {
    label: 'Approved',
    color: 'green',
    icon: 'check-circle',
    canTransition: [],
  },
  revision_requested: {
    label: 'Revision Requested', 
    color: 'orange',
    icon: 'edit',
    canTransition: ['pending', 'cancelled'],
  },
  expired: {
    label: 'Expired',
    color: 'red',
    icon: 'x-circle',
    canTransition: ['pending'],
  },
  cancelled: {
    label: 'Cancelled',
    color: 'gray',
    icon: 'x',
    canTransition: ['pending'],
  },
} as const;

// Priority configurations
export const APPROVAL_PRIORITY_CONFIG = {
  critical: {
    label: 'Critical',
    color: 'red',
    weight: 0,
    requiresImmediate: true,
  },
  high: {
    label: 'High',
    color: 'orange',
    weight: 1,
    requiresImmediate: false,
  },
  medium: {
    label: 'Medium',
    color: 'blue',
    weight: 2,
    requiresImmediate: false,
  },
  low: {
    label: 'Low',
    color: 'gray',
    weight: 3,
    requiresImmediate: false,
  },
} as const;

// Academic workflow phase configurations
export const WORKFLOW_PHASE_CONFIG = {
  1: {
    name: 'Definisi Topik & Perencanaan Riset',
    description: 'Define research questions and methodology',
    approvalTypes: ['research_plan', 'methodology'],
    requiredApprovals: ['research_scope'],
    estimatedDuration: '2-3 days',
  },
  2: {
    name: 'Tinjauan Pustaka & Pengumpulan Data',
    description: 'Gather and analyze existing research',
    approvalTypes: ['source_selection', 'literature_analysis'],
    requiredApprovals: ['source_quality'],
    estimatedDuration: '3-5 days',
  },
  3: {
    name: 'Pembuatan Outline & Perencanaan Struktur',
    description: 'Collect and organize research data',
    approvalTypes: ['data_sources', 'data_quality'],
    requiredApprovals: ['data_validation'],
    estimatedDuration: '2-4 days',
  },
  4: {
    name: 'Penulisan Draft & Pengembangan Konten',
    description: 'Analyze data and synthesize findings',
    approvalTypes: ['analysis_method', 'findings_synthesis'],
    requiredApprovals: ['analysis_validity'],
    estimatedDuration: '3-5 days',
  },
  5: {
    name: 'Integrasi Sitasi & Manajemen Referensi',
    description: 'Write initial draft of the paper',
    approvalTypes: ['content_structure', 'argument_flow'],
    requiredApprovals: ['draft_quality'],
    estimatedDuration: '4-6 days',
  },
  6: {
    name: 'Review & Jaminan Kualitas',
    description: 'Review and revise the draft',
    approvalTypes: ['content_review', 'citation_check'],
    requiredApprovals: ['revision_completeness'],
    estimatedDuration: '2-3 days',
  },
  7: {
    name: 'Formatting Final & Persiapan Submisi',
    description: 'Format and finalize the paper',
    approvalTypes: ['format_compliance', 'final_review'],
    requiredApprovals: ['submission_readiness'],
    estimatedDuration: '1-2 days',
  },
} as const;

// Default approval gate timeouts (in milliseconds)
export const APPROVAL_TIMEOUTS = {
  critical: 2 * 60 * 60 * 1000,  // 2 hours
  high: 6 * 60 * 60 * 1000,      // 6 hours
  medium: 24 * 60 * 60 * 1000,   // 24 hours
  low: 72 * 60 * 60 * 1000,      // 72 hours
} as const;

// Event type constants untuk streaming
export const APPROVAL_EVENTS = {
  GATE_CREATED: 'approval_gate_created',
  GATE_UPDATED: 'approval_gate_updated',
  GATE_APPROVED: 'approval_gate_approved',
  GATE_REVISION_REQUESTED: 'approval_gate_revision_requested',
  GATE_EXPIRED: 'approval_gate_expired',
  GATE_CANCELLED: 'approval_gate_cancelled',
  PHASE_TRANSITION: 'workflow_phase_transition',
  BATCH_UPDATE: 'approval_batch_update',
} as const;

// Default text untuk approval buttons
export const DEFAULT_APPROVAL_TEXT = {
  approve: 'Approve',
  revise: 'Request Revision',
  cancel: 'Cancel',
  retry: 'Retry',
  view: 'View Details',
  edit: 'Edit',
} as const;

// Feedback categories
export const FEEDBACK_CATEGORIES = {
  content: {
    label: 'Content Issues',
    description: 'Problems with the content quality or accuracy',
    color: 'blue',
  },
  structure: {
    label: 'Structure Issues',
    description: 'Problems with organization or flow',
    color: 'purple',
  },
  citations: {
    label: 'Citation Issues',
    description: 'Problems with references or citations',
    color: 'green',
  },
  formatting: {
    label: 'Formatting Issues',
    description: 'Problems with style or formatting',
    color: 'orange',
  },
  other: {
    label: 'Other Issues',
    description: 'Other concerns or suggestions',
    color: 'gray',
  },
} as const;

// Validation rules
export const VALIDATION_RULES = {
  title: {
    minLength: 3,
    maxLength: 100,
    required: true,
  },
  description: {
    minLength: 10,
    maxLength: 500,
    required: true,
  },
  feedback: {
    minLength: 10,
    maxLength: 1000,
    required: true,
  },
} as const;

// UI display limits
export const DISPLAY_LIMITS = {
  maxGatesPerPage: 10,
  maxGatesInSummary: 5,
  maxHistoryEntries: 50,
  maxFeedbackLength: 1000,
  previewTextLength: 100,
} as const;

// Animation durations (in milliseconds)
export const ANIMATION_DURATIONS = {
  statusChange: 300,
  slideIn: 250,
  fadeIn: 200,
  popup: 150,
} as const;

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  approve: 'a',
  revise: 'r',
  cancel: 'c',
  next: 'n',
  previous: 'p',
  expand: ' ', // spacebar
} as const;

// ARIA labels untuk accessibility
export const ARIA_LABELS = {
  approvalGate: 'Approval gate',
  approveButton: 'Approve this item',
  reviseButton: 'Request revision for this item',
  cancelButton: 'Cancel this approval',
  feedbackForm: 'Revision feedback form',
  statusIndicator: 'Approval status',
  progressBar: 'Workflow progress',
  phaseIndicator: 'Current phase indicator',
} as const;

// Error messages
export const ERROR_MESSAGES = {
  invalidGate: 'Invalid approval gate data',
  expiredGate: 'This approval gate has expired',
  missingFeedback: 'Feedback is required for revision requests',
  networkError: 'Network error occurred while processing approval',
  unauthorizedAccess: 'You do not have permission to approve this item',
  rateLimitExceeded: 'Too many approval requests. Please wait and try again.',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  approved: 'Successfully approved',
  revisionRequested: 'Revision request sent successfully',
  cancelled: 'Approval cancelled successfully',
  phaseTransition: 'Advanced to next phase',
} as const;

// Default configuration values
export const DEFAULT_CONFIG = {
  autoExpireEnabled: true,
  notificationsEnabled: true,
  soundEnabled: false,
  compactMode: false,
  showTimestamps: true,
  groupByPhase: true,
  sortBy: 'priority' as const,
  maxVisibleGates: 5,
  refreshInterval: 30000, // 30 seconds
} as const;

// Role-based permissions (if needed for future extension)
export const APPROVAL_PERMISSIONS = {
  admin: {
    canApprove: true,
    canRevise: true,
    canCancel: true,
    canViewAll: true,
    canManageConfig: true,
  },
  reviewer: {
    canApprove: true,
    canRevise: true,
    canCancel: false,
    canViewAll: true,
    canManageConfig: false,
  },
  author: {
    canApprove: false,
    canRevise: false,
    canCancel: true,
    canViewAll: false,
    canManageConfig: false,
  },
} as const;