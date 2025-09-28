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
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { RefreshCw, Copy, Edit } from 'lucide-react';
// New reusable components
import { MessageEditor } from './MessageEditor';
import { MessageActions, MessageAction, AssistantActions } from './MessageActions';
import { ToolResult } from './ToolResult';

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
  // 📝 EDIT MESSAGE PROPS: Enhanced edit functionality
  isEditing?: boolean;
  editingText?: string;
  onStartEdit?: (messageId: string, text: string) => void;
  onSaveEdit?: (messageId: string, text: string) => void;
  onCancelEdit?: () => void;
  onEditingTextChange?: (text: string) => void;
  editAreaRef?: React.RefObject<HTMLDivElement>;
  // ❌ REMOVED: Artifact-related display options - no longer needed for natural LLM flow
  // Natural conversation doesn't need rigid artifact separation or display modes
}

export const MessageDisplay: React.FC<MessageDisplayProps> = ({
  message,
  onRegenerate,
  debugMode = false,
  citations = [],
  allMessages = [],
  // 📝 EDIT MESSAGE PROPS: Enhanced edit functionality
  isEditing = false,
  editingText = '',
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditingTextChange,
  editAreaRef,
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
          <MessageContent className={isEditing ? "!max-w-none" : "message-content-user"}>
            {/* 📝 EDIT MODE: Clean component-based approach */}
            {isEditing ? (
              <MessageEditor
                ref={editAreaRef}
                value={editingText}
                onChange={onEditingTextChange || (() => {})}
                onSave={() => onSaveEdit?.(message.id, editingText)}
                onCancel={onCancelEdit || (() => {})}
              />
            ) : (
              <>
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

                {/* Edit Action */}
                <MessageActions>
                  <MessageAction
                    icon={Edit}
                    onClick={() => onStartEdit?.(message.id, textParts[0]?.text || '')}
                    tooltip="Edit percakapan"
                    label="Edit Percakapan"
                  />
                </MessageActions>
              </>
            )}
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
          <MessageContent>
            {/* ✅ AI SDK v5 HITL Tool UI Parts Rendering - MOVED BEFORE text content */}
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

                // ✅ Display tool execution results using clean component
                if (part.state === 'output-available' && toolCallId) {
                  return (
                    <ToolResult
                      key={`tool-result-${toolCallId}`}
                      result={(part as any).result}
                      status="success"
                    />
                  );
                }
              }

              return null;
            }).filter(Boolean)}

            {/* Text Content from parts (Markdown parsed) - MOVED AFTER tool UI parts */}
            {textParts.map((part, index) => (
              <MarkdownRenderer key={index} content={part.text || ''} />
            ))}

            {/* Source References - using standard source-url parts */}
            {sourceParts.length > 0 && (
              <Card className="mt-3">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">📚 Sources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(() => {
                    // Deduplicate sources based on URL
                    const uniqueSourceParts = sourceParts.filter((source, index, self) =>
                      index === self.findIndex(s => s.url === source.url)
                    );

                    return uniqueSourceParts.map((source, index) => {
                      // Extract hostname safely
                      let hostname = 'Source';
                      try {
                        hostname = source.url ? new URL(source.url).hostname : 'Source';
                      } catch (error) {
                        console.warn('Invalid URL in source:', source.url);
                      }

                      // Format current date in Indonesian
                      const date = new Date();
                      const formattedDate = `${date.getDate()}, ${date.toLocaleDateString('id-ID', { month: 'long' })}, ${date.getFullYear()}`;

                      return (
                        <div key={index} className="text-sm text-muted-foreground">
                          <span>{source.title || 'Untitled'}</span>
                          <span> - </span>
                          {source.url ? (
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:underline"
                            >
                              {hostname}
                            </a>
                          ) : (
                            <span>{hostname}</span>
                          )}
                          <span>, {formattedDate}</span>
                        </div>
                      );
                    });
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Assistant Actions with timestamp */}
            <AssistantActions
              timestamp={message.metadata?.timestamp ? new Date(message.metadata.timestamp).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              }) : undefined}
            >
              <MessageAction
                icon={RefreshCw}
                onClick={onRegenerate}
                tooltip="Regenerasi respons"
                label="Regenerasi respons"
              />
              <MessageAction
                icon={Copy}
                onClick={() => {
                  const textContent = textParts.map(part => part.text).join('\n');
                  navigator.clipboard.writeText(textContent);
                }}
                tooltip="Salin percakapan"
                label="Salin percakapan"
              />
            </AssistantActions>

            {/* Enhanced Metadata Display */}
            {message.metadata && (message.metadata.tokens || message.metadata.model) && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
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
