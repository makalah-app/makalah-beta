'use client';

/**
 * MessageDisplay - Component untuk rendering chat messages dengan support untuk different message types
 *
 * MIGRATED TO AI ELEMENTS:
 * - Uses AI Elements Message, MessageContent, MessageAvatar components
 * - Preserves existing markdown rendering dan tool result display logic
 * - Integrates dengan existing AcademicUIMessage structure
 *
 * DESIGN COMPLIANCE:
 * - AI Elements styling dengan shadcn/ui base components
 * - Consistent avatar dan message bubble patterns
 * - Preserves academic metadata dan debug information
 */

import React from 'react';
import { AcademicUIMessage } from './ChatContainer';
import { SystemMessage } from './SystemMessage';
// AI Elements Message components
import {
  Message,
  MessageContent,
  MessageAvatar,
} from '../ai-elements/message';
import {
  isToolUIPart,
  getToolName
} from 'ai';
import { MarkdownRenderer } from '../ui/MarkdownRenderer';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

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
        <Message from="user">
          <MessageAvatar
            src="/images/user-avatar.png"
            name="User"
          />
          <MessageContent>
            {/* Text Content from parts (Markdown parsed) */}
            {textParts.map((part, index) => (
              <MarkdownRenderer key={index} content={part.text || ''} />
            ))}

            {/* File Attachments */}
            {fileParts.map((part, index) => (
              <div key={index} className="mt-2">
                {part.mediaType?.startsWith('image/') ? (
                  <div className="relative">
                    <img
                      src={part.url}
                      alt={part.filename || 'Uploaded image'}
                      className="max-w-xs rounded-lg border"
                    />
                    {part.filename && (
                      <div className="mt-1 text-xs text-muted-foreground">{part.filename}</div>
                    )}
                  </div>
                ) : (
                  <Card className="max-w-xs">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">📎 File Attachment</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      <div className="text-sm font-medium">{part.filename}</div>
                      <div className="text-xs text-muted-foreground">{part.mediaType}</div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ))}
          </MessageContent>

          {/* Debug Info */}
          {debugMode && (
            <Card className="mt-2 border-dashed border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950">
              <CardContent className="p-3 text-xs">
                <div>ID: {message.id}</div>
                <div>Parts: {message.parts.length}</div>
                {message.metadata && (
                  <div>Metadata: {JSON.stringify(message.metadata, null, 2)}</div>
                )}
              </CardContent>
            </Card>
          )}
        </Message>
      )}

      {/* AI Assistant Message */}
      {isAssistant && (
        <Message from="assistant">
          <MessageAvatar
            src="/images/ai-avatar.png"
            name="AI"
          />
          <MessageContent>
            {/* Text Content from parts (Markdown parsed) */}
            {textParts.map((part, index) => (
              <MarkdownRenderer key={index} content={part.text || ''} />
            ))}

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
                    <Card key={`tool-result-${toolCallId}`} className="mt-3">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <span className="text-lg">🔧</span>
                          <span>{toolName}</span>
                          <span className="ml-auto text-xs text-green-600 dark:text-green-400">✅ Completed</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm">
                        <pre className="whitespace-pre-wrap">
                          {typeof (part as any).result === 'string'
                            ? (part as any).result
                            : JSON.stringify((part as any).result, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                  );
                }
              }

              return null;
            }).filter(Boolean)}

            {/* Source References - using standard source-url parts */}
            {sourceParts.length > 0 && (
              <Card className="mt-3">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">📚 Sources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {sourceParts.map((source, index) => (
                    <div key={index} className="text-sm">
                      {source.url ? (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
                        >
                          {source.title || new URL(source.url).hostname}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">
                          {source.title || `Document ${index + 1}`}
                        </span>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Message Actions */}
            <div className="mt-3 flex gap-2">
              <Button
                onClick={onRegenerate}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                🔄 Regenerate
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  const textContent = textParts.map(part => part.text).join('\n');
                  navigator.clipboard.writeText(textContent);
                }}
              >
                📋 Copy
              </Button>
            </div>

            {/* Enhanced Metadata Display */}
            {message.metadata && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                {message.metadata.timestamp && (
                  <span className="flex items-center gap-1">
                    ⏰ {new Date(message.metadata.timestamp).toLocaleTimeString()}
                  </span>
                )}
                {message.metadata.tokens && (
                  <span className="flex items-center gap-1">
                    🔢 {message.metadata.tokens} tokens
                  </span>
                )}
                {message.metadata.model && (
                  <span className="flex items-center gap-1">
                    🤖 {message.metadata.model}
                  </span>
                )}
              </div>
            )}
          </MessageContent>

          {/* Debug Info */}
          {debugMode && (
            <Card className="mt-2 border-dashed border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950">
              <CardContent className="p-3 text-xs">
                <div>ID: {message.id}</div>
                <div>Parts: {message.parts.length}</div>
                {message.metadata && (
                  <div>Metadata: {JSON.stringify(message.metadata, null, 2)}</div>
                )}
              </CardContent>
            </Card>
          )}
        </Message>
      )}
    </div>
  );
};

export default MessageDisplay;
