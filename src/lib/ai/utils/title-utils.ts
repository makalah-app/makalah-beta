/**
 * Shared utilities for generating and sanitizing conversation titles.
 * Keeps tooling aligned with AISDK guidance by avoiding behavioural programming
 * while still enforcing presentation constraints.
 */

export interface SanitizeTitleOptions {
  maxLength?: number;
}

export function sanitizeTitle(input: string, options: SanitizeTitleOptions = {}): string {
  const { maxLength } = options;
  let title = (input || '').trim();

  if (
    (title.startsWith('"') && title.endsWith('"')) ||
    (title.startsWith('\'') && title.endsWith('\''))
  ) {
    title = title.slice(1, -1).trim();
  }

  title = title.replace(/[\s\-–—:;,.!?]+$/g, '').replace(/\s+/g, ' ').trim();

  if (/^new (academic )?chat$/i.test(title) || /^test\s+chat(\s+history)?$/i.test(title)) {
    title = '';
  }

  if (!title) {
    return '';
  }

  title = title
    .split(' ')
    .map((word) => (word.length > 2 ? `${word[0].toUpperCase()}${word.slice(1)}` : word.toLowerCase()))
    .join(' ');

  if (typeof maxLength === 'number' && maxLength > 0 && title.length > maxLength) {
    const truncated = title.substring(0, maxLength - 3);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxLength - 11) {
      return `${truncated.substring(0, lastSpace).trim()}...`;
    }
    return `${truncated.trim()}...`;
  }

  return title;
}

export function hashStrings(values: readonly string[], seed = 1315423911): string {
  const normalised = values.map((value) => value.trim()).join('||');
  let hash = seed;
  for (let i = 0; i < normalised.length; i += 1) {
    hash ^= (hash << 5) + normalised.charCodeAt(i) + (hash >> 2);
  }
  return Math.abs(hash >>> 0).toString(16);
}
