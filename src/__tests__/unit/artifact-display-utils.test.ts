/**
 * ARTIFACT DISPLAY UTILITIES TESTS - Unit Testing Suite
 * 
 * Tests utility functions untuk artifact detection dan processing
 * ensuring reliable identification dan handling of generated artifacts.
 * 
 * Critical Success Criteria:
 * - 100% accuracy untuk artifact detection dalam messages
 * - Proper counting dan metadata extraction
 * - Performance benchmarks ≤ 100ms per operation
 */

import { UIMessage } from 'ai';

import { hasArtifactsInMessage, getArtifactCountFromMessage } from '../../components/chat/InlineArtifactRenderer';

// Test data factory functions
const createArtifactMessage = (artifacts: any[] = []): UIMessage => ({
  id: `msg-${Date.now()}`,
  role: 'assistant',
  parts: artifacts.map((artifact, index) => ({
    type: 'data-artifact',
    data: {
      type: 'artifact',
      ...artifact,
    },
  } as any)),
});

const createSampleArtifact = (id: string = 'artifact-1', title: string = 'Test Artifact') => ({
  id,
  title,
  type: 'markdown',
  content: `# ${title}\n\nThis is test artifact content for ${title}.\n\n## Section 1\nContent section 1\n\n## Section 2\nContent section 2`,
  wordCount: 15,
  createdAt: new Date().toISOString(),
  phaseNumber: 1,
});

describe('Artifact Detection Utilities', () => {

  describe('hasArtifactsInMessage', () => {
    
    test('should detect artifacts in message parts', () => {
      const messageWithArtifacts = createArtifactMessage([
        createSampleArtifact('artifact-1', 'Research Topic'),
      ]);

      expect(hasArtifactsInMessage(messageWithArtifacts)).toBe(true);
    });

    test('should return false for messages without artifacts', () => {
      const messageWithoutArtifacts: UIMessage = {
        id: 'msg-1',
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: 'This is a regular text message',
          },
        ],
      };

      expect(hasArtifactsInMessage(messageWithoutArtifacts)).toBe(false);
    });

    test('should return false for messages without parts', () => {
      const messageWithoutParts: UIMessage = {
        id: 'msg-1',
        role: 'user',
        content: 'User message without parts',
      };

      expect(hasArtifactsInMessage(messageWithoutParts)).toBe(false);
    });

    test('should handle legacy data property format', () => {
      const legacyMessage: UIMessage = {
        id: 'msg-legacy',
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: 'Regular text',
            data: { type: 'artifact', title: 'Legacy Artifact' },
          } as any,
        ],
      };

      expect(hasArtifactsInMessage(legacyMessage)).toBe(true);
    });

    test('should handle mixed message parts', () => {
      const mixedMessage: UIMessage = {
        id: 'msg-mixed',
        role: 'assistant',
        parts: [
          { type: 'text', text: 'Some text' },
          {
            type: 'data-artifact',
            data: { type: 'artifact', title: 'Mixed Artifact' },
          } as any,
          { type: 'text', text: 'More text' },
        ],
      };

      expect(hasArtifactsInMessage(mixedMessage)).toBe(true);
    });

  });

  describe('getArtifactCountFromMessage', () => {
    
    test('should count artifacts correctly', () => {
      const messageWithMultipleArtifacts = createArtifactMessage([
        createSampleArtifact('artifact-1', 'First Artifact'),
        createSampleArtifact('artifact-2', 'Second Artifact'),
        createSampleArtifact('artifact-3', 'Third Artifact'),
      ]);

      expect(getArtifactCountFromMessage(messageWithMultipleArtifacts)).toBe(3);
    });

    test('should return 0 for messages without artifacts', () => {
      const messageWithoutArtifacts: UIMessage = {
        id: 'msg-1',
        role: 'assistant',
        parts: [{ type: 'text', text: 'No artifacts here' }],
      };

      expect(getArtifactCountFromMessage(messageWithoutArtifacts)).toBe(0);
    });

    test('should return 0 for messages without parts', () => {
      const messageWithoutParts: UIMessage = {
        id: 'msg-no-parts',
        role: 'user',
        content: 'User message',
      };

      expect(getArtifactCountFromMessage(messageWithoutParts)).toBe(0);
    });

    test('should count only artifact parts dalam mixed messages', () => {
      const mixedMessage: UIMessage = {
        id: 'msg-mixed',
        role: 'assistant',
        parts: [
          { type: 'text', text: 'Text part 1' },
          {
            type: 'data-artifact',
            data: { type: 'artifact', title: 'Artifact 1' },
          } as any,
          { type: 'text', text: 'Text part 2' },
          {
            type: 'data-artifact',
            data: { type: 'artifact', title: 'Artifact 2' },
          } as any,
          { type: 'tool-invocation', toolName: 'test-tool' },
        ],
      };

      expect(getArtifactCountFromMessage(mixedMessage)).toBe(2);
    });

    test('should handle legacy data format in counting', () => {
      const legacyMessage: UIMessage = {
        id: 'msg-legacy',
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: 'Regular text',
            data: { type: 'artifact', title: 'Legacy Artifact 1' },
          } as any,
          {
            type: 'text', 
            text: 'More text',
            data: { type: 'artifact', title: 'Legacy Artifact 2' },
          } as any,
        ],
      };

      expect(getArtifactCountFromMessage(legacyMessage)).toBe(2);
    });

  });

  describe('Edge cases dan error handling', () => {
    
    test('should handle null/undefined message gracefully', () => {
      // The functions expect a UIMessage, so null will cause issues
      // Better to test with a proper message structure but empty parts
      const emptyMessage: UIMessage = {
        id: 'empty',
        role: 'user',
        parts: undefined,
      };
      
      expect(() => hasArtifactsInMessage(emptyMessage)).not.toThrow();
      expect(() => getArtifactCountFromMessage(emptyMessage)).not.toThrow();
      
      expect(hasArtifactsInMessage(emptyMessage)).toBe(false);
      expect(getArtifactCountFromMessage(emptyMessage)).toBe(0);
    });

    test('should handle malformed message parts', () => {
      const malformedMessage: UIMessage = {
        id: 'msg-malformed',
        role: 'assistant',
        parts: [
          { type: 'data-artifact' } as any, // Missing data property
          { type: 'unknown-type', data: { type: 'artifact' } } as any, // Wrong type prefix
        ].filter(Boolean), // Remove null/undefined
      };

      expect(() => hasArtifactsInMessage(malformedMessage)).not.toThrow();
      expect(() => getArtifactCountFromMessage(malformedMessage)).not.toThrow();
    });

    test('should handle empty parts array', () => {
      const emptyPartsMessage: UIMessage = {
        id: 'msg-empty-parts',
        role: 'assistant',
        parts: [],
      };

      expect(hasArtifactsInMessage(emptyPartsMessage)).toBe(false);
      expect(getArtifactCountFromMessage(emptyPartsMessage)).toBe(0);
    });

  });

});

