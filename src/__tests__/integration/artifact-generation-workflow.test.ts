/**
 * ❌ DISABLED: ARTIFACT GENERATION WORKFLOW TESTS - Integration Testing Suite
 *
 * These tests were disabled during the hitl-integration.ts cleanup because they test
 * the rigid programmatic approval flow that was removed.
 *
 * REASON FOR DISABLING:
 * - Tests used processToolResultsForApproval function which was removed
 * - The function represented rigid programmatic control that violated the philosophy:
 *   "Trust natural LLM intelligence instead of rigid programmatic control"
 *
 * TODO: Replace with tests for natural LLM approval flow
 * - Test natural language approval detection
 * - Test LLM-generated artifacts instead of hardcoded templates
 * - Test conversation-based phase transitions
 */

/*
 * ALL TESTS BELOW ARE TEMPORARILY DISABLED
 * Remove this block comment after updating tests for natural LLM flow
 */

import { 
  CompletionSignalUtils,
  validateCompletionTrigger,
} from '../../lib/ai/workflow/completion-signals';

// ❌ REMOVED: processToolResultsForApproval import - function removed during cleanup
// This function was part of rigid programmatic control that violated the philosophy:
// "Trust natural LLM intelligence instead of rigid programmatic control"
//
// APPROVAL constant is still available via hitl-utils if needed
import { APPROVAL } from '../../lib/ai/workflow/hitl-utils';

import { 
  hasArtifactsInMessage,
  getArtifactCountFromMessage,
} from '../../components/chat/InlineArtifactRenderer';

import type { AcademicUIMessage } from '../../components/chat/ChatContainer';
import { UIMessage } from 'ai';

// Mock dependencies
class MockUIMessageStreamWriter {
  writes: any[] = [];
  write(data: any) { this.writes.push(data); }
  getWrites() { return this.writes; }
  clearWrites() { this.writes = []; }
}

// Utility functions untuk workflow simulation
const createConversationContext = (phase: number, hasDeliverables: boolean = true) => ({
  currentPhase: phase,
  hasDeliverables,
  lastAssistantMessage: `Here are the phase ${phase} results...`,
  previousUserMessages: [`Working on phase ${phase}`],
});

const createPhaseCompletionMessage = (
  phase: number, 
  state: string = 'output-available',
  approval: string = APPROVAL.YES,
  input: any = null
): AcademicUIMessage => ({
  id: `msg-phase-${phase}`,
  role: 'assistant',
  parts: [{
    type: 'tool-invocation',
    toolCallId: `call-complete-phase-${phase}`,
    toolName: `complete_phase_${phase}`,
    state: state as any,
    input: input || generatePhaseInput(phase),
    output: approval,
  }],
});

const generatePhaseInput = (phase: number) => {
  const inputs = {
    1: {
      topic_title: 'Machine Learning Applications in Healthcare',
      research_scope: 'Systematic review of ML diagnostic tools',
      research_questions: [
        'How accurate are ML diagnostic systems?',
        'What are the implementation challenges?',
      ],
      methodology_approach: 'Systematic literature review with meta-analysis',
      deliverables_preview: 'Comprehensive topic definition with research framework',
    },
    2: {
      sources_found: 45,
      literature_themes: [
        'Convolutional Neural Networks in Medical Imaging',
        'Natural Language Processing for Electronic Health Records',
        'Ethical Considerations in Medical AI',
        'Regulatory Frameworks for AI in Healthcare',
      ],
      data_collection_summary: 'Collected 45 peer-reviewed articles from PubMed, IEEE, and ACM Digital Library',
      research_gaps: 'Limited research on long-term clinical outcomes and patient acceptance',
      deliverables_preview: 'Comprehensive literature review with thematic analysis',
    },
    3: {
      outline_structure: `
I. Introduction
   A. Background of AI in Healthcare
   B. Research Questions and Objectives
   C. Methodology Overview

II. Literature Review
   A. Current State of Medical AI
   B. Key Technologies and Applications
   C. Challenges and Limitations

III. Analysis and Discussion
   A. Effectiveness of ML Diagnostic Tools
   B. Implementation Barriers
   C. Future Directions

IV. Conclusion
   A. Summary of Findings
   B. Implications for Practice
   C. Recommendations`,
      estimated_length: '8,000-10,000 words',
      flow_logic: 'Sequential progression from background through analysis to conclusions',
      key_arguments: [
        'ML diagnostic tools show high accuracy but face implementation challenges',
        'Regulatory frameworks lag behind technological capabilities',
        'Patient acceptance is crucial for successful deployment',
      ],
      deliverables_preview: 'Detailed paper outline with logical flow and key arguments',
    },
    4: {
      sections_completed: [
        'Introduction (1,200 words)',
        'Literature Review - Technology Overview (1,500 words)', 
        'Literature Review - Applications (1,800 words)',
        'Methodology (800 words)',
      ],
      word_count: 5300,
      content_quality: 'All sections meet academic standards with proper citations',
      remaining_work: 'Analysis section (2,000 words) and Conclusion (700 words)',
      deliverables_preview: 'Substantial draft completion with quality content',
    },
    5: {
      citations_added: 52,
      reference_style: 'APA 7th Edition',
      bibliography_complete: true,
      citation_quality: 'All citations properly formatted with complete bibliographic information',
      deliverables_preview: 'Complete citation integration with formatted bibliography',
    },
    6: {
      review_areas: [
        'Content accuracy and completeness',
        'Logical flow and argumentation',
        'Citation formatting and completeness',
        'Grammar and style consistency',
        'Academic tone and clarity',
      ],
      quality_score: '92/100 - Excellent quality with minor revisions needed',
      improvements_made: 'Enhanced argument flow, corrected 3 citation formats, improved clarity in methodology section',
      remaining_issues: 'None - ready for final formatting',
      deliverables_preview: 'Comprehensive quality review with improvements implemented',
    },
    7: {
      formatting_complete: true,
      submission_requirements: 'All university requirements met - title page, abstract, proper margins, page numbers',
      final_word_count: 9250,
      quality_checklist: [
        'Abstract within 250-word limit',
        'Proper APA formatting throughout',
        'All figures and tables properly labeled',
        'Bibliography in alphabetical order',
        'Page numbers and headers correct',
        'PDF format ready for submission',
      ],
      deliverables_preview: 'Complete paper ready for academic submission',
    },
  };

  return inputs[phase as keyof typeof inputs] || { phase_data: `Phase ${phase} completed` };
};

