import { describe, it, expect } from '@jest/globals';
import {
  milestoneIndex,
  calculateProgress,
  formatMilestone
} from '../workflow-helpers';
import type { WorkflowMilestone } from '../../types/academic-message';

describe('Workflow Helper Functions', () => {
  describe('milestoneIndex', () => {
    it('should return correct index for each milestone', () => {
      expect(milestoneIndex('exploring')).toBe(0);
      expect(milestoneIndex('topic_locked')).toBe(1);
      expect(milestoneIndex('researching')).toBe(2);
      expect(milestoneIndex('foundation_ready')).toBe(3);
      expect(milestoneIndex('outlining')).toBe(4);
      expect(milestoneIndex('outline_locked')).toBe(5);
      expect(milestoneIndex('drafting')).toBe(6);
      expect(milestoneIndex('integrating')).toBe(7);
      expect(milestoneIndex('polishing')).toBe(8);
      expect(milestoneIndex('delivered')).toBe(9);
    });

    it('should return -1 for invalid milestone', () => {
      expect(milestoneIndex('invalid' as WorkflowMilestone)).toBe(-1);
    });
  });

  describe('calculateProgress', () => {
    it('should return correct progress for each milestone', () => {
      expect(calculateProgress('exploring')).toBe(0.05);
      expect(calculateProgress('topic_locked')).toBe(0.2);
      expect(calculateProgress('researching')).toBe(0.35);
      expect(calculateProgress('foundation_ready')).toBe(0.5);
      expect(calculateProgress('outlining')).toBe(0.55);
      expect(calculateProgress('outline_locked')).toBe(0.6);
      expect(calculateProgress('drafting')).toBe(0.65);
      expect(calculateProgress('integrating')).toBe(0.85);
      expect(calculateProgress('polishing')).toBe(0.95);
      expect(calculateProgress('delivered')).toBe(1.0);
    });

    it('should return values between 0 and 1', () => {
      const milestones: WorkflowMilestone[] = [
        'exploring', 'topic_locked', 'researching', 'foundation_ready',
        'outlining', 'outline_locked', 'drafting', 'integrating',
        'polishing', 'delivered'
      ];

      milestones.forEach(milestone => {
        const progress = calculateProgress(milestone);
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(1);
      });
    });

    it('should return increasing values for milestone sequence', () => {
      const milestones: WorkflowMilestone[] = [
        'exploring', 'topic_locked', 'researching', 'foundation_ready',
        'outlining', 'outline_locked', 'drafting', 'integrating',
        'polishing', 'delivered'
      ];

      for (let i = 0; i < milestones.length - 1; i++) {
        const currentProgress = calculateProgress(milestones[i]);
        const nextProgress = calculateProgress(milestones[i + 1]);
        expect(nextProgress).toBeGreaterThan(currentProgress);
      }
    });
  });

  describe('formatMilestone', () => {
    it('should return Indonesian label for each milestone', () => {
      expect(formatMilestone('exploring')).toBe('Eksplorasi Topik');
      expect(formatMilestone('topic_locked')).toBe('Topik Terkunci');
      expect(formatMilestone('researching')).toBe('Riset Literatur');
      expect(formatMilestone('foundation_ready')).toBe('Fondasi Siap');
      expect(formatMilestone('outlining')).toBe('Membuat Outline');
      expect(formatMilestone('outline_locked')).toBe('Outline Terkunci');
      expect(formatMilestone('drafting')).toBe('Menulis Draft');
      expect(formatMilestone('integrating')).toBe('Integrasi Bagian');
      expect(formatMilestone('polishing')).toBe('Penyempurnaan');
      expect(formatMilestone('delivered')).toBe('Selesai');
    });

    it('should return non-empty strings', () => {
      const milestones: WorkflowMilestone[] = [
        'exploring', 'topic_locked', 'researching', 'foundation_ready',
        'outlining', 'outline_locked', 'drafting', 'integrating',
        'polishing', 'delivered'
      ];

      milestones.forEach(milestone => {
        const label = formatMilestone(milestone);
        expect(label.length).toBeGreaterThan(0);
        expect(typeof label).toBe('string');
      });
    });

    it('should return unique labels for each milestone', () => {
      const milestones: WorkflowMilestone[] = [
        'exploring', 'topic_locked', 'researching', 'foundation_ready',
        'outlining', 'outline_locked', 'drafting', 'integrating',
        'polishing', 'delivered'
      ];

      const labels = milestones.map(m => formatMilestone(m));
      const uniqueLabels = new Set(labels);

      expect(uniqueLabels.size).toBe(milestones.length);
    });
  });
});
