'use client';

/**
 * MessageDisplay - Component untuk rendering chat messages dengan support untuk different message types
 * 
 * DOCUMENTATION COMPLIANCE:
 * - UIMessage structure dari /docs/07-reference/02-ai-sdk-ui/01-use-chat.mdx
 * - Message parts rendering patterns dari documentation  
 * - Support untuk text, data, source, file parts
 * 
 * DESIGN COMPLIANCE:
 * - User/AI message styling dari chat-page-styleguide.md
 * - Artifact card patterns sesuai design specification
 * - System message patterns dengan proper styling
 */

import React from 'react';
import { AcademicUIMessage } from './ChatContainer';
import { SystemMessage } from './SystemMessage';
// ❌ REMOVED: ArtifactCard import - no longer rendering artifacts in natural LLM flow
// import { PhaseApprovalGate } from './PhaseApprovalGate'; // 🔧 P0.1 REMOVED - Using natural language approval only
// ❌ REMOVED: Approval-related imports - no longer needed for natural LLM flow
// - ApprovalStatusIndicator: UI component for approval status
// - extractApprovalMetadata: Helper for extracting approval metadata
// - WORKFLOW_PHASE_CONFIG: Rigid workflow phase configuration
import {
  isToolUIPart,
  getToolName
} from 'ai';
// ❌ REMOVED: Unused imports after cleanup
// - academicTools: No longer needed for natural LLM flow
// - APPROVAL, detectApprovalIntent, isResponseToApprovalOffer, extractTextFromMessage: Approval logic removed
import { MarkdownRenderer } from '../ui/MarkdownRenderer';
// ❌ REMOVED: useWorkflow import - rigid workflow state management eliminated

interface MessageDisplayProps {
  message: AcademicUIMessage;
  onRegenerate?: () => void;
  debugMode?: boolean;
  className?: string;
  showApprovalStatus?: boolean;
  addToolResult?: (args: { toolCallId: string; tool: string; output: string }) => Promise<void>;
  sendMessage?: () => void;
  citations?: Array<{ title?: string; url: string; snippet?: string }>;
  // 🔧 Add global messages context for approval gate logic
  allMessages?: AcademicUIMessage[];
  // ❌ REMOVED: Artifact-related display options - no longer needed for natural LLM flow
  // Natural conversation doesn't need rigid artifact separation or display modes
}