describe('Complete Artifact Generation Workflow', () => {

  describe('End-to-End Workflow Scenarios', () => {

    test('should complete full workflow untuk Phase 1: Topic Definition', async () => {
      // STEP 1: User conversation leading to completion signal
      const userInput = 'cukup, topik sudah jelas';
      const conversationContext = createConversationContext(1, true);

      // STEP 2: Signal detection should identify completion
      const signalDetection = CompletionSignalUtils.detect(userInput);
      expect(signalDetection.type).toBe('completion');
      expect(signalDetection.confidence).toBe('medium'); // "cukup" in context

      // STEP 3: Completion validation should trigger phase completion
      const completionValidation = validateCompletionTrigger(
        userInput,
        1,
        conversationContext
      );
      expect(completionValidation.shouldTriggerCompletion).toBe(true);

      // STEP 4: Phase completion tool call with approval
      const phaseMessage = createPhaseCompletionMessage(1, 'output-available', APPROVAL.YES);
      const mockWriter = new MockUIMessageStreamWriter();

      // STEP 5: Process approval and generate artifact
      const processedMessages = await processToolResultsForApproval(
        [phaseMessage],
        mockWriter as any,
        {} // mock tools
      );

      // STEP 6: Verify artifact was generated
      expect(mockWriter.getWrites().length).toBe(1);
      const artifactOutput = mockWriter.getWrites()[0].output;
      expect(artifactOutput).toContain('Research Topic Definition - Phase 1 Complete');
      expect(artifactOutput).toContain('Machine Learning Applications in Healthcare');

      // STEP 7: Verify message can be displayed with artifacts
      const displayMessage: UIMessage = {
        id: 'display-msg',
        role: 'assistant',
        parts: [{
          type: 'data-artifact',
          data: {
            type: 'artifact',
            id: 'artifact-phase-1',
            title: 'Research Topic Definition',
            content: artifactOutput,
            phaseNumber: 1,
          },
        }],
      };

      expect(hasArtifactsInMessage(displayMessage)).toBe(true);
      expect(getArtifactCountFromMessage(displayMessage)).toBe(1);
    });

    test('should handle revision request workflow', async () => {
      // User requests revision
      const revisionFeedback = 'Tolong tambahkan lebih detail tentang metodologi';
      const phaseMessage = createPhaseCompletionMessage(
        2, 
        'output-available', 
        `${APPROVAL.NO}: ${revisionFeedback}`
      );

      const mockWriter = new MockUIMessageStreamWriter();
      await processToolResultsForApproval([phaseMessage], mockWriter as any, {});

      const writes = mockWriter.getWrites();
      expect(writes[0].output).toContain('Phase revision requested');
      expect(writes[0].output).toContain(revisionFeedback);
    });

  });

  describe('Multiple Phase Workflow Testing', () => {

    test('should generate appropriate artifacts untuk all 7 phases', async () => {
      for (let phase = 1; phase <= 7; phase++) {
        const phaseMessage = createPhaseCompletionMessage(phase, 'output-available', APPROVAL.YES);
        const mockWriter = new MockUIMessageStreamWriter();

        await processToolResultsForApproval([phaseMessage], mockWriter as any, {});

        const writes = mockWriter.getWrites();
        expect(writes.length).toBe(1);
        
        const artifactOutput = writes[0].output;
        expect(artifactOutput).toContain(`Phase ${phase} Complete`);
        
        // Check phase-specific content
        switch (phase) {
          case 1:
            expect(artifactOutput).toContain('Research Topic Definition');
            expect(artifactOutput).toContain('Machine Learning Applications in Healthcare');
            break;
          case 2:
            expect(artifactOutput).toContain('Literature Review Summary');
            expect(artifactOutput).toContain('Found **45** relevant academic sources');
            break;
          case 3:
            expect(artifactOutput).toContain('Paper Outline Structure');
            expect(artifactOutput).toContain('Introduction');
            expect(artifactOutput).toContain('Conclusion');
            break;
          case 4:
            expect(artifactOutput).toContain('Draft Writing Progress');
            expect(artifactOutput).toContain('**5300** words');
            break;
          case 5:
            expect(artifactOutput).toContain('Citation Integration Complete');
            expect(artifactOutput).toContain('**52** citations');
            break;
          case 6:
            expect(artifactOutput).toContain('Quality Review Complete');
            expect(artifactOutput).toContain('92/100');
            break;
          case 7:
            expect(artifactOutput).toContain('Final Submission Ready');
            expect(artifactOutput).toContain('PAPER COMPLETE! 🎉');
            break;
        }
      }
    });

    test('should maintain workflow state across multiple phases', async () => {
      const workflowStates = [];

      for (let phase = 1; phase <= 3; phase++) {
        // Signal detection
        const signal = CompletionSignalUtils.validate(`fase ${phase} sudah selesai`, phase, {
          hasDeliverables: true,
          previousUserMessages: workflowStates.map(s => s.completion_message),
        });

        expect(signal.shouldTriggerCompletion).toBe(true);

        // Artifact generation
        const phaseMessage = createPhaseCompletionMessage(phase);
        const mockWriter = new MockUIMessageStreamWriter();
        
        await processToolResultsForApproval([phaseMessage], mockWriter as any, {});

        const artifactOutput = mockWriter.getWrites()[0].output;
        workflowStates.push({
          phase,
          completion_message: `fase ${phase} sudah selesai`,
          artifact_generated: true,
          artifact_content: artifactOutput,
        });
      }

      // Verify workflow progression
      expect(workflowStates.length).toBe(3);
      expect(workflowStates.every(s => s.artifact_generated)).toBe(true);
    });

  });

  describe('Error Handling and Edge Cases', () => {

    test('should handle network failure during artifact generation', async () => {
      // Simulate network failure by passing invalid input
      const faultyMessage = createPhaseCompletionMessage(1, 'output-available', APPROVAL.YES, null);
      const mockWriter = new MockUIMessageStreamWriter();

      // Should not throw error, but handle gracefully
      await expect(
        processToolResultsForApproval([faultyMessage], mockWriter as any, {})
      ).resolves.toBeDefined();

      // Should still attempt to generate artifact
      expect(mockWriter.getWrites().length).toBe(1);
    });

    test('should handle malformed completion signals', async () => {
      const ambiguousInputs = [
        'hmm menarik tapi belum cukup',
        'oke bagus tapi tambah lagi dong',
        'selesai? belum deh kayaknya',
      ];

      ambiguousInputs.forEach(input => {
        const detection = CompletionSignalUtils.detect(input);
        const validation = validateCompletionTrigger(input, 1);

        // Should not trigger false positive completions
        expect(validation.shouldTriggerCompletion).toBe(false);
        expect(detection.type).not.toBe('completion');
      });
    });

    test('should handle concurrent phase approvals', async () => {
      const concurrentMessages = [
        createPhaseCompletionMessage(1),
        createPhaseCompletionMessage(2),
        createPhaseCompletionMessage(3),
      ];

      const mockWriter = new MockUIMessageStreamWriter();
      
      // Process all messages at once
      await processToolResultsForApproval(concurrentMessages, mockWriter as any, {});

      // Should process all successfully
      expect(mockWriter.getWrites().length).toBe(3);
      
      // Each should have unique content
      const outputs = mockWriter.getWrites().map(w => w.output);
      expect(outputs[0]).toContain('Phase 1 Complete');
      expect(outputs[1]).toContain('Phase 2 Complete');
      expect(outputs[2]).toContain('Phase 3 Complete');
    });

    test('should handle database connection issues gracefully', async () => {
      // Simulate database issues by using empty context
      const phaseMessage = createPhaseCompletionMessage(1);
      const mockWriter = new MockUIMessageStreamWriter();

      // Should complete without database dependencies
      await processToolResultsForApproval([phaseMessage], mockWriter as any, {});
      
      expect(mockWriter.getWrites().length).toBe(1);
      expect(mockWriter.getWrites()[0].output).toContain('Phase 1 Complete');
    });

  });

});

