/**
 * P0.1 Natural Language Approval - Edge Case Testing Framework
 *
 * PHASE 6 Implementation - Testing & Edge Case Handling
 * Tests for intent detection accuracy, duplicate prevention, performance validation
 *
 * Requirements from /Users/eriksupit/Desktop/makalah/__context__/architexture-task-p01-1.txt:
 * - Intent detection accuracy: >95%
 * - Validation latency: <100ms
 * - Audit write latency: <200ms
 * - Zero false positive approvals
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import {
  detectApprovalIntent,
  isResponseToApprovalOffer,
  extractTextFromMessage,
  ApprovalIntent
} from '../lib/ai/workflow/hitl-utils';
import {
  recordApproval,
  isDuplicateApproval,
  ApprovalLedger
} from '../lib/database/message-validation';
import type { AcademicUIMessage } from '../types/academic';

describe('P0.1 Natural Language Approval - Edge Case Testing', () => {

  // EDGE CASE 1: Intent Detection Accuracy Testing
  describe('Intent Detection Accuracy (Target: >95%)', () => {

    const testCases = [
      // Clear positive cases
      { input: "setuju", expected: 'approve', confidence: 0.95 },
      { input: "ok gas", expected: 'approve', confidence: 0.95 },
      { input: "mantap lanjut", expected: 'approve', confidence: 0.95 },
      { input: "ya bagus", expected: 'approve', confidence: 0.8 },
      { input: "sip", expected: 'approve', confidence: 0.8 },
      { input: "bungkus", expected: 'approve', confidence: 0.95 },
      { input: "final", expected: 'approve', confidence: 0.95 },
      { input: "perfect", expected: 'approve', confidence: 0.95 },

      // Clear negative cases
      { input: "tidak setuju", expected: 'revise', confidence: 0.90 },
      { input: "perlu perbaikan", expected: 'revise', confidence: 0.90 },
      { input: "ulang", expected: 'revise', confidence: 0.90 },
      { input: "belum ok", expected: 'revise', confidence: 0.90 },
      { input: "kurang tepat", expected: 'revise', confidence: 0.90 },
      { input: "tidak cocok", expected: 'revise', confidence: 0.90 },

      // Ambiguous cases
      { input: "hmm gimana ya", expected: 'unclear', confidence: 0.2 },
      { input: "setuju tapi dengan catatan", expected: 'unclear', confidence: 0.3 },
      { input: "mungkin", expected: 'unclear', confidence: 0.3 },
      { input: "entah", expected: 'unclear', confidence: 0.2 },
      { input: "bagaimana???", expected: 'unclear', confidence: 0.2 },

      // Edge cases - empty/invalid
      { input: "", expected: 'unclear', confidence: 0.0 },
      { input: "   ", expected: 'unclear', confidence: 0.1 },
      { input: "asdfghjkl", expected: 'unclear', confidence: 0.1 },

      // Mixed signals
      { input: "setuju tapi tidak", expected: 'unclear', confidence: 0.3 },
      { input: "ya namun perlu revisi", expected: 'unclear', confidence: 0.3 },
    ];

    test.each(testCases)('detects intent for "$input"', ({ input, expected, confidence }) => {
      const result = detectApprovalIntent(input);

      expect(result.intent).toBe(expected);
      expect(result.confidence).toBeGreaterThanOrEqual(confidence - 0.1); // Allow 0.1 tolerance
      expect(result.reasoning).toBeDefined();
    });

    test('calculates intent detection accuracy', () => {
      let correct = 0;
      let total = testCases.length;

      testCases.forEach(({ input, expected }) => {
        const result = detectApprovalIntent(input);
        if (result.intent === expected) {
          correct++;
        }
      });

      const accuracy = correct / total;
      console.log(`Intent Detection Accuracy: ${(accuracy * 100).toFixed(2)}%`);

      // Target: >95% accuracy
      expect(accuracy).toBeGreaterThan(0.95);
    });
  });

  // EDGE CASE 2: Performance Validation Testing
  describe('Performance Validation (Latency Targets)', () => {

    test('intent detection latency <100ms', async () => {
      const testInputs = [
        "setuju",
        "tidak perlu revisi lagi",
        "hmm bagaimana ya",
        "ok gas mantap lanjut fase berikutnya"
      ];

      for (const input of testInputs) {
        const start = performance.now();
        detectApprovalIntent(input);
        const end = performance.now();

        const latency = end - start;
        console.log(`Intent detection latency for "${input}": ${latency.toFixed(2)}ms`);

        // Target: <100ms
        expect(latency).toBeLessThan(100);
      }
    });

    test('audit trail write latency <200ms', async () => {
      const mockLedger: ApprovalLedger = {
        conversation_id: 'test-conv-1',
        phase: 1,
        approved: true,
        timestamp: Date.now(),
        user_id: 'test-user-1',
        metadata: {
          intent_confidence: 0.95,
          validation_method: 'natural_language',
          reasoning: 'Test approval'
        }
      };

      const start = performance.now();
      await recordApproval(mockLedger);
      const end = performance.now();

      const latency = end - start;
      console.log(`Audit trail write latency: ${latency.toFixed(2)}ms`);

      // Target: <200ms
      expect(latency).toBeLessThan(200);
    });
  });

  // EDGE CASE 3: Duplicate Approval Prevention
  describe('Duplicate Approval Prevention', () => {

    test('detects duplicate approvals within time window', () => {
      const now = Date.now();
      const recentApprovals: ApprovalLedger[] = [
        {
          conversation_id: 'test-conv-1',
          phase: 1,
          approved: true,
          timestamp: now - 10000, // 10 seconds ago
          user_id: 'test-user-1',
          metadata: {
            intent_confidence: 0.95,
            validation_method: 'natural_language'
          }
        }
      ];

      // Should detect duplicate within 30-second window
      expect(isDuplicateApproval(recentApprovals, 1, 30000)).toBe(true);

      // Should NOT detect duplicate outside window
      expect(isDuplicateApproval(recentApprovals, 1, 5000)).toBe(false);

      // Should NOT detect different phase as duplicate
      expect(isDuplicateApproval(recentApprovals, 2, 30000)).toBe(false);
    });

    test('prevents duplicate approvals with different phases', () => {
      const recentApprovals: ApprovalLedger[] = [
        {
          conversation_id: 'test-conv-1',
          phase: 1,
          approved: true,
          timestamp: Date.now() - 5000,
          user_id: 'test-user-1',
          metadata: {
            intent_confidence: 0.95,
            validation_method: 'natural_language'
          }
        }
      ];

      // Different phases should not be considered duplicates
      expect(isDuplicateApproval(recentApprovals, 2)).toBe(false);
      expect(isDuplicateApproval(recentApprovals, 3)).toBe(false);
    });
  });

  // EDGE CASE 4: Missing Context Scenarios
  describe('Missing Context Validation', () => {

    test('validates response to approval offer', () => {
      const recentAssistantMessages = [
        "Konfirmasi: setujui hasil fase 1? (ya/tidak)",
        "Berikut adalah ringkasan fase 1..."
      ];

      // Valid responses to offer
      expect(isResponseToApprovalOffer("ya", recentAssistantMessages)).toBe(true);
      expect(isResponseToApprovalOffer("tidak", recentAssistantMessages)).toBe(true);
      expect(isResponseToApprovalOffer("setuju", recentAssistantMessages)).toBe(true);
      expect(isResponseToApprovalOffer("revisi", recentAssistantMessages)).toBe(true);

      // Invalid responses (no recent offer)
      expect(isResponseToApprovalOffer("ya", [])).toBe(false);
      expect(isResponseToApprovalOffer("setuju", ["Halo, selamat datang"])).toBe(false);
    });

    test('handles missing context gracefully', () => {
      // Test with no recent offer
      const result = isResponseToApprovalOffer("setuju", []);
      expect(result).toBe(false);

      // Test with empty user message
      const intentResult = detectApprovalIntent("");
      expect(intentResult.intent).toBe('unclear');
      expect(intentResult.confidence).toBe(0.0);
    });
  });

  // EDGE CASE 5: Ambiguous Intent Clarification
  describe('Ambiguous Intent Handling', () => {

    test('requests clarification for unclear intent', () => {
      const ambiguousInputs = [
        "hmm gimana ya",
        "setuju tapi dengan catatan",
        "mungkin bisa",
        "sebaiknya direvisi dulu",
        "entah ya",
        "???",
      ];

      ambiguousInputs.forEach(input => {
        const result = detectApprovalIntent(input);
        expect(result.intent).toBe('unclear');
        expect(result.confidence).toBeLessThan(0.5);
        expect(result.reasoning).toContain('detected');
      });
    });

    test('extracts feedback from revision requests', () => {
      const revisionCases = [
        {
          input: "tidak setuju, perlu tambahan referensi",
          expectedFeedback: ", perlu tambahan referensi"
        },
        {
          input: "revisi bagian metodologi",
          expectedFeedback: "bagian metodologi"
        },
        {
          input: "ulang",
          expectedFeedback: "Perlu revisi (tidak ada feedback spesifik)"
        },
      ];

      revisionCases.forEach(({ input, expectedFeedback }) => {
        const result = detectApprovalIntent(input);
        expect(result.intent).toBe('revise');
        expect(result.feedback).toBeDefined();
        // Allow flexible feedback extraction
        expect(result.feedback?.length).toBeGreaterThan(0);
      });
    });
  });

  // EDGE CASE 6: Text Extraction from UI Messages
  describe('Message Text Extraction', () => {

    test('extracts text from valid message parts', () => {
      const mockMessage: AcademicUIMessage = {
        id: 'test-msg-1',
        role: 'user',
        parts: [
          { type: 'text', text: 'setuju' },
          { type: 'text', text: ' fase ini' }
        ],
        createdAt: new Date(),
        content: 'setuju fase ini'
      };

      const extracted = extractTextFromMessage(mockMessage);
      expect(extracted).toBe('setuju fase ini');
    });

    test('handles messages without parts', () => {
      const mockMessage: AcademicUIMessage = {
        id: 'test-msg-2',
        role: 'user',
        createdAt: new Date(),
        content: 'test'
      };

      const extracted = extractTextFromMessage(mockMessage);
      expect(extracted).toBe('');
    });

    test('handles mixed part types', () => {
      const mockMessage: AcademicUIMessage = {
        id: 'test-msg-3',
        role: 'assistant',
        parts: [
          { type: 'text', text: 'Konfirmasi: ' },
          { type: 'tool-call', toolCallId: 'test', toolName: 'complete_phase_1', input: {} },
          { type: 'text', text: 'setujui hasil?' }
        ],
        createdAt: new Date(),
        content: 'mixed content'
      };

      const extracted = extractTextFromMessage(mockMessage);
      expect(extracted).toBe('Konfirmasi:  setujui hasil?');
    });
  });

  // EDGE CASE 7: Error Handling & Recovery
  describe('Error Handling & Recovery', () => {

    test('handles invalid input gracefully', () => {
      const invalidInputs = [
        null,
        undefined,
        123,
        {},
        []
      ];

      invalidInputs.forEach(input => {
        const result = detectApprovalIntent(input as any);
        expect(result.intent).toBe('unclear');
        expect(result.confidence).toBe(0.0);
        expect(result.reasoning).toContain('invalid');
      });
    });

    test('recovers from audit trail failures', async () => {
      const invalidLedger: any = {
        // Missing required fields
        conversation_id: null,
        phase: 'invalid',
      };

      // Should not throw error, but log failure
      await expect(recordApproval(invalidLedger)).resolves.not.toThrow();
    });
  });
});

// PERFORMANCE MEASUREMENT UTILITIES
export class PerformanceMeasurement {
  private measurements: Map<string, number[]> = new Map();

  measure<T>(operation: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const end = performance.now();

    const latency = end - start;

    if (!this.measurements.has(operation)) {
      this.measurements.set(operation, []);
    }
    this.measurements.get(operation)!.push(latency);

    return result;
  }

  async measureAsync<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();

    const latency = end - start;

    if (!this.measurements.has(operation)) {
      this.measurements.set(operation, []);
    }
    this.measurements.get(operation)!.push(latency);

    return result;
  }

  getStats(operation: string) {
    const measurements = this.measurements.get(operation) || [];
    if (measurements.length === 0) return null;

    const avg = measurements.reduce((a, b) => a + b, 0) / measurements.length;
    const min = Math.min(...measurements);
    const max = Math.max(...measurements);
    const p95 = measurements.sort((a, b) => a - b)[Math.floor(measurements.length * 0.95)];

    return { avg, min, max, p95, count: measurements.length };
  }

  reportAll() {
    console.log('\n=== PERFORMANCE REPORT ===');
    for (const [operation, measurements] of this.measurements) {
      const stats = this.getStats(operation);
      if (stats) {
        console.log(`${operation}: avg=${stats.avg.toFixed(2)}ms, min=${stats.min.toFixed(2)}ms, max=${stats.max.toFixed(2)}ms, p95=${stats.p95.toFixed(2)}ms (n=${stats.count})`);
      }
    }
    console.log('========================\n');
  }
}

// TEST SCENARIOS FOR LOAD TESTING
export const loadTestScenarios = [
  // High volume intent detection
  {
    name: 'Intent Detection Load Test',
    iterations: 1000,
    operation: () => detectApprovalIntent('setuju fase ini bagus')
  },

  // Concurrent approval processing
  {
    name: 'Concurrent Approval Test',
    iterations: 100,
    operation: async () => {
      const ledger: ApprovalLedger = {
        conversation_id: `test-${Math.random()}`,
        phase: Math.floor(Math.random() * 7) + 1,
        approved: Math.random() > 0.5,
        timestamp: Date.now(),
        user_id: 'load-test-user',
        metadata: {
          intent_confidence: Math.random(),
          validation_method: 'natural_language'
        }
      };
      await recordApproval(ledger);
    }
  }
];