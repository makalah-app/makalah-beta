/**
 * Simplified Tool Utilities - Natural LLM Intelligence Focus
 * Basic utilities for search functionality, trusting LLM intelligence
 *
 * Based on cleanup philosophy: Remove programmatic control, enable natural conversation
 */

/**
 * Simple tool utilities for search functionality
 */
export class ToolUtils {
  /**
   * Sanitize search input
   */
  static sanitizeInput(input: string): string {
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  }

  /**
   * Format text with ellipsis
   */
  static truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Parse simple query parameters
   */
  static parseQueryParams(query: string): Record<string, string> {
    const params: Record<string, string> = {};
    const pairs = query.split('&');

    pairs.forEach(pair => {
      const [key, value] = pair.split('=');
      if (key && value) {
        params[decodeURIComponent(key)] = decodeURIComponent(value);
      }
    });

    return params;
  }
}

// Export individual utilities
export const {
  sanitizeInput,
  truncateText,
  parseQueryParams,
} = ToolUtils;

// Export default
export default ToolUtils;