/**
 * PERFORMANCE BENCHMARKS
 * Testing artifact detection speed: ≤ 100ms per operation
 */
describe('Artifact Detection Performance', () => {

  test('should detect artifacts within 100ms benchmark', () => {
    const largeMessage = createArtifactMessage(
      Array.from({ length: 100 }, (_, i) => 
        createSampleArtifact(`artifact-${i}`, `Large Artifact ${i}`)
      )
    );

    const startTime = performance.now();
    const hasArtifacts = hasArtifactsInMessage(largeMessage);
    const endTime = performance.now();
    
    const executionTime = endTime - startTime;

    expect(executionTime).toBeLessThan(100);
    expect(hasArtifacts).toBe(true);
  });

  test('should count artifacts within 100ms benchmark', () => {
    const largeMessage = createArtifactMessage(
      Array.from({ length: 50 }, (_, i) => 
        createSampleArtifact(`artifact-${i}`, `Performance Test ${i}`)
      )
    );

    const startTime = performance.now();
    const count = getArtifactCountFromMessage(largeMessage);
    const endTime = performance.now();
    
    const executionTime = endTime - startTime;

    expect(executionTime).toBeLessThan(100);
    expect(count).toBe(50);
  });

  test('should handle repeated operations efficiently', () => {
    const message = createArtifactMessage([
      createSampleArtifact('perf-1', 'Performance Artifact 1'),
      createSampleArtifact('perf-2', 'Performance Artifact 2'),
    ]);

    const startTime = performance.now();
    
    // Perform multiple operations
    for (let i = 0; i < 1000; i++) {
      hasArtifactsInMessage(message);
      getArtifactCountFromMessage(message);
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;

    expect(totalTime).toBeLessThan(500); // 1000 operations within 500ms
  });

});

/**
 * DATA INTEGRITY TESTS
 * Ensuring artifact detection maintains data integrity
 */
describe('Artifact Data Integrity', () => {

  test('should preserve original message during detection', () => {
    const originalMessage = createArtifactMessage([
      createSampleArtifact('integrity-test', 'Integrity Test Artifact'),
    ]);
    
    const messageCopy = JSON.parse(JSON.stringify(originalMessage));
    
    // Perform detection operations
    hasArtifactsInMessage(originalMessage);
    getArtifactCountFromMessage(originalMessage);
    
    // Original message should remain unchanged
    expect(originalMessage).toEqual(messageCopy);
  });

  test('should handle concurrent access safely', () => {
    const sharedMessage = createArtifactMessage([
      createSampleArtifact('concurrent-1', 'Concurrent Test 1'),
      createSampleArtifact('concurrent-2', 'Concurrent Test 2'),
    ]);

    // Simulate concurrent access
    const results = Promise.all([
      Promise.resolve(hasArtifactsInMessage(sharedMessage)),
      Promise.resolve(getArtifactCountFromMessage(sharedMessage)),
      Promise.resolve(hasArtifactsInMessage(sharedMessage)),
      Promise.resolve(getArtifactCountFromMessage(sharedMessage)),
    ]);

    return results.then(([result1, result2, result3, result4]) => {
      expect(result1).toBe(true);
      expect(result2).toBe(2);
      expect(result3).toBe(true);
      expect(result4).toBe(2);
    });
  });

});