import React from 'react';
import { Progress } from '../ui/progress'; // shadcn/ui Progress component

interface ProgressBarProps {
  progress: number; // 0.0 - 1.0
  className?: string;
}

/**
 * Animated progress bar for workflow completion
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  className = ''
}) => {
  // Convert 0-1 to 0-100 for display
  const percentage = Math.round(progress * 100);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Progress</span>
        <span className="font-medium">{percentage}%</span>
      </div>

      <Progress value={percentage} className="h-2" />

      {/* Progress status text */}
      <p className="text-xs text-muted-foreground text-center">
        {percentage < 20 && 'Just getting started...'}
        {percentage >= 20 && percentage < 50 && 'Building foundation...'}
        {percentage >= 50 && percentage < 80 && 'Making progress...'}
        {percentage >= 80 && percentage < 100 && 'Almost there...'}
        {percentage >= 100 && 'Complete!'}
      </p>
    </div>
  );
};
