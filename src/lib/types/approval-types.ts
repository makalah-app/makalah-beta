/**
 * Approval System Types - TypeScript interfaces untuk approval gate functionality
 * 
 * DOCUMENTATION COMPLIANCE:
 * - Integrates with UIMessage structure dari AI SDK v5
 * - Supports academic workflow phase transitions
 * - Compatible dengan streaming data patterns
 */

// Core approval gate status types
export type ApprovalStatus = 
  | 'pending'
  | 'approved' 
  | 'revision_requested'
  | 'expired'
  | 'cancelled';

// Approval decision types
export type ApprovalDecision = 'approved' | 'revision';

// Approval gate priority levels
export type ApprovalPriority = 'low' | 'medium' | 'high' | 'critical';

// Academic workflow phases
export type WorkflowPhase = 1 | 2 | 3 | 4 | 5 | 6 | 7;

// Base approval gate interface
export interface ApprovalGate {
  id: string;
  title: string;
  description: string;
  phase: WorkflowPhase;
  status: ApprovalStatus;
  priority: ApprovalPriority;
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
  
  // Content related to approval
  content?: {
    summary: string;
    preview?: string;
    fullContent?: string;
    artifactIds?: string[];
  };
  
  // Approval options
  options?: {
    approveText?: string;
    reviseText?: string;
    requiresFeedback?: boolean;
    allowPartialApproval?: boolean;
  };
  
  // Metadata
  metadata?: {
    messageId?: string;
    workflowId?: string;
    userId?: string;
    approverRole?: string;
    context?: Record<string, unknown>;
  };
}

// Approval feedback interface
export interface ApprovalFeedback {
  approvalId: string;
  feedback: string;
  category?: 'content' | 'structure' | 'citations' | 'formatting' | 'other';
  priority?: ApprovalPriority;
  suggestedChanges?: string[];
  timestamp: number;
}

// Approval history entry
export interface ApprovalHistoryEntry {
  id: string;
  approvalId: string;
  decision: ApprovalDecision;
  feedback?: ApprovalFeedback;
  timestamp: number;
  userId?: string;
  metadata?: Record<string, unknown>;
}

// Approval state for context provider
export interface ApprovalState {
  gates: Record<string, ApprovalGate>;
  history: ApprovalHistoryEntry[];
  pendingIds: string[];
  currentPhase: WorkflowPhase;
  isLoading: boolean;
  error?: Error;
}

// Approval actions for state management
export type ApprovalAction =
  | { type: 'ADD_GATE'; payload: ApprovalGate }
  | { type: 'UPDATE_GATE'; payload: { id: string; updates: Partial<ApprovalGate> } }
  | { type: 'REMOVE_GATE'; payload: string }
  | { type: 'SET_STATUS'; payload: { id: string; status: ApprovalStatus } }
  | { type: 'ADD_HISTORY'; payload: ApprovalHistoryEntry }
  | { type: 'SET_PHASE'; payload: WorkflowPhase }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: Error | undefined }
  | { type: 'CLEAR_EXPIRED' };

// Hook configuration interface
export interface ApprovalHookConfig {
  onApprove?: (gate: ApprovalGate) => void | Promise<void>;
  onRevise?: (gate: ApprovalGate, feedback?: ApprovalFeedback) => void | Promise<void>;
  onExpire?: (gate: ApprovalGate) => void | Promise<void>;
  autoExpireTimeout?: number;
  enableNotifications?: boolean;
}

// Event types for streaming integration
export interface ApprovalStreamEvent {
  type: 'approval_gate' | 'approval_decision' | 'approval_update' | 'approval_expired';
  data: {
    gate?: ApprovalGate;
    decision?: ApprovalDecision;
    feedback?: ApprovalFeedback;
    timestamp: number;
  };
}

// Props for approval components
export interface ApprovalGateCardProps {
  gate: ApprovalGate;
  onApprove: (gateId: string) => void;
  onRevise: (gateId: string, feedback?: ApprovalFeedback) => void;
  disabled?: boolean;
  className?: string;
}

export interface ApprovalControlsProps {
  gate: ApprovalGate;
  onApprove: () => void;
  onRevise: (feedback: ApprovalFeedback) => void;
  disabled?: boolean;
  showFeedbackForm?: boolean;
  className?: string;
}

export interface ApprovalStatusIndicatorProps {
  status: ApprovalStatus;
  priority?: ApprovalPriority;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export interface ApprovalGatesContainerProps {
  approvalIds: string[];
  onApprovalComplete: (approvalId: string, decision: ApprovalDecision, feedback?: ApprovalFeedback) => void;
  className?: string;
  maxDisplayed?: number;
  sortBy?: 'priority' | 'phase' | 'created' | 'expires';
}

// Provider props
export interface ApprovalProviderProps {
  children: React.ReactNode;
  initialGates?: ApprovalGate[];
  config?: ApprovalHookConfig;
}

// Context value interface
export interface ApprovalContextValue {
  state: ApprovalState;
  dispatch: React.Dispatch<ApprovalAction>;
  
  // Action methods
  addGate: (gate: ApprovalGate) => void;
  updateGate: (id: string, updates: Partial<ApprovalGate>) => void;
  removeGate: (id: string) => void;
  approveGate: (id: string) => void;
  reviseGate: (id: string, feedback?: ApprovalFeedback) => void;
  
  // Utility methods
  getGatesByPhase: (phase: WorkflowPhase) => ApprovalGate[];
  getPendingGates: () => ApprovalGate[];
  getExpiredGates: () => ApprovalGate[];
  clearExpiredGates: () => void;
}

// Validation helpers
export interface ApprovalValidation {
  isValidGate: (gate: Partial<ApprovalGate>) => boolean;
  isExpired: (gate: ApprovalGate) => boolean;
  canApprove: (gate: ApprovalGate) => boolean;
  requiresFeedback: (gate: ApprovalGate) => boolean;
}

// Integration with UIMessage metadata
export interface AcademicApprovalMetadata {
  approvalGateId?: string;
  requiresApproval?: boolean;
  approvalStatus?: ApprovalStatus;
  phase?: WorkflowPhase;
  workflowContext?: {
    stepId?: string;
    dependencies?: string[];
    outputs?: string[];
  };
}