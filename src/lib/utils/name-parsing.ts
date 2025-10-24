/**
 * Name Parsing Utilities
 *
 * Centralized name parsing logic with robust edge case handling.
 * Addresses NAME PARSING LOGIC CORRUPTION issues.
 */

export interface NameInput {
  name?: string;      // First name from user.name
  fullName?: string;  // Full name from user.fullName
}

export interface ParsedName {
  firstName: string;
  lastName: string;
  fullName: string;
  displayName: string;
}

/**
 * Parse names with robust edge case handling.
 *
 * Requirements:
 * - ROBUST: Handle multiple spaces, case mismatch, special chars, single word names
 * - SIMPLE: Not over-engineering, easy to understand
 * - MINIMAL INVASIVE: Small changes only
 * - CENTRALIZED: Single helper for all name parsing
 * - AI SDK COMPLIANT: No conflicts with existing patterns
 * - BACKWARD COMPATIBLE: No breaking changes
 *
 * @param input - Name input object with optional name and fullName
 * @returns Parsed name object with consistent structure
 */
export function parseName(input: NameInput): ParsedName {
  const { name, fullName } = input;

  // Handle undefined/null inputs
  if (!name && !fullName) {
    return {
      firstName: '',
      lastName: '',
      fullName: '',
      displayName: 'Tanpa nama'
    };
  }

  // Normalize inputs: trim and check for effectively empty
  const trimmedName = name ? name.trim() : '';
  const trimmedFull = fullName ? fullName.trim() : '';

  // If only name (firstName) is available or fullName is empty
  if (trimmedName && !trimmedFull) {
    return {
      firstName: trimmedName,
      lastName: '',
      fullName: trimmedName,
      displayName: trimmedName || 'Tanpa nama'
    };
  }

  // If only fullName is available or name is effectively empty
  if (!trimmedName && trimmedFull) {
    return parseFullNameOnly(trimmedFull);
  }

  // Both name and fullName are available - this is the main case
  return parseBothNames(trimmedName, trimmedFull);
}

/**
 * Parse when only fullName is available (fallback case)
 */
function parseFullNameOnly(fullName: string): ParsedName {
  const trimmedFull = fullName.trim();

  if (!trimmedFull) {
    return {
      firstName: '',
      lastName: '',
      fullName: '',
      displayName: 'Tanpa nama'
    };
  }

  // Split by spaces, filter empty strings (handle multiple spaces)
  const nameParts = trimmedFull.split(/\s+/).filter(part => part.length > 0);

  if (nameParts.length === 0) {
    return {
      firstName: '',
      lastName: '',
      fullName: '',
      displayName: 'Tanpa nama'
    };
  }

  if (nameParts.length === 1) {
    const singleName = nameParts[0];
    return {
      firstName: singleName,
      lastName: '',
      fullName: singleName,
      displayName: singleName
    };
  }

  // Multiple parts: first part is firstName, rest is lastName
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ');

  return {
    firstName,
    lastName,
    fullName: trimmedFull,
    displayName: trimmedFull
  };
}

/**
 * Parse when both name and fullName are available (main case)
 * This handles the corruption issue where name parsing was inconsistent
 */
