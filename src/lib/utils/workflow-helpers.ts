import type { WorkflowMilestone } from '../types/academic-message';

// Milestone sequence for indexing
const MILESTONE_SEQUENCE: WorkflowMilestone[] = [
  'exploring',
  'topic_locked',
  'researching',
  'foundation_ready',
  'outlining',
  'outline_locked',
  'drafting',
  'integrating',
  'polishing',
  'delivered'
];

/**
 * Get milestone index in sequence (0-9)
 */
export function milestoneIndex(milestone: WorkflowMilestone): number {
  return MILESTONE_SEQUENCE.indexOf(milestone);
}

/**
 * Calculate base progress from milestone
 * Returns 0.0 - 1.0
 */
export function calculateProgress(milestone: WorkflowMilestone): number {
  const progressMap: Record<WorkflowMilestone, number> = {
    'exploring': 0.05,
    'topic_locked': 0.2,
    'researching': 0.35,
    'foundation_ready': 0.5,
    'outlining': 0.55,
    'outline_locked': 0.6,
    'drafting': 0.65,
    'integrating': 0.85,
    'polishing': 0.95,
    'delivered': 1.0
  };

  return progressMap[milestone];
}

/**
 * Format milestone for display (Indonesian)
 */
export function formatMilestone(milestone: WorkflowMilestone): string {
  const labels: Record<WorkflowMilestone, string> = {
    'exploring': 'Eksplorasi Topik',
    'topic_locked': 'Topik Terkunci',
    'researching': 'Riset Literatur',
    'foundation_ready': 'Fondasi Siap',
    'outlining': 'Membuat Outline',
    'outline_locked': 'Outline Terkunci',
    'drafting': 'Menulis Draft',
    'integrating': 'Integrasi Bagian',
    'polishing': 'Penyempurnaan',
    'delivered': 'Selesai'
  };

  return labels[milestone];
}
