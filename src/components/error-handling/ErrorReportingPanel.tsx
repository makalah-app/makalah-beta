/**
 * ERROR REPORTING PANEL - Task 08 Error Handling Implementation
 * 
 * Comprehensive error reporting interface untuk collecting detailed
 * error reports, user feedback, dan system diagnostics.
 * 
 * INTEGRATION:
 * - ZERO modifications to existing reporting systems
 * - Works with all error boundary components
 * - Provides structured error reporting
 * - Maintains user privacy and data security
 * 
 * FEATURES:
 * - Structured error report generation
 * - User feedback collection
 * - System diagnostics gathering
 * - Privacy-compliant data handling
 */

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';

export interface ErrorReportingPanelProps {
  isOpen: boolean;
  error?: {
    id: string;
    title: string;
    message: string;
    type?: string;
    severity?: string;
    stack?: string;
    timestamp?: number;
    context?: Record<string, any>;
    diagnostics?: Record<string, any>;
  };
  onClose: () => void;
  onSubmitReport: (report: ErrorReport) => void;
  enableDiagnostics?: boolean;
  enableScreenshot?: boolean;
  enablePrivacyMode?: boolean;
  userInfo?: {
    id?: string;
    email?: string;
    name?: string;
  };
}

export interface ErrorReport {
  errorId: string;
  title: string;
  description: string;
  reproductionSteps: string[];
  expectedBehavior: string;
  actualBehavior: string;
  userFeedback: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  tags: string[];
  diagnostics: Record<string, any>;
  screenshot?: string;
  userInfo?: {
    id?: string;
    email?: string;
    consentGiven: boolean;
  };
  privacySettings: {
    includePersonalData: boolean;
    includeDiagnostics: boolean;
    includeScreenshot: boolean;
  };
  timestamp: number;
}

/**
 * ErrorReportingPanel
 * 
 * Comprehensive error reporting interface dengan structured data collection,
 * user feedback, dan privacy-compliant diagnostics gathering.
 */
