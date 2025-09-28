'use client';

/**
 * MessageActions - Reusable action buttons for chat messages
 *
 * DESIGN COMPLIANCE:
 * - Follows AI SDK Elements Actions + Action pattern
 * - Consistent button styling and sizing
 * - Built-in tooltip support
 * - Mobile responsive with proper touch targets
 * - Semantic design tokens
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

// Actions Container
export interface MessageActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const MessageActions = ({ className, children, ...props }: MessageActionsProps) => (
  <div
    className={cn('flex items-center justify-end gap-1 mt-1', className)}
    {...props}
  >
    {children}
  </div>
);

// Individual Action Button
export interface MessageActionProps extends Omit<ComponentProps<typeof Button>, 'size' | 'variant'> {
  icon: LucideIcon;
  tooltip?: string;
  label?: string;
  size?: 'sm' | 'default';
}

export const MessageAction = ({
  icon: Icon,
  tooltip,
  label,
  className,
  size = 'sm',
  ...props
}: MessageActionProps) => {
  const button = (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        'text-muted-foreground hover:text-foreground',
        size === 'sm' ? 'h-8 w-8' : 'h-9 w-9',
        'transition-colors',
        className
      )}
      {...props}
    >
      <Icon className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} />
      <span className="sr-only">{label || tooltip}</span>
    </Button>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
};

// Assistant Message Actions (includes timestamp)
export interface AssistantActionsProps extends MessageActionsProps {
  timestamp?: string;
  showTimestamp?: boolean;
}

export const AssistantActions = ({
  timestamp,
  showTimestamp = true,
  className,
  children,
  ...props
}: AssistantActionsProps) => (
  <div
    className={cn('flex items-center justify-between gap-2 mt-3', className)}
    {...props}
  >
    {/* Timestamp */}
    {showTimestamp && timestamp && (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        {timestamp}
      </span>
    )}

    {/* Action buttons */}
    <div className="flex items-center gap-1">
      {children}
    </div>
  </div>
);