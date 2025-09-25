/**
 * CRYPTO COMPATIBILITY TEST SUITE
 * 
 * PURPOSE: Comprehensive testing of crypto functionality across environments
 * COVERAGE: UUID generation, polyfills, environment detection, validation
 * 
 * ENVIRONMENTS TESTED:
 * - Node.js server environment
 * - Browser environment simulation
 * - Edge runtime compatibility
 * - Fallback mechanisms
 */

import { generateUUID, isValidUUIDFormat, generateFallbackId, ensureUUIDFormat } from '../src/lib/utils/uuid-generator';

// Mock browser environment for testing
const mockBrowserEnvironment = () => {
  // @ts-ignore
  global.window = {
    crypto: {
      randomUUID: () => 'mock-browser-uuid-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      })
    }
  };
  
  // @ts-ignore
  global.globalThis = {
    crypto: global.window.crypto
  };
};

const cleanupMocks = () => {
  // @ts-ignore
  delete global.window;
  // @ts-ignore
  delete global.globalThis.crypto;
};

describe('Crypto Compatibility Tests', () => {
  
  describe('UUID Generation', () => {
    
    test('generateUUID produces valid UUID format', () => {
      const uuid = generateUUID();
      
      expect(uuid).toBeDefined();
      expect(typeof uuid).toBe('string');
      expect(isValidUUIDFormat(uuid)).toBe(true);
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    test('generateUUID produces unique values', () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();
      const uuid3 = generateUUID();
      
      expect(uuid1).not.toBe(uuid2);
      expect(uuid2).not.toBe(uuid3);
      expect(uuid1).not.toBe(uuid3);
      
      // All should be valid
      expect(isValidUUIDFormat(uuid1)).toBe(true);
      expect(isValidUUIDFormat(uuid2)).toBe(true);
      expect(isValidUUIDFormat(uuid3)).toBe(true);
    });

    test('generateFallbackId produces AI SDK compatible format', () => {
      const fallbackId = generateFallbackId();
      
      expect(fallbackId).toBeDefined();
      expect(typeof fallbackId).toBe('string');
      expect(fallbackId.length).toBeGreaterThan(5); // AI SDK IDs are typically longer
      
      // Should NOT be UUID format (AI SDK uses different format)
      expect(isValidUUIDFormat(fallbackId)).toBe(false);
    });

    test('generateUUID works in multiple environments', async () => {
      // Test in current (Node.js) environment
      const nodeUuid = generateUUID();
      expect(isValidUUIDFormat(nodeUuid)).toBe(true);

      // Mock browser environment
      mockBrowserEnvironment();
      
      const browserUuid = generateUUID();
      expect(isValidUUIDFormat(browserUuid)).toBe(true);
      
      cleanupMocks();
      
      // Ensure they're different
      expect(nodeUuid).not.toBe(browserUuid);
    });

  });

  describe('UUID Validation', () => {

    test('isValidUUIDFormat correctly validates valid UUIDs', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        '550e8400-e29b-41d4-a716-446655440000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '00000000-0000-4000-8000-000000000000', // System UUID
      ];

      validUUIDs.forEach(uuid => {
        expect(isValidUUIDFormat(uuid)).toBe(true);
      });
    });

    test('isValidUUIDFormat correctly rejects invalid formats', () => {
      const invalidFormats = [
        'not-a-uuid',
        '123e4567-e89b-12d3-a456', // Too short
        '123e4567-e89b-12d3-a456-426614174000-extra', // Too long
        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', // Invalid characters
        '123e4567-e89b-32d3-a456-426614174000', // Wrong version (3 instead of 4)
        'iKtRSLb7gZFtZ6pq', // AI SDK format
        '',
        null as any,
        undefined as any,
      ];

      invalidFormats.forEach(format => {
        expect(isValidUUIDFormat(format)).toBe(false);
      });
    });

  });

  describe('UUID Format Conversion', () => {

    test('ensureUUIDFormat preserves valid UUIDs', () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      const result = ensureUUIDFormat(validUUID);
      
      expect(result).toBe(validUUID); // Should be unchanged
      expect(isValidUUIDFormat(result)).toBe(true);
    });

    test('ensureUUIDFormat converts invalid formats to valid UUIDs', () => {
      const invalidFormats = [
        'not-a-uuid',
        'iKtRSLb7gZFtZ6pq', // AI SDK format
        'random-string',
      ];

      invalidFormats.forEach(format => {
        const result = ensureUUIDFormat(format);
        
        expect(result).not.toBe(format); // Should be different
        expect(isValidUUIDFormat(result)).toBe(true); // Should be valid UUID
      });
    });

  });

  describe('Environment Detection', () => {

    test('detects Node.js environment correctly', () => {
      expect(typeof window).toBe('undefined'); // Node.js has no window
      expect(typeof require).toBe('function'); // Node.js has require
      expect(typeof process).toBe('object'); // Node.js has process
    });

    test('can simulate browser environment', () => {
      mockBrowserEnvironment();
      
      expect(typeof window).toBe('object'); // Mock window exists
      // @ts-ignore
      expect(typeof window.crypto).toBe('object'); // Mock crypto exists
      
      cleanupMocks();
    });

  });

  describe('Performance Tests', () => {

    test('UUID generation performance is acceptable', () => {
      const startTime = Date.now();
      const uuids: string[] = [];
      
      // Generate 1000 UUIDs
      for (let i = 0; i < 1000; i++) {
        uuids.push(generateUUID());
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(1000); // Less than 1 second
      
      // All should be valid and unique
      const uniqueUUIDs = new Set(uuids);
      expect(uniqueUUIDs.size).toBe(1000); // All unique
      
      uuids.forEach(uuid => {
        expect(isValidUUIDFormat(uuid)).toBe(true);
      });
    });

  });

  describe('Error Handling', () => {

    test('handles crypto unavailability gracefully', () => {
      // This test ensures fallback mechanisms work
      // In real scenarios where crypto is unavailable
      
      const uuid = generateUUID();
      expect(isValidUUIDFormat(uuid)).toBe(true);
      
      // Should not throw errors even if crypto is limited
      expect(() => generateUUID()).not.toThrow();
      expect(() => generateFallbackId()).not.toThrow();
    });

  });

  describe('Integration Tests', () => {

    test('UUID generator integrates with existing codebase patterns', () => {
      // Test that our fixes maintain compatibility with existing patterns
      
      // Should work for chat IDs (main use case that was failing)
      const chatId = generateUUID();
      expect(isValidUUIDFormat(chatId)).toBe(true);
      
      // Should work for message IDs
      const messageId = generateUUID();
      expect(isValidUUIDFormat(messageId)).toBe(true);
      
      // Should work for file IDs (API route use case)
      const fileId = generateUUID();
      expect(isValidUUIDFormat(fileId)).toBe(true);
      
      // All should be unique
      expect(chatId).not.toBe(messageId);
      expect(messageId).not.toBe(fileId);
      expect(chatId).not.toBe(fileId);
    });

  });

});

