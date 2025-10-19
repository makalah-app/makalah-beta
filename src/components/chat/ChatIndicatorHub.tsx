'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type ChatIndicatorKind =
  | 'chat-submitted'
  | 'chat-streaming'
  | 'chat-error'
  | 'tool-pending'
  | 'tool-success'
  | 'tool-error'
  | 'artifact-loading'
  | 'artifact-streaming'
  | 'artifact-error'
  | 'idle';

export interface ChatIndicatorDescriptor {
  kind: ChatIndicatorKind;
  label: string;
  percent?: number;
  shimmer?: boolean;
  tone?: 'default' | 'success' | 'error';
  description?: string;
}

interface ChatIndicatorHubProps {
  indicator?: ChatIndicatorDescriptor | null;
  className?: string;
}

export const ChatIndicatorHub: React.FC<ChatIndicatorHubProps> = ({
  indicator,
  className,
}) => {
  const active = indicator && indicator.kind !== 'idle';
  const shimmerEnabled = indicator?.shimmer ?? true;

  return (
    <div
      className={cn('h-7 md:h-8 flex items-center', className)}
      aria-live="polite"
      aria-atomic="true"
    >
      {active ? (
        <div
          className={cn(
            'chat-indicator-badge inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] md:text-xs font-medium shadow-sm text-muted-foreground bg-muted/70 border-border/60 dark:bg-muted/40',
            indicator?.tone === 'success' &&
              'bg-success-50 text-success-700 border-success-200 dark:bg-success-900/20 dark:text-success-200 dark:border-success-500',
            indicator?.tone === 'error' &&
              'bg-destructive/10 text-destructive border-destructive/25',
          )}
          data-shimmer={shimmerEnabled ? 'true' : 'false'}
        >
          <span className="truncate">{indicator?.label}</span>
          {typeof indicator?.percent === 'number' && (
            <span className="tabular-nums text-[11px] md:text-xs font-normal">
              {Math.round(indicator.percent)}%
            </span>
          )}
          {indicator?.description && (
            <span className="hidden md:inline text-[11px] font-normal text-muted-foreground/80">
              {indicator.description}
            </span>
          )}
        </div>
      ) : (
        <div className="w-full h-full" aria-hidden="true" />
      )}
    </div>
  );
};

ChatIndicatorHub.displayName = 'ChatIndicatorHub';

export default ChatIndicatorHub;
