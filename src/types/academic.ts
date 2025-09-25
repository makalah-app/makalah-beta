// Academic UI Message Types for ConversationDepthAnalyzer
// Based on actual message structure used in chat route

export interface AcademicUIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts: Array<{
    type: 'text' | 'tool-call' | 'tool-result';
    text?: string;
    toolName?: string;
    toolCallId?: string;
    result?: unknown;
  }>;
  metadata?: {
    userId?: string;
    username?: string;
    phase?: string;
    timestamp?: string;
    [key: string]: unknown;
  };
}

