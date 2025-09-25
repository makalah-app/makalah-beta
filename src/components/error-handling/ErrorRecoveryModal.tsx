/**
 * ERROR RECOVERY MODAL - Task 08 Error Handling Implementation
 * 
 * Modal dialog untuk error recovery dengan guided recovery steps,
 * diagnostic information, dan user-friendly recovery options.
 * 
 * INTEGRATION:
 * - ZERO modifications to existing modal systems
 * - Works with all error boundary components
 * - Provides guided recovery workflows
 * - Maintains focus management and accessibility
 * 
 * FEATURES:
 * - Step-by-step recovery guidance
 * - Diagnostic information collection
 * - Multiple recovery options
 * - Progress tracking for recovery attempts
 */

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface ErrorRecoveryModalProps {
  isOpen: boolean;
  error?: {
    id: string;
    title: string;
    message: string;
    type?: 'chat' | 'api' | 'streaming' | 'database' | 'file' | 'component';
    severity?: 'low' | 'medium' | 'high' | 'critical';
    recoverable?: boolean;
    diagnostics?: Record<string, any>;
    suggestions?: string[];
    context?: Record<string, any>;
  };
  onClose: () => void;
  onRecovery: (recoveryType: string, data?: any) => void;
  onReportIssue?: (diagnostics: any) => void;
  enableDiagnostics?: boolean;
  enableReporting?: boolean;
  maxWidth?: number;
}

interface RecoveryStep {
  id: string;
  title: string;
  description: string;
  action?: () => void | Promise<void>;
  completed: boolean;
  success?: boolean;
  error?: string;
}

const buildRecoverySteps = (errorInfo?: ErrorRecoveryModalProps['error']): RecoveryStep[] => {
  if (!errorInfo) {
    return [];
  }

  switch (errorInfo.type) {
    case 'chat':
      return [
        {
          id: 'check-connection',
          title: 'Check Connection',
          description: 'Verify your internet connection is stable',
          completed: false,
        },
        {
          id: 'clear-cache',
          title: 'Clear Browser Cache',
          description: 'Clear cached data that might be causing conflicts',
          completed: false,
        },
        {
          id: 'restart-chat',
          title: 'Restart Chat Session',
          description: 'Start a fresh chat session',
          completed: false,
        },
      ];

    default:
      return [
        {
          id: 'refresh-component',
          title: 'Refresh Component',
          description: 'Reload the affected component',
          completed: false,
        },
        {
          id: 'clear-state',
          title: 'Clear Application State',
          description: 'Reset application data and try again',
          completed: false,
        },
        {
          id: 'reload-page',
          title: 'Reload Page',
          description: 'Perform a full page refresh',
          completed: false,
        },
      ];
  }
};

const getStorageQuota = async (): Promise<{ used: number; quota: number } | null> => {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    }
  } catch {
    // Quota API not available
  }
  return null;
};


/**
 * ErrorRecoveryModal
 * 
 * Comprehensive modal untuk error recovery dengan guided workflows,
 * diagnostic tools, dan comprehensive recovery options.
 */