export const MessageDisplay: React.FC<MessageDisplayProps> = ({
  message,
  onRegenerate,
  debugMode = false,
  citations = [],
  allMessages = [],
}) => {
  // ❌ REMOVED: Unused state variables - no longer needed for natural LLM flow
  // - revisionFeedback, setRevisionFeedback: Revision state management
  // - resolvedToolCalls: Tool call tracking
  // - fallbackUIMode: UI mode state management
  // - workflowState, workflowActions: Rigid workflow state tracking

  // ✅ AI SDK v5 Compliant: Since we only have web search tools (with execute functions), no tools require confirmation
  const toolsRequiringConfirmation: string[] = []; // Empty - only web search tools remain

  // ❌ REMOVED: Natural language approval detection logic - 42 lines of programmatic approval processing
  // Including hasRecentApprovalOffer, isUserRespondingToApproval, userApprovalIntent useMemo blocks
  // Natural LLM intelligence handles approval context without rigid detection functions

  // ❌ REMOVED: MIN_DISCUSSION_EXCHANGES constant - no longer needed for natural LLM flow
  
  // Extract approval metadata dari message
  // ❌ REMOVED: approvalMetadata extraction - natural LLM doesn't need approval metadata
  // Render different message types based on role
  if (message.role === 'system') {
    return (
      <SystemMessage
        message={message}
        debugMode={debugMode}
      />
    );
  }

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  // DEFENSIVE PROGRAMMING: Handle message format variations
  // Some messages have 'content' directly, some have 'parts'
  const messageParts = message.parts || [];
  
  // ❌ REMOVED: requiresApproval and phaseInfo - natural LLM doesn't need approval tracking
  // Natural conversation flow handles phase progression without rigid config
  // ❌ REMOVED: messageContent extraction - use parts-based rendering only for AI SDK v5 compliance
  
  // Extract different types of parts using standard AI SDK types
  let textParts = messageParts.filter(part => part.type === 'text');
  const fileParts = messageParts.filter(part => part.type === 'file');
  const sourceParts = messageParts.filter(part => part.type === 'source-url');
  const toolResultParts = messageParts.filter(part => part.type === 'tool-result');
  // ❌ REMOVED: toolResultCallIds useMemo - no longer needed for natural LLM flow
  // ❌ REMOVED: dataParts filtering - no longer rendering artifacts in natural conversation

  // ❌ REMOVED: Enhanced content duplication filter with artifact checking - 25 lines
  // Natural LLM intelligence generates content without duplication issues
  // No need for rigid artifact detection and content filtering
  
  // ❌ REMOVED: Debug logging with artifact filtering - 21 lines of rigid artifact tracking
  // Natural LLM flow doesn't need complex debug logging for artifacts
  if (debugMode) {
    console.log('[MessageDisplay] Message structure:', {
      id: message.id,
      role: message.role,
      partsCount: messageParts.length,
      textPartsCount: textParts.length
    });
  }

  return (
    <div>
      {/* User Message */}
      {isUser && (
        <div>
          <div>USER</div>
          <div>
            {/* Text Content from parts (Markdown parsed) */}
            {textParts.map((part, index) => (
              <MarkdownRenderer key={index} content={part.text || ''} />
            ))}

            {/* ❌ REMOVED: Fallback content rendering - parts-based rendering only for AI SDK v5 compliance */}

            {/* File Attachments */}
            {fileParts.map((part, index) => (
              <div key={index}>
                {part.mediaType?.startsWith('image/') ? (
                  <div>
                    <img
                      src={part.url}
                      alt={part.filename || 'Uploaded image'}
                    />
                    {part.filename && (
                      <div>{part.filename}</div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div>FILE</div>
                    <div>
                      <div>{part.filename}</div>
                      <div>{part.mediaType}</div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* ❌ REMOVED: Visual feedback for approval responses - 38 lines of rigid approval UI
                 Natural LLM handles approval through conversation without visual feedback components */}
          </div>

          {/* Debug Info */}
          {debugMode && (
            <div>
              <div>ID: {message.id}</div>
              <div>Parts: {message.parts.length}</div>
              {message.metadata && (
                <div>Metadata: {JSON.stringify(message.metadata, null, 2)}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* AI Assistant Message */}
      {isAssistant && (
        <div>
          <div className="message-header">
            <div className="role-label">ASSISTANT</div>
            
            {/* ❌ REMOVED: Approval Status Integration - 9 lines of approval UI
                 Natural LLM flow doesn't need visual approval status */}
            
            {/* ❌ REMOVED: Phase Information display - 8 lines of phase UI
                 Natural conversation flow shows phase context naturally */}
            
            {/* ❌ REMOVED: Workflow Context display - 7 lines of workflow UI
                 LLM manages context naturally without explicit step tracking */}
          </div>
          
          <div className="message-content">
            {/* Text Content from parts (Markdown parsed) */}
            {textParts.map((part, index) => (
              <MarkdownRenderer key={index} content={part.text || ''} />
            ))}
            
            {/* ❌ REMOVED: Fallback content rendering - parts-based rendering only for AI SDK v5 compliance */}

            {/* ❌ REMOVED: Complex artifact rendering logic - 42 lines of rigid artifact control
                 Including phase-completion filtering, debug logging, and format conversion
                 Natural LLM intelligence generates responses without separate artifact cards */}

            {/* ✅ AI SDK v5 HITL Tool UI Parts Rendering */}
            {message.parts?.map((part, index) => {
              // ✅ Handle tool UI parts using AI SDK v5 patterns
              if (part && isToolUIPart(part)) {
                const toolName = getToolName(part);
                const toolCallId = (part as any).toolCallId;

                // ✅ Render approval UI for phase completion tools
                if (toolName && toolsRequiringConfirmation.includes(toolName) && part.state === 'input-available') {
                  // 🔧 P0.1 ENHANCED DEBUGGING: Include natural language approval context
                  // ❌ REMOVED: Complex approval gate evaluation - 14 lines of debug logging
                  // Natural LLM intelligence handles approval without complex state tracking

                  // ❌ REMOVED: Guard 0 logic - 10 lines of duplicate detection
                  // LLM naturally avoids generating duplicate tool calls

                  // ❌ REMOVED: Natural language approval mode and Guard 1 - 12 lines of phase validation
                  // LLM naturally handles phase progression without rigid control

                  // ❌ REMOVED: Guard 1b - 4 lines of completed phase validation
                  // LLM tracks completion state naturally

                  // ❌ REMOVED: Complex gate rendering logic - 22 lines of permissive gate logic
                  // LLM handles completion detection without complex state analysis

                  // ❌ REMOVED: Guard 2 & 3 - 8 lines of optimistic resolution logic
                  // Natural LLM flow doesn't need complex duplicate detection

                  // ❌ REMOVED: handlePhaseApproval function - 39 lines of programmatic approval logic
                  // LLM handles approval naturally through conversation

                  // ❌ REMOVED: handlePhaseRevision function - 28 lines of revision handling logic
                  // LLM processes revision feedback naturally via conversation

                  // ❌ REMOVED: Approval gate UI rendering - 20 lines of UI block
                  // Natural conversation flow doesn't need visual approval gates
                  return null;
                }

                // ❌ REMOVED: Phase progression confirmation UI - 39 lines of rigid UI control
                // LLM handles phase transitions naturally through conversation
                if (toolName === 'phase_progression_confirm' && part.state === 'input-available') {
                  return null;
                }

                // ✅ Display tool execution results
                if (part.state === 'output-available' && toolCallId) {
                  return (
                    <div key={`tool-result-${toolCallId}`} className="tool-result-display">
                      <div className="tool-result-header">
                        <span className="tool-name">🔧 {toolName}</span>
                        <span className="tool-status">✅ Completed</span>
                      </div>
                      <div className="tool-result-content">
                        {typeof (part as any).result === 'string'
                          ? (part as any).result
                          : JSON.stringify((part as any).result, null, 2)}
                      </div>
                    </div>
                  );
                }

                // ❌ REMOVED: Tool execution status display - 14 lines of tool state tracking
                // Natural LLM flow with web search tools doesn't need execution status UI
              }

              return null;
            }).filter(Boolean)}

            {/* Source References - using standard source-url parts */}
            {sourceParts.length > 0 && (
              <div>
                <h4>Sources</h4>
                <div>
                  {sourceParts.map((source, index) => (
                    <div key={index}>
                      {source.url ? (
                        <a 
                          href={source.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          {source.title || new URL(source.url).hostname}
                        </a>
                      ) : (
                        <span>
                          {source.title || `Document ${index + 1}`}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ❌ REMOVED: References (footnotes) - eliminated to prevent source duplication */}
            {/* Sources are now handled exclusively via sourceParts for consistency */}

            {/* Message Actions */}
            <div>
              <button
                onClick={onRegenerate}
                title="Regenerate response"
              >
                Regenerate
              </button>
              
              <button
                title="Copy message"
                onClick={() => {
                  const textContent = textParts.map(part => part.text).join('\n');
                  navigator.clipboard.writeText(textContent);
                }}
              >
                Copy
              </button>
            </div>

            {/* Enhanced Metadata Display dengan Approval Context */}
             <div className="message-metadata">
               {message.metadata && (
                 <div className="metadata-grid">
                   {message.metadata.timestamp && (
                     <span className="metadata-item">
                       ⏰ {new Date(message.metadata.timestamp).toLocaleTimeString()}
                     </span>
                   )}
                   {message.metadata.tokens && (
                     <span className="metadata-item">
                       🔢 {message.metadata.tokens} tokens
                     </span>
                   )}
                   {message.metadata.model && (
                     <span className="metadata-item">
                       🤖 {message.metadata.model}
                     </span>
                   )}
                 </div>
               )}
              
              {/* ❌ REMOVED: Approval Context Information - 14 lines of approval debug
                   Natural LLM doesn't need approval state debugging */}
              
              {/* ❌ REMOVED: Workflow Dependencies - 12 lines of dependency tracking
                   LLM manages dependencies naturally without explicit tracking */}
              
              {/* ❌ REMOVED: Workflow Outputs - 12 lines of output tracking
                   LLM produces outputs naturally without explicit tracking */}
            </div>

           {/* Enhanced Debug Info dengan Approval Context */}
            {/* Debug info dihilangkan supaya UI tetap bersih */}
          </div>
          
          {/* ❌ REMOVED: Approval Action Hint - 6 lines of approval UI guidance
               Natural conversation doesn't need explicit approval prompts */}
        </div>
      )}
    </div>
  );
};

export default MessageDisplay;
