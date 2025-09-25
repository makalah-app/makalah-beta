/**
 * Approval Helpers - Utility functions untuk approval system logic
 * 
 * DOCUMENTATION COMPLIANCE:
 * - Compatible dengan AI SDK v5 streaming patterns
 * - Integrates dengan academic workflow phases
 * - Supports UIMessage metadata patterns
 */

import { 
  ApprovalGate, 
  ApprovalStatus, 
  ApprovalDecision, 
  ApprovalFeedback,
  ApprovalPriority,
  WorkflowPhase,
  ApprovalValidation,
  ApprovalHistoryEntry 
} from '../types/approval-types';

// Generate unique ID untuk approval gates
export const generateApprovalId = (prefix = 'approval'): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
};

// Validation functions
export const approvalValidation: ApprovalValidation = {
  isValidGate: (gate: Partial<ApprovalGate>): boolean => {
    return !!(
      gate.id &&
      gate.title &&
      gate.description &&
      gate.phase &&
      typeof gate.phase === 'number' &&
      gate.phase >= 1 &&
      gate.phase <= 7
    );
  },

  isExpired: (gate: ApprovalGate): boolean => {
    if (!gate.expiresAt) return false;
    return Date.now() > gate.expiresAt;
  },

  canApprove: (gate: ApprovalGate): boolean => {
    return gate.status === 'pending' && !approvalValidation.isExpired(gate);
  },

  requiresFeedback: (gate: ApprovalGate): boolean => {
    return gate.options?.requiresFeedback === true;
  },
};

// Priority sorting function
export const priorityOrder: Record<ApprovalPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const sortGatesByPriority = (gates: ApprovalGate[]): ApprovalGate[] => {
  return [...gates].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
};

// Phase-based sorting
export const sortGatesByPhase = (gates: ApprovalGate[]): ApprovalGate[] => {
  return [...gates].sort((a, b) => a.phase - b.phase);
};

// Creation time sorting
export const sortGatesByCreated = (gates: ApprovalGate[]): ApprovalGate[] => {
  return [...gates].sort((a, b) => a.createdAt - b.createdAt);
};

// Expiration sorting
export const sortGatesByExpiration = (gates: ApprovalGate[]): ApprovalGate[] => {
  return [...gates].sort((a, b) => {
    if (!a.expiresAt && !b.expiresAt) return 0;
    if (!a.expiresAt) return 1;
    if (!b.expiresAt) return -1;
    return a.expiresAt - b.expiresAt;
  });
};

// Filter functions
export const filterGatesByStatus = (gates: ApprovalGate[], status: ApprovalStatus): ApprovalGate[] => {
  return gates.filter(gate => gate.status === status);
};

export const filterGatesByPhase = (gates: ApprovalGate[], phase: WorkflowPhase): ApprovalGate[] => {
  return gates.filter(gate => gate.phase === phase);
};

export const filterPendingGates = (gates: ApprovalGate[]): ApprovalGate[] => {
  return gates.filter(gate => 
    gate.status === 'pending' && !approvalValidation.isExpired(gate)
  );
};

export const filterExpiredGates = (gates: ApprovalGate[]): ApprovalGate[] => {
  return gates.filter(gate => approvalValidation.isExpired(gate));
};

// Create approval gate factory
export const createApprovalGate = (
  title: string,
  description: string,
  phase: WorkflowPhase,
  options?: Partial<ApprovalGate>
): ApprovalGate => {
  const now = Date.now();
  
  return {
    id: options?.id || generateApprovalId(),
    title,
    description,
    phase,
    status: 'pending',
    priority: options?.priority || 'medium',
    createdAt: now,
    updatedAt: now,
    ...options,
  };
};

// Create approval feedback
export const createApprovalFeedback = (
  approvalId: string,
  feedback: string,
  options?: Partial<ApprovalFeedback>
): ApprovalFeedback => {
  return {
    approvalId,
    feedback,
    timestamp: Date.now(),
    category: options?.category || 'other',
    priority: options?.priority || 'medium',
    ...options,
  };
};

// Create history entry
export const createHistoryEntry = (
  approvalId: string,
  decision: ApprovalDecision,
  feedback?: ApprovalFeedback,
  metadata?: Record<string, unknown>
): ApprovalHistoryEntry => {
  return {
    id: generateApprovalId('history'),
    approvalId,
    decision,
    feedback,
    timestamp: Date.now(),
    metadata,
  };
};

