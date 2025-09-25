/**
 * Simplified Content Utilities - Natural LLM Intelligence Focus
 * Basic text processing for search results, trusting LLM intelligence
 *
 * Based on cleanup philosophy: Remove programmatic control, enable natural conversation
 */

/**
 * Simple content processing utilities for search results
 */
export class ContentUtils {
  /**
   * Clean and normalize text content
   */
  static cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract plain text from HTML (for search results)
   */
  static htmlToText(html: string): string {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&[^;]+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Format text for display (truncate with ellipsis)
   */
  static formatForDisplay(text: string, maxLength: number = 100): string {
    if (text.length <= maxLength) return text;

    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');

    if (lastSpace > maxLength * 0.7) {
      return text.substring(0, lastSpace) + '...';
    }

    return truncated + '...';
  }
}

// Export individual utilities
export const {
  cleanText,
  htmlToText,
  formatForDisplay,
} = ContentUtils;

// Export default
export default ContentUtils;