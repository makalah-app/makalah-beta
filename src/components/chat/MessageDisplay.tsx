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
}

export const MessageDisplay: React.FC<MessageDisplayProps> = ({
  message,
  onRegenerate,
  debugMode = false,
  citations = [],
}) => {
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
  
  
  // Extract different types of parts using standard AI SDK types
  let textParts = messageParts.filter(part => part.type === 'text');
  const fileParts = messageParts.filter(part => part.type === 'file');
  const sourceParts = messageParts.filter(part => part.type === 'source-url');
  const toolResultParts = messageParts.filter(part => part.type === 'tool-result');
  // Natural LLM intelligence generates content without duplication issues
  // No need for rigid artifact detection and content filtering
  
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

            {/* Tool Result Rendering */}
            {toolResultParts.map((part, index) => {
              const toolName = (part as any).toolName ?? 'Tool Result';
              const toolCallId = (part as any).toolCallId ?? `tool-${index}`;
              const resultPayload = (part as any).result ?? (part as any).text ?? '';

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
                      {typeof resultPayload === 'string'
                        ? resultPayload
                        : JSON.stringify(resultPayload, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              );
            })}

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
