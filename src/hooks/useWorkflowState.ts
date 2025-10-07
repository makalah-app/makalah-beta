import { useMemo } from 'react';
import type { AcademicUIMessage, WorkflowMetadata } from '../lib/types/academic-message';

/**
 * Extract latest workflow state from message history
 * Uses memoization for performance
 */
export function useWorkflowState(messages: AcademicUIMessage[]): WorkflowMetadata {
  return useMemo(() => {
    // Filter assistant messages and reverse to get latest first
    const assistantMessages = messages
      .filter(m => m.role === 'assistant')
      .reverse();

    // Find first message with workflow metadata
    const latestWithMetadata = assistantMessages.find(
      m => m.metadata?.milestone
    );

    if (latestWithMetadata?.metadata) {
      return latestWithMetadata.metadata;
    }

    // Default initial state
    return {
      milestone: 'exploring',
      progress: 0.05,
      artifacts: {},
      timestamp: new Date().toISOString()
    };
  }, [messages.length, messages[messages.length - 1]?.id]); // Only recompute when message count or latest ID changes
}