export const ErrorReportingPanel: React.FC<ErrorReportingPanelProps> = ({
  isOpen,
  error,
  onClose,
  onSubmitReport,
  enableDiagnostics = true,
  enableScreenshot = true,
  enablePrivacyMode = true,
  userInfo,
}) => {
  const [reportData, setReportData] = useState<Partial<ErrorReport>>({
    severity: 'medium',
    category: error?.type || 'general',
    tags: [],
    reproductionSteps: [''],
    privacySettings: {
      includePersonalData: false,
      includeDiagnostics: true,
      includeScreenshot: false,
    },
  });
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<Record<string, any>>({});
  const panelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps = [
    'Basic Information',
    'Reproduction Steps',
    'User Feedback',
    'Privacy & Diagnostics',
    'Review & Submit',
  ];

  // Initialize report data when error changes
  const collectDiagnostics = useCallback(async () => {
    try {
      const diagnosticData = {
        timestamp: new Date().toISOString(),
        browser: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          platform: navigator.platform,
          cookieEnabled: navigator.cookieEnabled,
          onLine: navigator.onLine,
        },
        screen: {
          width: screen.width,
          height: screen.height,
          colorDepth: screen.colorDepth,
          pixelDepth: screen.pixelDepth,
        },
        window: {
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio,
        },
        performance: {
          memory: 'memory' in performance ? (performance as any).memory : null,
          navigation: performance.getEntriesByType('navigation')[0] || null,
        },
        storage: {
          localStorage: {
            available: typeof localStorage !== 'undefined',
            length: localStorage?.length || 0,
          },
          sessionStorage: {
            available: typeof sessionStorage !== 'undefined',
            length: sessionStorage?.length || 0,
          },
        },
        error: {
          ...error,
          stack: enablePrivacyMode ? '[REDACTED FOR PRIVACY]' : error?.stack,
        },
        url: window.location.href,
        referrer: document.referrer,
      };

      // Collect storage quota if available
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
          const estimate = await navigator.storage.estimate();
          (diagnosticData.storage as any).quota = {
            usage: estimate.usage || 0,
            quota: estimate.quota || 0,
          };
        } catch (e) {
        console.warn('Could not collect storage quota');
      }
    }

    setDiagnostics(diagnosticData);
  } catch (diagError) {
    console.error('Failed to collect diagnostics:', diagError);
  }
  }, [enablePrivacyMode, error]);

  useEffect(() => {
    if (error) {
      setReportData(prev => ({
        ...prev,
        errorId: error.id,
        title: error.title,
        actualBehavior: error.message,
        category: error.type || 'general',
        severity: (error.severity as any) || 'medium',
      }));
      
      if (enableDiagnostics) {
        collectDiagnostics();
      }
    }
  }, [collectDiagnostics, enableDiagnostics, error]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      panelRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen || !error) return null;

  const takeScreenshot = async () => {
    if (!enableScreenshot) return;
    
    try {
      // Using html2canvas would be ideal here, but for now we'll simulate
      // In a real implementation, you'd use a library like html2canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      if (ctx) {
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#374151';
        ctx.font = '16px system-ui';
        ctx.fillText('Screenshot placeholder', 20, 40);
        ctx.fillText('Actual screenshot would be captured here', 20, 70);
        
        const screenshotData = canvas.toDataURL('image/png');
        setScreenshot(screenshotData);
      }
    } catch (screenshotError) {
      console.error('Failed to take screenshot:', screenshotError);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setReportData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePrivacyChange = (setting: string, value: boolean) => {
    setReportData(prev => ({
      ...prev,
      privacySettings: {
        ...prev.privacySettings!,
        [setting]: value,
      },
    }));
  };

  const addReproductionStep = () => {
    setReportData(prev => ({
      ...prev,
      reproductionSteps: [...(prev.reproductionSteps || []), ''],
    }));
  };

  const updateReproductionStep = (index: number, value: string) => {
    setReportData(prev => ({
      ...prev,
      reproductionSteps: prev.reproductionSteps?.map((step, i) => i === index ? value : step),
    }));
  };

  const removeReproductionStep = (index: number) => {
    setReportData(prev => ({
      ...prev,
      reproductionSteps: prev.reproductionSteps?.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    if (!reportData.title || !reportData.description) {
      alert('Please fill in required fields');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const finalReport: ErrorReport = {
        errorId: error.id,
        title: reportData.title!,
        description: reportData.description!,
        reproductionSteps: reportData.reproductionSteps?.filter(step => step.trim()) || [],
        expectedBehavior: reportData.expectedBehavior || '',
        actualBehavior: reportData.actualBehavior || error.message,
        userFeedback: reportData.userFeedback || '',
        severity: reportData.severity!,
        category: reportData.category!,
        tags: reportData.tags || [],
        diagnostics: reportData.privacySettings?.includeDiagnostics ? diagnostics : {},
        screenshot: reportData.privacySettings?.includeScreenshot ? screenshot || undefined : undefined,
        userInfo: reportData.privacySettings?.includePersonalData && userInfo ? {
          id: userInfo.id,
          email: userInfo.email,
          consentGiven: true,
        } : undefined,
        privacySettings: reportData.privacySettings!,
        timestamp: Date.now(),
      };

      await onSubmitReport(finalReport);
      onClose();
    } catch (submitError) {
      console.error('Failed to submit report:', submitError);
      alert('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0: // Basic Information
        return (
          <div className="space-y-4">
            <div>
              <label htmlFor="report-title" style={{ fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                Report Title *
              </label>
              <input
                id="report-title"
                type="text"
                value={reportData.title || ''}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Brief description of the issue"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
                required
              />
            </div>

            <div>
              <label htmlFor="report-description" style={{ fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                Detailed Description *
              </label>
              <textarea
                id="report-description"
                value={reportData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Provide a detailed description of what happened"
                rows={4}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical',
                }}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label htmlFor="report-severity" style={{ fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                  Severity
                </label>
                <select
                  id="report-severity"
                  value={reportData.severity}
                  onChange={(e) => handleInputChange('severity', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label htmlFor="report-category" style={{ fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                  Category
                </label>
                <select
                  id="report-category"
                  value={reportData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                >
                  <option value="chat">Chat</option>
                  <option value="api">API</option>
                  <option value="streaming">Streaming</option>
                  <option value="database">Database</option>
                  <option value="file">File Operations</option>
                  <option value="component">UI Component</option>
                  <option value="general">General</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 1: // Reproduction Steps
        return (
          <div className="space-y-4">
            <div>
              <label style={{ fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
                Steps to Reproduce
              </label>
              {reportData.reproductionSteps?.map((step, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ minWidth: '20px', fontSize: '14px', color: '#6b7280' }}>
                    {index + 1}.
                  </span>
                  <input
                    type="text"
                    value={step}
                    onChange={(e) => updateReproductionStep(index, e.target.value)}
                    placeholder={`Step ${index + 1}`}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                    }}
                  />
                  {(reportData.reproductionSteps?.length || 0) > 1 && (
                    <button
                      onClick={() => removeReproductionStep(index)}
                      style={{
                        padding: '8px',
                        background: 'none',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: '#6b7280',
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addReproductionStep}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                + Add Step
              </button>
            </div>

            <div>
              <label htmlFor="expected-behavior" style={{ fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                Expected Behavior
              </label>
              <textarea
                id="expected-behavior"
                value={reportData.expectedBehavior || ''}
                onChange={(e) => handleInputChange('expectedBehavior', e.target.value)}
                placeholder="What did you expect to happen?"
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical',
                }}
              />
            </div>

            <div>
              <label htmlFor="actual-behavior" style={{ fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                Actual Behavior
              </label>
              <textarea
                id="actual-behavior"
                value={reportData.actualBehavior || ''}
                onChange={(e) => handleInputChange('actualBehavior', e.target.value)}
                placeholder="What actually happened?"
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>
        );

      case 2: // User Feedback
        return (
          <div className="space-y-4">
            <div>
              <label htmlFor="user-feedback" style={{ fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                Additional Feedback
              </label>
              <textarea
                id="user-feedback"
                value={reportData.userFeedback || ''}
                onChange={(e) => handleInputChange('userFeedback', e.target.value)}
                placeholder="Any additional information, context, or feedback you'd like to share"
                rows={5}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical',
                }}
              />
            </div>

            {enableScreenshot && (
              <div>
                <label style={{ fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
                  Screenshot (Optional)
                </label>
                {screenshot ? (
                  <div>
                    <Image
                      src={screenshot}
                      alt="Error screenshot"
                      width={600}
                      height={400}
                      style={{ maxWidth: '100%', height: 'auto', border: '1px solid #d1d5db', borderRadius: '6px' }}
                      unoptimized
                    />
                    <button
                      onClick={() => setScreenshot(null)}
                      style={{
                        marginTop: '8px',
                        padding: '6px 12px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      Remove Screenshot
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={takeScreenshot}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    Take Screenshot
                  </button>
                )}
              </div>
            )}
          </div>
        );

      case 3: // Privacy & Diagnostics
        return (
          <div className="space-y-6">
            <div>
              <h4 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '12px' }}>
                Privacy Settings
              </h4>
              
              <div style={{ gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={reportData.privacySettings?.includePersonalData || false}
                    onChange={(e) => handlePrivacyChange('includePersonalData', e.target.checked)}
                  />
                  <span style={{ fontSize: '14px' }}>
                    Include personal data (email, user ID) for follow-up
                  </span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '8px' }}>
                  <input
                    type="checkbox"
                    checked={reportData.privacySettings?.includeDiagnostics !== false}
                    onChange={(e) => handlePrivacyChange('includeDiagnostics', e.target.checked)}
                  />
                  <span style={{ fontSize: '14px' }}>
                    Include technical diagnostics (browser info, performance data)
                  </span>
                </label>

                {screenshot && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '8px' }}>
                    <input
                      type="checkbox"
                      checked={reportData.privacySettings?.includeScreenshot || false}
                      onChange={(e) => handlePrivacyChange('includeScreenshot', e.target.checked)}
                    />
                    <span style={{ fontSize: '14px' }}>
                      Include screenshot
                    </span>
                  </label>
                )}
              </div>
            </div>

            {reportData.privacySettings?.includeDiagnostics && (
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                  Diagnostic Information
                </h4>
                <div
                  style={{
                    padding: '12px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    maxHeight: '200px',
                    overflowY: 'auto',
                  }}
                >
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(diagnostics, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        );

      case 4: // Review & Submit
        return (
          <div className="space-y-4">
            <h4 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '12px' }}>
              Review Your Report
            </h4>

            <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ marginBottom: '12px' }}>
                <strong>Title:</strong> {reportData.title}
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <strong>Category:</strong> {reportData.category} | <strong>Severity:</strong> {reportData.severity}
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <strong>Description:</strong>
                <p style={{ marginTop: '4px', fontSize: '14px' }}>{reportData.description}</p>
              </div>

              {reportData.reproductionSteps && reportData.reproductionSteps.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <strong>Reproduction Steps:</strong>
                  <ol style={{ marginTop: '4px', paddingLeft: '20px' }}>
                    {reportData.reproductionSteps.filter(step => step.trim()).map((step, index) => (
                      <li key={index} style={{ fontSize: '14px', marginBottom: '2px' }}>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '16px' }}>
                <div>Personal data: {reportData.privacySettings?.includePersonalData ? 'Included' : 'Not included'}</div>
                <div>Diagnostics: {reportData.privacySettings?.includeDiagnostics ? 'Included' : 'Not included'}</div>
                {screenshot && <div>Screenshot: {reportData.privacySettings?.includeScreenshot ? 'Included' : 'Not included'}</div>}
              </div>
            </div>

            <div style={{ 
              padding: '12px', 
              backgroundColor: '#fef3c7', 
              borderRadius: '6px',
              fontSize: '13px',
              color: '#92400e',
            }}>
              By submitting this report, you acknowledge that the information will be used to improve the application 
              and may be shared with our development team for debugging purposes.
            </div>
          </div>
        );

      default:
        return null;
    }
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

      {/* Panel */}
      <div
        ref={panelRef}
        className="error-reporting-panel"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: '600px',
          maxHeight: '90%',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1)',
          zIndex: 10001,
          overflow: 'hidden',
        }}
        tabIndex={-1}
        role="dialog"
        aria-labelledby="report-panel-title"
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2
                id="report-panel-title"
                style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#111827',
                }}
              >
                Error Report
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                Step {currentStep + 1} of {steps.length}: {steps[currentStep]}
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
              aria-label="Close report panel"
            >
              ×
            </button>
          </div>

          {/* Progress Bar */}
          <div
            style={{
              marginTop: '16px',
              width: '100%',
              height: '4px',
              backgroundColor: '#e5e7eb',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${((currentStep + 1) / steps.length) * 100}%`,
                height: '100%',
                backgroundColor: '#3b82f6',
                transition: 'width 0.3s ease',
              }}
            />
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
          {renderStep()}
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
          }}
        >
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              color: currentStep === 0 ? '#9ca3af' : '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
            }}
          >
            Previous
          </button>

          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            {currentStep + 1} of {steps.length}
          </div>

          {currentStep < steps.length - 1 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !reportData.title || !reportData.description}
              style={{
                padding: '8px 16px',
                backgroundColor: isSubmitting || !reportData.title || !reportData.description ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isSubmitting || !reportData.title || !reportData.description ? 'not-allowed' : 'pointer',
                fontSize: '14px',
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default ErrorReportingPanel;