/**
 * PERFORMANCE INTEGRATION TESTS
 * Testing complete workflow performance benchmarks
 */
describe('Workflow Performance Integration', () => {

  test('should complete signal detection → artifact generation within 2500ms', async () => {
    const startTime = performance.now();

    // Complete workflow simulation
    const userInput = 'sudah cukup untuk fase ini';
    
    // 1. Signal detection (≤100ms)
    const signal = CompletionSignalUtils.detect(userInput);
    
    // 2. Completion validation (≤100ms)
    const validation = validateCompletionTrigger(userInput, 1, { hasDeliverables: true });
    
    // 3. Artifact generation (≤2000ms)
    const phaseMessage = createPhaseCompletionMessage(1);
    const mockWriter = new MockUIMessageStreamWriter();
    await processToolResultsForApproval([phaseMessage], mockWriter as any, {});

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    expect(totalTime).toBeLessThan(2500);
    expect(validation.shouldTriggerCompletion).toBe(true);
    expect(mockWriter.getWrites().length).toBe(1);
  });

  test('should handle multiple phases efficiently', async () => {
    const startTime = performance.now();

    // Process 3 phases concurrently
    const phases = [1, 2, 3];
    const results = [];

    for (const phase of phases) {
      const phaseMessage = createPhaseCompletionMessage(phase);
      const mockWriter = new MockUIMessageStreamWriter();
      
      await processToolResultsForApproval([phaseMessage], mockWriter as any, {});
      results.push(mockWriter.getWrites()[0]);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    expect(totalTime).toBeLessThan(5000); // 3 phases within 5 seconds
    expect(results.length).toBe(3);
    expect(results.every(r => r.output.includes('Complete'))).toBe(true);
  });

});

/**
 * USER ACCEPTANCE TESTING SCENARIOS
 * Testing intuitive workflow untuk academic users
 */
describe('User Acceptance Testing', () => {

  test('should provide natural conversation flow', () => {
    const naturalCompletionSignals = [
      'cukup',
      'sudah bagus',
      'selesai untuk topik ini',
      'mari lanjut ke fase berikutnya',
      'topik sudah lengkap',
    ];

    naturalCompletionSignals.forEach(signal => {
      const detection = CompletionSignalUtils.detect(signal);
      const validation = validateCompletionTrigger(signal, 2, { hasDeliverables: true });

      expect(validation.shouldTriggerCompletion).toBe(true);
      expect(detection.confidence).toBeOneOf(['high', 'medium']);
    });
  });

  test('should distinguish between choices and completions clearly', () => {
    const testCases = [
      { input: 'pilih no. 2', expectedType: 'choice', shouldComplete: false },
      { input: 'oke bagus', expectedType: 'choice', shouldComplete: false },
      { input: 'selesai', expectedType: 'completion', shouldComplete: true },
      { input: 'sudah cukup', expectedType: 'completion', shouldComplete: true },
    ];

    testCases.forEach(testCase => {
      const detection = CompletionSignalUtils.detect(testCase.input);
      const validation = validateCompletionTrigger(testCase.input, 1, { hasDeliverables: true });

      expect(detection.type).toBe(testCase.expectedType);
      expect(validation.shouldTriggerCompletion).toBe(testCase.shouldComplete);
    });
  });

  test('should provide clear feedback on workflow progression', async () => {
    const phaseMessage = createPhaseCompletionMessage(3);
    const mockWriter = new MockUIMessageStreamWriter();

    await processToolResultsForApproval([phaseMessage], mockWriter as any, {});

    const artifactOutput = mockWriter.getWrites()[0].output;
    
    // Should provide clear completion indication
    expect(artifactOutput).toContain('Phase 3 Complete');
    expect(artifactOutput).toContain('Phase 3 Approved');
    
    // Should show progress timestamp
    expect(artifactOutput).toMatch(/Generated on \d/);
    
    // Should contain substantive deliverables
    expect(artifactOutput.length).toBeGreaterThan(200); // Substantial content
  });

});