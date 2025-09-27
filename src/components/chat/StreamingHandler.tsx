'use client';

/**
 * StreamingHandler - Minimalist component untuk streaming state indication
 *
 * REDESIGNED FOR STATUS INDICATOR CONSISTENCY:
 * - Uses bouncing dots animation sama seperti ChatInput status indicator
 * - Clean minimal design tanpa background atau border
 * - Minimal state management untuk progress tracking
 *
 * DESIGN COMPLIANCE:
 * - Bouncing dots animation dengan consistent styling
 * - Simple Tailwind utility classes
 * - Clean horizontal layout above messages
 */

import React, { useEffect, useState } from 'react';

interface StreamingHandlerProps {
  status: 'ready' | 'submitted' | 'streaming' | 'error';
  className?: string;
  estimatedDuration?: number;
}

interface StreamingState {
  startTime: number;
  estimatedProgress: number;
}

export const StreamingHandler: React.FC<StreamingHandlerProps> = ({
  status,
  className = '',
  estimatedDuration = 30000, // 30 seconds default
}) => {
  const [streamingState, setStreamingState] = useState<StreamingState>({
    startTime: Date.now(),
    estimatedProgress: 0,
  });

  // Update progress tracking
  useEffect(() => {
    if (status !== 'streaming' && status !== 'submitted') return;

    const startTime = Date.now();
    setStreamingState(prev => ({ ...prev, startTime }));

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / estimatedDuration) * 100, 95); // Cap at 95% until completion

      setStreamingState(prev => ({
        ...prev,
        estimatedProgress: progress,
      }));
    }, 100);

    return () => clearInterval(interval);
  }, [status, estimatedDuration]);

  // Reset state when streaming completes
  useEffect(() => {
    if (status === 'ready' || status === 'error') {
      setStreamingState({
        startTime: 0,
        estimatedProgress: 0,
      });
    }
  }, [status]);

  if (status !== 'streaming' && status !== 'submitted') {
    return null;
  }

  return (
    <div className={`inline-flex items-center gap-2 text-xs text-muted-foreground ${className}`}>
      {/* Bouncing Dots Animation - Same as ChatInput status indicator */}
      <div className="flex gap-1">
        <div className="size-1 animate-bounce rounded-full bg-primary"></div>
        <div className="size-1 animate-bounce rounded-full bg-primary" style={{ animationDelay: '0.1s' }}></div>
        <div className="size-1 animate-bounce rounded-full bg-primary" style={{ animationDelay: '0.2s' }}></div>
      </div>

      {/* Status Text - Consistent with ChatInput */}
      <span>
        {status === 'submitted' ? 'Memproses permintaan...' : 'Agen sedang merespons...'}
      </span>

      {/* Progress Percentage - Subtle styling */}
      {status === 'streaming' && (
        <span className="text-muted-foreground text-xs">{Math.round(streamingState.estimatedProgress)}%</span>
      )}
    </div>
  );
};

export default StreamingHandler;
