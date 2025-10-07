import { describe, it, expect } from '@jest/globals';
import {
  inferWorkflowState,
  inferStateFromResponse
} from '../workflow-inference';
import type { AcademicUIMessage, WorkflowMetadata } from '../../types/academic-message';

describe('Workflow Inference Engine', () => {
  describe('inferWorkflowState', () => {
    it('should return default state for empty messages', () => {
      const messages: AcademicUIMessage[] = [];
      const state = inferWorkflowState(messages);

      expect(state.milestone).toBe('exploring');
      expect(state.progress).toBe(0.05);
    });

    it('should extract latest metadata from message history', () => {
      const messages: AcademicUIMessage[] = [
        {
          id: 'msg-1',
          role: 'assistant',
          parts: [{ type: 'text', text: 'Hello' }],
          metadata: {
            milestone: 'researching',
            progress: 0.35
          }
        }
      ];

      const state = inferWorkflowState(messages);
      expect(state.milestone).toBe('researching');
      expect(state.progress).toBe(0.35);
    });

    it('should handle malformed metadata', () => {
      const messages: AcademicUIMessage[] = [
        {
          id: 'msg-1',
          role: 'assistant',
          parts: [{ type: 'text', text: 'Hello' }],
          metadata: null as any
        }
      ];

      const state = inferWorkflowState(messages);
      expect(state.milestone).toBe('exploring');
    });
  });

  describe('inferStateFromResponse', () => {
    const initialState: WorkflowMetadata = {
      milestone: 'exploring',
      progress: 0.05,
      artifacts: {}
    };

    it('should detect topic locked milestone', () => {
      const response = 'Topik sudah fix: Gender Bias in AI. Mari lanjut ke research.';
      const newState = inferStateFromResponse(response, initialState);

      expect(newState.milestone).toBe('topic_locked');
    });

    it('should detect researching milestone', () => {
      const response = 'Mari saya cari paper tentang cardiovascular AI...';
      const newState = inferStateFromResponse(response, initialState);

      expect(newState.milestone).toBe('researching');
    });

    it('should detect outlining milestone', () => {
      const response = 'Berikut struktur outline paper kami...';
      const newState = inferStateFromResponse(response, initialState);

      expect(newState.milestone).toBe('outlining');
    });

    it('should detect drafting milestone', () => {
      const response = 'Mari mulai menulis section Introduction...';
      const newState = inferStateFromResponse(response, initialState);

      expect(newState.milestone).toBe('drafting');
    });

    it('should detect delivered milestone', () => {
      const response = 'Paper sudah selesai dan siap diserahkan!';
      const newState = inferStateFromResponse(response, initialState);

      expect(newState.milestone).toBe('delivered');
    });

    it('should preserve previous state if no clear signal', () => {
      const currentState: WorkflowMetadata = {
        milestone: 'drafting',
        progress: 0.7,
        artifacts: {}
      };

      const response = 'Baik, saya mengerti.';
      const newState = inferStateFromResponse(response, currentState);

      expect(newState.milestone).toBe('drafting');
    });

    it('should handle empty response text', () => {
      const state = inferStateFromResponse('', { milestone: 'exploring', artifacts: {} });
      expect(state.milestone).toBe('exploring');
    });

    it('should detect highest priority milestone in multi-signal response', () => {
      const response = 'Topik fix: AI Bias. Mari cari paper. Berikut outline nya.';
      const state = inferStateFromResponse(response, { milestone: 'exploring', artifacts: {} });

      // Should detect outline (higher priority than research and topic)
      expect(state.milestone).toBe('outlining');
    });

    it('should preserve artifacts across state transitions', () => {
      const previousState: WorkflowMetadata = {
        milestone: 'researching',
        progress: 0.35,
        artifacts: {
          topicSummary: 'AI Bias in Healthcare',
          references: [{ author: 'Smith', year: 2023, title: 'Test' }]
        }
      };

      const response = 'Berikut outline paper kami...';
      const newState = inferStateFromResponse(response, previousState);

      expect(newState.milestone).toBe('outlining');
      expect(newState.artifacts?.topicSummary).toBe('AI Bias in Healthcare');
      expect(newState.artifacts?.references?.length).toBe(1);
    });
  });

  describe('All Milestone Detection', () => {
    const testCases: Array<{ text: string; expected: string }> = [
      { text: 'Mari kita eksplorasi beberapa ide topik...', expected: 'exploring' },
      { text: 'Topik sudah fix: Gender Bias in AI', expected: 'topic_locked' },
      { text: 'Saya akan cari paper tentang cardiovascular AI', expected: 'researching' },
      { text: 'Kita sudah punya cukup referensi untuk membuat outline', expected: 'foundation_ready' },
      { text: 'Berikut struktur outline paper kami:', expected: 'outlining' },
      { text: 'Outline sudah disetujui, mari mulai menulis', expected: 'outline_locked' },
      { text: 'Mari tulis section Introduction:', expected: 'drafting' },
      { text: 'Sekarang kita integrasikan semua bagian dengan transisi', expected: 'integrating' },
      { text: 'Mari polish grammar dan citations', expected: 'polishing' },
      { text: 'Paper sudah selesai dan siap diserahkan!', expected: 'delivered' }
    ];

    testCases.forEach(({ text, expected }) => {
      it(`should detect "${expected}" milestone`, () => {
        const state = inferStateFromResponse(text, { milestone: 'exploring', artifacts: {} });
        expect(state.milestone).toBe(expected);
      });
    });
  });

  describe('Artifact Extraction', () => {
    it('should extract topic summary', () => {
      const response = 'Topik adalah: Gender Bias in Cardiovascular AI Systems';
      const state = inferStateFromResponse(response, { milestone: 'exploring', artifacts: {} });

      expect(state.artifacts?.topicSummary).toContain('Gender Bias');
    });

    it('should extract research question', () => {
      const response = 'Pertanyaan penelitian adalah: How does AI bias affect diagnosis?';
      const state = inferStateFromResponse(response, { milestone: 'researching', artifacts: {} });

      expect(state.artifacts?.researchQuestion).toContain('How does AI bias');
    });

    it('should extract references', () => {
      const response = 'Sumber: Smith (2023). "AI in Healthcare"';
      const state = inferStateFromResponse(response, { milestone: 'researching', artifacts: {} });

      expect(state.artifacts?.references).toBeDefined();
      expect(state.artifacts?.references?.length).toBeGreaterThan(0);
      expect(state.artifacts?.references?.[0].author).toBe('Smith');
      expect(state.artifacts?.references?.[0].year).toBe(2023);
    });

    it('should extract keywords', () => {
      const response = 'Keywords: machine learning, bias detection, healthcare AI';
      const state = inferStateFromResponse(response, { milestone: 'researching', artifacts: {} });

      expect(state.artifacts?.keywords).toBeDefined();
      expect(state.artifacts?.keywords?.length).toBe(3);
      expect(state.artifacts?.keywords).toContain('machine learning');
    });

    it('should not lose existing artifacts when extracting new ones', () => {
      const previousState: WorkflowMetadata = {
        milestone: 'researching',
        artifacts: {
          topicSummary: 'Existing Topic',
          references: [{ author: 'Existing', year: 2022, title: 'Paper' }]
        }
      };

      const response = 'Found new paper: NewAuthor (2024). "New Paper"';
      const state = inferStateFromResponse(response, previousState);

      // Should keep existing artifacts
      expect(state.artifacts?.topicSummary).toBe('Existing Topic');
      // Existing reference should still be present
      expect(state.artifacts?.references?.some(r => r.author === 'Existing')).toBe(true);
    });
  });
});
