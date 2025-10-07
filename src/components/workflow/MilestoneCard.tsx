import React from 'react';
import { Card } from '../ui/card'; // shadcn/ui Card
import { Badge } from '../ui/badge'; // shadcn/ui Badge
import type { WorkflowMilestone } from '../../lib/types/academic-message';
import { formatMilestone } from '../../lib/utils/workflow-helpers';

interface MilestoneCardProps {
  milestone: WorkflowMilestone;
  isActive: boolean;
  isCompleted: boolean;
  progress?: number;
}

/**
 * Milestone status icons
 */
const MILESTONE_ICONS: Record<WorkflowMilestone, string> = {
  'exploring': '🔍',
  'topic_locked': '🎯',
  'researching': '📚',
  'foundation_ready': '🏗️',
  'outlining': '📝',
  'outline_locked': '✅',
  'drafting': '✍️',
  'integrating': '🔗',
  'polishing': '✨',
  'delivered': '🎉'
};

/**
 * Individual milestone display card
 */
export const MilestoneCard: React.FC<MilestoneCardProps> = ({
  milestone,
  isActive,
  isCompleted,
  progress
}) => {
  const label = formatMilestone(milestone);
  const icon = MILESTONE_ICONS[milestone];

  return (
    <Card
      className={`p-3 transition-all ${
        isActive
          ? 'border-primary bg-primary/5'
          : isCompleted
          ? 'border-green-500 bg-green-500/5'
          : 'border-muted bg-muted/30 opacity-60'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <span className="font-medium text-sm">{label}</span>
        </div>

        {/* Status badge */}
        {isCompleted && (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500">
            Selesai
          </Badge>
        )}
        {isActive && !isCompleted && (
          <Badge variant="default">
            Aktif
          </Badge>
        )}
      </div>

      {/* Progress indicator for active milestone */}
      {isActive && progress !== undefined && (
        <div className="mt-2">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
      )}
    </Card>
  );
};