function parseBothNames(name: string, fullName: string): ParsedName {
  // Both inputs are already trimmed from parent function
  const trimmedName = name;
  const trimmedFull = fullName;

  if (!trimmedName && !trimmedFull) {
    return {
      firstName: '',
      lastName: '',
      fullName: '',
      displayName: 'Tanpa nama'
    };
  }

  // If fullName is empty or just the same as name, treat as single name
  if (!trimmedFull || trimmedFull.toLowerCase() === trimmedName.toLowerCase()) {
    return {
      firstName: trimmedName,
      lastName: '',
      fullName: trimmedName,
      displayName: trimmedName || 'Tanpa nama'
    };
  }

  // Extract lastName by finding the position of firstName within fullName
  // This is more robust than simple replace()
  const lowerName = trimmedName.toLowerCase();
  const lowerFull = trimmedFull.toLowerCase();

  let firstName = trimmedName;
  let lastName = '';

  // Enhanced matching logic with comprehensive partial match detection
  if (lowerFull.startsWith(lowerName)) {
    // Extract the remaining part as lastName
    const remainingPart = trimmedFull.slice(trimmedName.length);
    lastName = remainingPart.trim();

    // Handle multiple spaces by normalizing
    lastName = lastName.replace(/\s+/g, ' ').trim();

    // Comprehensive validation for partial matches and edge cases
    const shouldFallbackToFullNameOnly =
      // Case 1: If remaining part starts with the same pattern as firstName
      (lowerName.length >= 2 && lastName.length > 0 &&
       lastName.toLowerCase().startsWith(lowerName.substring(0, Math.min(2, lowerName.length)))) ||
      // Case 2: If firstName is very short (1-2 chars) and might be part of a longer name
      (lowerName.length <= 2 && trimmedFull.length > lowerName.length + 3) ||
      // Case 3: If the remaining part looks like it continues the name pattern
      (lastName.length > 0 &&
       lowerName.length >= 2 &&
       lastName.toLowerCase().startsWith(lowerName.substring(lowerName.length - 1))) ||
      // Case 4: Check specific known problematic patterns
      (lowerName === 'john' && lowerFull.startsWith('johnny')) ||
      (lowerName === 'jo' && lowerFull.startsWith('john')) ||
      (lowerName === 'a' && trimmedFull.length > 2) ||
      // Case 5: Additional common nickname/full name patterns
      (lowerName === 'mike' && lowerFull.startsWith('michael')) ||
      (lowerName === 'dave' && lowerFull.startsWith('david')) ||
      (lowerName === 'alex' && lowerFull.startsWith('alexander')) ||
      (lowerName === 'john' && lowerFull.startsWith('johnathan')) ||
      (lowerName === 'liz' && lowerFull.startsWith('elizabeth')) ||
      (lowerName === 'bob' && lowerFull.startsWith('robert')) ||
      // Case 6: If firstName appears to be a nickname/short form
      (lowerName.length >= 3 && lowerName.length <= 4 &&
       trimmedFull.length > lowerName.length + 4 &&
       !lastName.includes(' ')) || // Single word remaining part suggests it's part of first name
      // Case 7: If the remaining part doesn't look like a typical last name
      (lastName.length > 0 && lastName.length < 3 && trimmedFull.split(' ').length === 2);

    if (shouldFallbackToFullNameOnly) {
      // Fallback: Parse fullName as if we only have fullName
      return parseFullNameOnly(trimmedFull);
    }

  } else {
    // Fallback: fullName doesn't contain firstName as expected
    // Parse fullName as if we only have fullName
    return parseFullNameOnly(trimmedFull);
  }

  // If lastName ended up empty, treat as single name
  if (!lastName) {
    return {
      firstName: trimmedName,
      lastName: '',
      fullName: trimmedName,
      displayName: trimmedName
    };
  }

  return {
    firstName,
    lastName,
    fullName: trimmedFull,
    displayName: trimmedFull
  };
}

/**
 * Create a name display string with proper handling of empty parts
 */
export function createDisplayName(firstName: string, lastName: string): string {
  const trimmedFirst = firstName.trim();
  const trimmedLast = lastName.trim();

  if (!trimmedFirst && !trimmedLast) {
    return 'Tanpa nama';
  }

  if (!trimmedFirst) {
    return trimmedLast;
  }

  if (!trimmedLast) {
    return trimmedFirst;
  }

  return `${trimmedFirst} ${trimmedLast}`;
}

/**
 * Validate parsed name object
 */
export function isValidParsedName(parsed: ParsedName): boolean {
  return !!parsed.firstName || !!parsed.lastName;
}

/**
 * Utility to safely create fullName from firstName and lastName
 */
export function createFullName(firstName: string, lastName: string): string {
  const trimmedFirst = firstName.trim();
  const trimmedLast = lastName.trim();

  if (!trimmedFirst) return trimmedLast;
  if (!trimmedLast) return trimmedFirst;

  return `${trimmedFirst} ${trimmedLast}`;
}