export const ErrorRecoveryModal: React.FC<ErrorRecoveryModalProps> = ({
  isOpen,
  error,
  onClose,
  onRecovery,
  onReportIssue,
  enableDiagnostics = true,
  enableReporting = true,
  maxWidth = 600,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [recoverySteps, setRecoverySteps] = useState<RecoveryStep[]>([]);
  const [diagnosticData, setDiagnosticData] = useState<Record<string, any>>({});
  const [isRunningRecovery, setIsRunningRecovery] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const collectDiagnostics = useCallback(async () => {
    try {
      const diagnostics = {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        online: navigator.onLine,
        language: navigator.language,
        platform: navigator.platform,
        memory: 'memory' in performance ? (performance as any).memory : null,
        connection: 'connection' in navigator ? (navigator as any).connection : null,
        localStorage: {
          available: typeof Storage !== 'undefined',
          quotaUsed: await getStorageQuota(),
        },
        sessionStorage: {
          available: typeof sessionStorage !== 'undefined',
          itemCount: sessionStorage.length,
        },
        errorContext: error?.context || {},
        ...error?.diagnostics,
      };

      setDiagnosticData(diagnostics);
    } catch (diagError) {
      console.warn('[ErrorRecoveryModal] Failed to collect diagnostics:', diagError);
    }
  }, [error]);

  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  // Initialize recovery steps based on error type
  useEffect(() => {
    if (error) {
      setRecoverySteps(buildRecoverySteps(error));
      if (enableDiagnostics) {
        collectDiagnostics();
      }
    }
  }, [collectDiagnostics, enableDiagnostics, error]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previousFocus.current = document.activeElement as HTMLElement;
      modalRef.current?.focus();
    } else if (previousFocus.current) {
      previousFocus.current.focus();
    }
  }, [isOpen]);

  // Keyboard event handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !error) return null;

  const getStorageQuota = async (): Promise<{ used: number; quota: number } | null> => {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          used: estimate.usage || 0,
          quota: estimate.quota || 0,
        };
      }
    } catch {
      // Quota API not available
    }
    return null;
  };

  const executeRecoveryStep = async (stepIndex: number) => {
    const step = recoverySteps[stepIndex];
    if (!step || step.completed) return;

    setIsRunningRecovery(true);
    
    try {
      // Update step as running
      setRecoverySteps(prev => prev.map((s, i) => 
        i === stepIndex ? { ...s, error: undefined } : s
      ));

      // Execute step action
      if (step.action) {
        await step.action();
      } else {
        // Default actions based on step ID
        await executeDefaultAction(step.id);
      }

      // Mark step as completed successfully
      setRecoverySteps(prev => prev.map((s, i) => 
        i === stepIndex ? { ...s, completed: true, success: true } : s
      ));

      // Move to next step if available
      if (stepIndex < recoverySteps.length - 1) {
        setCurrentStep(stepIndex + 1);
      }

    } catch (stepError) {
      console.error(`Recovery step failed: ${step.id}`, stepError);
      
      // Mark step as failed
      setRecoverySteps(prev => prev.map((s, i) => 
        i === stepIndex ? { 
          ...s, 
          completed: true, 
          success: false,
          error: stepError instanceof Error ? stepError.message : 'Step failed'
        } : s
      ));
    } finally {
      setIsRunningRecovery(false);
    }
  };

  const executeDefaultAction = async (stepId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        switch (stepId) {
          case 'check-connection':
            if (!navigator.onLine) {
              reject(new Error('No internet connection'));
            } else {
              resolve();
            }
            break;
          
          case 'clear-cache':
            try {
              if ('caches' in window) {
                caches.keys().then(names => {
                  names.forEach(name => caches.delete(name));
                });
              }
              resolve();
            } catch (e) {
              reject(e);
            }
            break;
          
          case 'restart-chat':
          case 'retry-request':
          case 'retry-query':
          case 'retry-upload':
            onRecovery('retry', { stepId });
            resolve();
            break;
          
          case 'use-fallback':
          case 'fallback-polling':
          case 'offline-mode':
            onRecovery('fallback', { stepId });
            resolve();
            break;
          
          case 'reload-page':
            window.location.reload();
            resolve();
            break;
          
          default:
            onRecovery('custom', { stepId });
            resolve();
        }
      }, 1000); // Simulate async operation
    });
  };

  const handleCompleteRecovery = () => {
    const successfulSteps = recoverySteps.filter(step => step.completed && step.success);
    onRecovery('complete', { 
      completedSteps: successfulSteps.length,
      totalSteps: recoverySteps.length,
      steps: successfulSteps.map(s => s.id),
    });
    onClose();
  };

  const handleReportIssue = () => {
    const reportData = {
      error: error,
      diagnostics: diagnosticData,
      recoveryAttempts: recoverySteps,
      timestamp: new Date().toISOString(),
    };
    
    onReportIssue?.(reportData);
  };

  const getSeverityColor = (severity?: string) => {
    const colors = {
      low: '#3b82f6',
      medium: '#f59e0b',
      high: '#ef4444',
      critical: '#dc2626',
    };
    return colors[severity as keyof typeof colors] || colors.medium;
  };

  const getStepIcon = (step: RecoveryStep) => {
    if (!step.completed) return '⏳';
    if (step.success) return '✅';
    return '❌';
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 10000,
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="error-recovery-modal"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: `${maxWidth}px`,
          maxHeight: '90%',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1)',
          zIndex: 10001,
          overflow: 'hidden',
        }}
        tabIndex={-1}
        role="dialog"
        aria-labelledby="recovery-modal-title"
        aria-describedby="recovery-modal-description"
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 24px 16px 24px',
            borderBottom: '1px solid #e5e7eb',
            borderTop: `4px solid ${getSeverityColor(error.severity)}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2
                id="recovery-modal-title"
                style={{
                  margin: 0,
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#111827',
                }}
              >
                Error Recovery Assistant
              </h2>
              <p
                style={{
                  margin: '4px 0 0 0',
                  fontSize: '14px',
                  color: '#6b7280',
                }}
              >
                {error.title} • ID: {error.id.slice(-8)}
              </p>
            </div>
            
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                color: '#6b7280',
                cursor: 'pointer',
                padding: '4px',
              }}
              aria-label="Close recovery modal"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          style={{
            padding: '24px',
            maxHeight: '60vh',
            overflowY: 'auto',
          }}
        >
          {/* Error Description */}
          <div style={{ marginBottom: '24px' }}>
            <p
              id="recovery-modal-description"
              style={{
                margin: 0,
                fontSize: '14px',
                lineHeight: '1.5',
                color: '#374151',
              }}
            >
              {error.message}
            </p>
            
            {error.suggestions && error.suggestions.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <p style={{ fontSize: '13px', fontWeight: '500', margin: '0 0 8px 0' }}>
                  Suggestions:
                </p>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px' }}>
                  {error.suggestions.map((suggestion, index) => (
                    <li key={index} style={{ marginBottom: '4px' }}>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Recovery Steps */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '500', 
              margin: '0 0 16px 0',
              color: '#111827',
            }}>
              Recovery Steps
            </h3>
            
            <div style={{ space: '12px' }}>
              {recoverySteps.map((step, index) => (
                <div
                  key={step.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    backgroundColor: step.completed 
                      ? (step.success ? '#f0fdf4' : '#fef2f2')
                      : index === currentStep ? '#eff6ff' : '#f9fafb',
                  }}
                >
                  <div
                    style={{
                      fontSize: '16px',
                      marginTop: '2px',
                    }}
                  >
                    {getStepIcon(step)}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <h4 style={{ 
                      margin: '0 0 4px 0', 
                      fontSize: '14px',
                      fontWeight: '500',
                    }}>
                      {step.title}
                    </h4>
                    <p style={{ 
                      margin: '0 0 8px 0', 
                      fontSize: '13px',
                      color: '#6b7280',
                    }}>
                      {step.description}
                    </p>
                    
                    {step.error && (
                      <p style={{
                        margin: '4px 0 0 0',
                        fontSize: '12px',
                        color: '#dc2626',
                      }}>
                        Error: {step.error}
                      </p>
                    )}
                  </div>
                  
                  {!step.completed && index === currentStep && (
                    <button
                      onClick={() => executeRecoveryStep(index)}
                      disabled={isRunningRecovery}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: getSeverityColor(error.severity),
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: isRunningRecovery ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        opacity: isRunningRecovery ? 0.6 : 1,
                      }}
                    >
                      {isRunningRecovery ? 'Running...' : 'Execute'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Diagnostics Section */}
          {enableDiagnostics && (
            <div style={{ marginBottom: '24px' }}>
              <button
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3b82f6',
                  fontSize: '14px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                {showDiagnostics ? 'Hide' : 'Show'} Diagnostic Information
              </button>
              
              {showDiagnostics && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '12px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                  }}
                >
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {JSON.stringify(diagnosticData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            {recoverySteps.filter(s => s.completed && s.success).length} of {recoverySteps.length} steps completed
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            {enableReporting && (
              <button
                onClick={handleReportIssue}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  color: '#6b7280',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Report Issue
              </button>
            )}
            
            <button
              onClick={handleCompleteRecovery}
              disabled={recoverySteps.filter(s => s.completed && s.success).length === 0}
              style={{
                padding: '8px 16px',
                backgroundColor: getSeverityColor(error.severity),
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                opacity: recoverySteps.filter(s => s.completed && s.success).length === 0 ? 0.6 : 1,
              }}
            >
              Complete Recovery
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ErrorRecoveryModal;
