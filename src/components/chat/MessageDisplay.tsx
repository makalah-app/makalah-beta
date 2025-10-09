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
import Image from 'next/image';
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
import { CitationMarker } from '../ui/CitationMarker';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { RefreshCw, Copy, Edit, BookOpen, ChevronDown, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
// New reusable components
import { MessageEditor } from './MessageEditor';
import { MessageActions, MessageAction, AssistantActions } from './MessageActions';
import { ToolResult } from './ToolResult';
import { WorkflowArtifactDisplay } from './WorkflowArtifactDisplay';

type SourcePart = {
  type: 'source-url';
  url?: string;
  title?: string;
  snippet?: string;
  metadata?: {
    provider?: {
      name?: string;
    };
  };
};

const normalizeCitationKey = (value: string | undefined) => {
  if (!value) return '';

  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '')
    .replace(/[.,;:!?]+$/, '')
    .replace(/\s+/g, '');
};

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
  // 📚 Rujukan collapsible state - default collapsed for cleaner UI
  const [referencesOpen, setReferencesOpen] = React.useState(false);

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

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isSystem = message.role === 'system';

  // DEFENSIVE PROGRAMMING: Handle message format variations
  // Some messages have 'content' directly, some have 'parts'
  const messageParts = message.parts || [];

  // ❌ REMOVED: requiresApproval and phaseInfo - natural LLM doesn't need approval tracking
  // Natural conversation flow handles phase progression without rigid config
  // ❌ REMOVED: messageContent extraction - use parts-based rendering only for AI SDK v5 compliance

  // Extract different types of parts using standard AI SDK types
  let textParts = messageParts.filter(part => part.type === 'text');
  const fileParts = messageParts.filter(part => part.type === 'file');
  const sourceParts = messageParts.filter(part => part.type === 'source-url') as SourcePart[];
  const toolResultParts = messageParts.filter(part => part.type === 'tool-result');

  // CRITICAL: All React hooks MUST be declared before ANY conditional returns
  // This fixes React Hook Rules violations detected by Vercel's stricter ESLint
  const uniqueSourceParts = React.useMemo(() => {
    // Always process, return empty array for system messages later
    if (sourceParts.length === 0) return [] as SourcePart[];

    const seen = new Set<string>();
    const unique: SourcePart[] = [];

    for (const source of sourceParts) {
      const key = source.url ? normalizeCitationKey(source.url) : undefined;
      if (!key) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(source);
    }

    return unique;
  }, [sourceParts]);

  const citationHostMap = React.useMemo(() => {
    // Always process, return empty object if no sources
    if (uniqueSourceParts.length === 0) {
      return {} as Record<string, { index: number }>;
    }

    const map: Record<string, { index: number }> = {};

    uniqueSourceParts.forEach((source, idx) => {
      const index = idx + 1;
      const candidates = new Set<string>();

      if (source.url) {
        candidates.add(source.url);
        try {
          const url = new URL(source.url);
          candidates.add(url.hostname);
          if (url.hostname.startsWith('www.')) {
            candidates.add(url.hostname.replace(/^www\./, ''));
          }
        } catch (error) {
          // ignore invalid URL formats
        }
      }

      if (source.title) {
        candidates.add(source.title);
      }

      const providerName = source.metadata?.provider?.name;
      if (providerName) {
        candidates.add(providerName);
      }

      candidates.forEach(candidate => {
        const normalized = normalizeCitationKey(candidate);
        if (!normalized) return;
        if (!map[normalized]) {
          map[normalized] = { index };
        }
      });
    });

    return map;
  }, [uniqueSourceParts]);

  // Fix: Calculate this after hooks, not as part of hook dependency
  const shouldAnnotateCitations = !isSystem && isAssistant && uniqueSourceParts.length > 0;

  const citationTargets = React.useMemo(() => {
    // Always process, return empty object if no sources
    const targets: Record<number, { url?: string; title?: string; snippet?: string }> = {};

    uniqueSourceParts.forEach((source, idx) => {
      const index = idx + 1;
      targets[index] = {
        url: source.url,
        title: source.title,
        snippet: source.snippet,
      };
    });

    return targets;
  }, [uniqueSourceParts]);

  const annotateTextWithCitations = React.useCallback(
    (text: string): string => {
      // Check conditions inside the function, not in hook dependencies
      if (!text?.trim() || isSystem || !shouldAnnotateCitations) {
        return text;
      }

      const linkPattern = /\s*\((\[[^\]]+\]\([^\)]+\))\)/g;
      const markdownLinkRegex = /\[([^\]]+)\]\(([^\)]+)\)/;

      const replaceWithPlaceholder = (
        match: string,
        inner: string
      ) => {
        const leadingSpace = match.match(/^\s*/)?.[0] ?? '';

        const candidates = new Set<string>();

        const linkMatch = markdownLinkRegex.exec(inner);
        if (linkMatch) {
          const [, label, href] = linkMatch;
          candidates.add(label);
          candidates.add(href);
        } else {
          candidates.add(inner);
        }

        for (const candidate of candidates) {
          const normalized = normalizeCitationKey(candidate);
          if (!normalized) continue;
          const citationInfo = citationHostMap[normalized];
          if (citationInfo) {
            return `${leadingSpace}{{citation:${citationInfo.index}}}`;
          }
        }

        return match;
      };

      let updated = text.replace(linkPattern, replaceWithPlaceholder);

      updated = updated.replace(/\s*\(([^)]+)\)/g, (match, inner) => {
        if (inner.includes('{{citation:')) {
          return match;
        }
        return replaceWithPlaceholder(match, inner);
      });

      return updated;
    },
    [isSystem, shouldAnnotateCitations, citationHostMap]
  );
  // ❌ REMOVED: toolResultCallIds useMemo - no longer needed for natural LLM flow
  // ❌ REMOVED: dataParts filtering - no longer rendering artifacts in natural conversation

  // ❌ REMOVED: Enhanced content duplication filter with artifact checking - 25 lines
  // Natural LLM intelligence generates content without duplication issues
  // No need for rigid artifact detection and content filtering

  // CRITICAL: All conditional returns MUST come AFTER hooks declarations
  // This is the proper place for early returns after all hooks are defined
  if (isSystem) {
    return (
      <SystemMessage
        message={message}
        debugMode={debugMode}
      />
    );
  }

  // ❌ REMOVED: Debug logging with artifact filtering - 21 lines of rigid artifact tracking
  // Natural LLM flow doesn't need complex debug logging for artifacts
  if (debugMode) {
    
  }

  return (
    <div>
      {/* User Message */}
      {isUser && (
        <Message from="user">
          <div className="flex flex-col items-end gap-1">
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
                  <MarkdownRenderer
                    key={index}
                    content={part.text || ''}
                  />
                ))}

                {/* File Attachments */}
                {fileParts.map((part, index) => (
                  <div key={index} className="mt-2">
                    {part.mediaType?.startsWith('image/') ? (
                      <div className="relative max-w-xs">
                        <Image
                          src={part.url}
                          alt={part.filename || 'Uploaded image'}
                          width={400}
                          height={400}
                          className="rounded-lg border w-full h-auto"
                          unoptimized
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

              </>
            )}
            </MessageContent>

            {/* Edit Action - Below message box, right-aligned */}
            {!isEditing && (
              <MessageAction
                icon={Edit}
                onClick={() => onStartEdit?.(message.id, textParts[0]?.text || '')}
                tooltip="Edit percakapan"
                label="Edit Percakapan"
              />
            )}
          </div>

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
                  // Check if this is a historical message (created more than 5 seconds ago)
                  const messageAge = message.metadata?.timestamp
                    ? Date.now() - message.metadata.timestamp
                    : 0;
                  const isHistorical = messageAge > 5000; // More than 5 seconds old

                  return (
                    <ToolResult
                      key={`tool-result-${toolCallId}`}
                      result={(part as any).result}
                      status="success"
                      isHistorical={isHistorical}
                    />
                  );
                }
              }

              return null;
            }).filter(Boolean)}

            {/* Loading state: Show searching indicator if sources exist but no text yet */}
            {!isSystem && uniqueSourceParts.length > 0 && textParts.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground italic">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Mencari informasi...
              </div>
            )}

            {/* Text Content from parts (Markdown parsed) - MOVED AFTER tool UI parts */}
            {textParts.map((part, index) => {
              const processedContent = annotateTextWithCitations(part.text || '');

              return (
                <MarkdownRenderer
                  key={index}
                  content={processedContent}
                  citationMap={shouldAnnotateCitations && !isSystem ? citationHostMap : undefined}
                  citationTargets={shouldAnnotateCitations && !isSystem ? citationTargets : undefined}
                />
              );
            })}

            {/* Source References - using standard source-url parts */}
            {!isSystem && uniqueSourceParts.length > 0 && (
              <Card className="mt-3">
                <Collapsible open={referencesOpen} onOpenChange={setReferencesOpen}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors py-3">
                      <CardTitle className="text-xs flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>Rujukan ({uniqueSourceParts.length})</span>
                        </div>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform duration-200",
                            referencesOpen && "rotate-180"
                          )}
                        />
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="space-y-2">
                      {uniqueSourceParts.map((source, index) => {
                        // Extract hostname safely
                        let hostname = 'Source';
                        try {
                          hostname = source.url ? new URL(source.url).hostname : 'Source';
                        } catch (error) {
                          // Invalid URL - use default hostname
                        }

                        // Format current date in Indonesian
                        const date = new Date();
                        const formattedDate = `${date.getDate()} ${date.toLocaleDateString('id-ID', { month: 'long' })} ${date.getFullYear()}`;

                        return (
                          <div key={index} className="text-xs text-muted-foreground mb-2 last:mb-0">
                            {/* Title line dengan bullet */}
                            <div>• {source.title || 'Untitled'}</div>

                            {/* Source info line dengan indent + hover preview */}
                            <div className="ml-3 mt-0.5 inline-flex items-center gap-1">
                              {source.url ? (
                                <>
                                  <CitationMarker
                                    index={index + 1}
                                    href={source.url}
                                    title={source.title}
                                    description={source.snippet}
                                    className="ml-0"
                                  />
                                  <a
                                    href={source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:underline"
                                    style={{ color: 'var(--source-link)' }}
                                  >
                                    {hostname}
                                  </a>
                                </>
                              ) : (
                                <span>{hostname}</span>
                              )}
                              <span>, {formattedDate}</span>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )}

            {/* Assistant Actions */}
            <AssistantActions>
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

            {/* Enhanced Metadata Display - HIDDEN for cleaner UX (Phase 02 cleanup) */}
            {/* Token and model info hidden but still available in metadata for debugging */}
            {/* Uncomment to restore: message.metadata && (message.metadata.tokens || message.metadata.model) */}
            {/* {message.metadata && (message.metadata.tokens || message.metadata.model) && (
              (() => {
                const tokenInfo = message.metadata.tokens;
                const totalTokens = typeof tokenInfo === 'number' ? tokenInfo : tokenInfo?.total;
                return (
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                {typeof totalTokens === 'number' && Number.isFinite(totalTokens) && (
                  <span className="flex items-center gap-1">
                    🔢 {totalTokens} tokens
                  </span>
                )}
                {message.metadata.model && (
                  <span className="flex items-center gap-1">
                    🤖 {message.metadata.model}
                  </span>
                )}
              </div>
                );
              })()
            )} */}

            {/* Workflow Artifact Display - Task 2.2 */}
            {message.metadata && message.metadata.phase && (
              <WorkflowArtifactDisplay metadata={message.metadata} />
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
