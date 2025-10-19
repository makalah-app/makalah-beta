import type { HandoffInputData, HandoffInputFilter } from '@ai-sdk-tools/agents';

// Keep only the last N messages from input history and always preserve newItems
export function keepLastNMessages(n: number): HandoffInputFilter {
  return (input: HandoffInputData): HandoffInputData => {
    const last = Math.max(0, Number.isFinite(n) ? Math.floor(n) : 0);
    const trimmedHistory = input.inputHistory.slice(-last);
    return {
      ...input,
      inputHistory: trimmedHistory,
      // Always preserve new items produced in the current turn (including tool results)
      newItems: input.newItems || [],
    };
  };
}

