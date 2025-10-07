import React from 'react';
import type { AcademicUIMessage, WorkflowMilestone } from '../../lib/types/academic-message';
import { useWorkflowState } from '../../hooks/useWorkflowState';
import { ProgressBar } from './ProgressBar';
import { MilestoneCard } from './MilestoneCard';
import { milestoneIndex } from '../../lib/utils/workflow-helpers';

interface WorkflowProgressProps {
  messages: AcademicUIMessage[];
  className?: string;
}

/**
 * Main workflow progress sidebar component
 */
export const WorkflowProgress: React.FC<WorkflowProgressProps> = ({
  messages,
  className = ''
}) => {
  const state = useWorkflowState(messages);

  const currentMilestone = state.milestone || 'exploring';
  const currentProgress = state.progress || 0.05;
  const currentIndex = milestoneIndex(currentMilestone);

  // All milestones in sequence
  const milestones: Array<WorkflowMilestone> = [
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

  return (
    <div className={`flex flex-col gap-6 ${className}`}>
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold mb-1">Progress Paper</h2>
        <p className="text-sm text-muted-foreground">
          Pantau perkembangan penulisan paper Anda
        </p>
      </div>

      {/* Overall progress bar */}
      <ProgressBar progress={currentProgress} />

      {/* Artifacts summary (if available) */}
      {state.artifacts && (
        <div className="p-3 bg-muted/30 rounded-lg space-y-1 text-sm">
          {state.artifacts.topicSummary && (
            <div>
              <span className="font-medium">Topik:</span>{' '}
              <span className="text-muted-foreground">
                {state.artifacts.topicSummary}
              </span>
            </div>
          )}
          {state.artifacts.references && state.artifacts.references.length > 0 && (
            <div>
              <span className="font-medium">Referensi:</span>{' '}
              <span className="text-muted-foreground">
                {state.artifacts.references.length} sumber
              </span>
            </div>
          )}
          {state.artifacts.completedSections && state.artifacts.completedSections.length > 0 && (
            <div>
              <span className="font-medium">Bagian Selesai:</span>{' '}
              <span className="text-muted-foreground">
                {state.artifacts.completedSections.length} section
              </span>
            </div>
          )}
        </div>
      )}

      {/* Milestone list */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Tahapan Penulisan
        </h3>

        {milestones.map((milestone, index) => (
          <MilestoneCard
            key={milestone}
            milestone={milestone}
            isActive={index === currentIndex}
            isCompleted={index < currentIndex}
            progress={index === currentIndex ? currentProgress : undefined}
          />
        ))}
      </div>

      {/* Footer timestamp */}
      {state.timestamp && (
        <p className="text-xs text-muted-foreground text-center">
          Update terakhir: {new Date(state.timestamp).toLocaleString('id-ID')}
        </p>
      )}
    </div>
  );
};