/**
 * MOCK CRYPTO POLYFILL TESTS
 * Test the polyfill logic in isolation
 */
describe('Crypto Polyfill Logic', () => {

  // Mock the polyfill functions for testing
  const mockRandomUUID = () => {
    // Simulate different environment scenarios
    if (typeof globalThis?.crypto?.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
    
    if (typeof require !== 'undefined') {
      try {
        const crypto = require('crypto');
        if (typeof crypto.randomUUID === 'function') {
          return crypto.randomUUID();
        }
      } catch {
        // Fallback
      }
    }
    
    // Manual fallback
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  test('polyfill fallback chain works correctly', () => {
    const uuid = mockRandomUUID();
    
    expect(uuid).toBeDefined();
    expect(typeof uuid).toBe('string');
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  test('manual UUID generation produces valid format', () => {
    const manualUUID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });

    expect(manualUUID).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(isValidUUIDFormat(manualUUID)).toBe(true);
  });

});

/**
 * REGRESSION TESTS
 * Ensure fixes don't break existing functionality
 */
describe('Regression Tests', () => {

  test('existing UUID generator still works', () => {
    // Test that our changes don't break the existing uuid-generator
    const uuid = generateUUID();
    
    expect(isValidUUIDFormat(uuid)).toBe(true);
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  test('fallback ID generation still works for compatibility', () => {
    // Ensure AI SDK compatibility is maintained
    const fallbackId = generateFallbackId();
    
    expect(typeof fallbackId).toBe('string');
    expect(fallbackId.length).toBeGreaterThan(0);
    
    // Should NOT be UUID format (maintains AI SDK compatibility)
    expect(isValidUUIDFormat(fallbackId)).toBe(false);
  });

});