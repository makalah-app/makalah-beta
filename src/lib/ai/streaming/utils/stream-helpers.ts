/**
 * Stream Helpers - Simplified Natural LLM Intelligence
 *
 * Simplified stream utilities following the philosophy:
 * "Trust natural LLM intelligence instead of rigid programmatic control"
 *
 * Based on AI SDK v5 Core streamText:
 * - /documentation/docs/03-ai-sdk-core/05-generating-text.mdx
 */

/**
 * Generate unique ID
 */
export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format duration
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Simple debounce
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Export for legacy support
const streamHelpers = {
  generateId,
  formatDuration,
  debounce,
};

export default streamHelpers;