// Status update helpers
export const updateGateStatus = (
  gate: ApprovalGate,
  status: ApprovalStatus
): ApprovalGate => {
  return {
    ...gate,
    status,
    updatedAt: Date.now(),
  };
};

// Time formatting utilities
export const formatTimeRemaining = (expiresAt?: number): string => {
  if (!expiresAt) return 'No deadline';
  
  const now = Date.now();
  const remaining = expiresAt - now;
  
  if (remaining <= 0) return 'Expired';
  
  const minutes = Math.floor(remaining / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d remaining`;
  if (hours > 0) return `${hours}h remaining`;
  if (minutes > 0) return `${minutes}m remaining`;
  
  return 'Less than 1m';
};

export const formatApprovalTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString();
};

// Gate aggregation functions
export const getGateStats = (gates: ApprovalGate[]) => {
  const stats = {
    total: gates.length,
    pending: 0,
    approved: 0,
    revisionRequested: 0,
    expired: 0,
    cancelled: 0,
    byPhase: {} as Record<WorkflowPhase, number>,
    byPriority: {} as Record<ApprovalPriority, number>,
  };
  
  gates.forEach(gate => {
    stats[gate.status === 'revision_requested' ? 'revisionRequested' : gate.status]++;
    stats.byPhase[gate.phase] = (stats.byPhase[gate.phase] || 0) + 1;
    stats.byPriority[gate.priority] = (stats.byPriority[gate.priority] || 0) + 1;
  });
  
  return stats;
};

// Validation for feedback
export const validateFeedback = (feedback: string): { isValid: boolean; error?: string } => {
  if (!feedback || feedback.trim().length === 0) {
    return { isValid: false, error: 'Feedback is required' };
  }
  
  if (feedback.trim().length < 10) {
    return { isValid: false, error: 'Feedback must be at least 10 characters' };
  }
  
  if (feedback.length > 1000) {
    return { isValid: false, error: 'Feedback must be less than 1000 characters' };
  }
  
  return { isValid: true };
};

// Phase transition helpers
export const canTransitionToPhase = (
  currentPhase: WorkflowPhase, 
  targetPhase: WorkflowPhase,
  pendingGates: ApprovalGate[]
): { canTransition: boolean; reason?: string } => {
  // Cannot go backwards (except for revisions)
  if (targetPhase < currentPhase) {
    return { canTransition: false, reason: 'Cannot move to previous phase' };
  }
  
  // Cannot skip phases
  if (targetPhase > currentPhase + 1) {
    return { canTransition: false, reason: 'Cannot skip phases' };
  }
  
  // Check for pending approvals in current phase
  const currentPhasePending = pendingGates.filter(gate => gate.phase === currentPhase);
  if (currentPhasePending.length > 0) {
    return { 
      canTransition: false, 
      reason: `${currentPhasePending.length} pending approvals in current phase` 
    };
  }
  
  return { canTransition: true };
};

// Integration dengan AI SDK UIMessage patterns
export const extractApprovalMetadata = (message: any) => {
  const metadata = message?.metadata || {};
  return {
    approvalGateId: metadata.approvalGateId,
    requiresApproval: metadata.requiresApproval === true,
    approvalStatus: metadata.approvalStatus,
    phase: metadata.phase,
    workflowContext: metadata.workflowContext,
  };
};

// Cleanup expired gates
export const cleanupExpiredGates = (gates: ApprovalGate[]): ApprovalGate[] => {
  const now = Date.now();
  return gates.map(gate => {
    if (gate.expiresAt && now > gate.expiresAt && gate.status === 'pending') {
      return { ...gate, status: 'expired' as ApprovalStatus, updatedAt: now };
    }
    return gate;
  });
};

// Default expiration time (24 hours)
export const DEFAULT_EXPIRATION_TIME = 24 * 60 * 60 * 1000;

// Create gate dengan auto-expiration
export const createApprovalGateWithExpiration = (
  title: string,
  description: string,
  phase: WorkflowPhase,
  expirationHours = 24,
  options?: Partial<ApprovalGate>
): ApprovalGate => {
  return createApprovalGate(title, description, phase, {
    ...options,
    expiresAt: Date.now() + (expirationHours * 60 * 60 * 1000),
  });
};