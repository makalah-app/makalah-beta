'use client';

/**
 * StreamingHandler - Component untuk handling real-time AI responses dan streaming states
 *
 * MIGRATED TO AI ELEMENTS:
 * - Uses AI Elements Loader untuk consistent loading animation
 * - Uses shadcn/ui Progress untuk streaming progress visualization
 * - Preserves real-time UI updates dan proper state management
 *
 * DESIGN COMPLIANCE:
 * - AI Elements styling dengan shadcn/ui base components
 * - Modern progress indicators dengan smooth animations
 * - Academic context streaming patterns preserved
 */

import React, { useEffect, useState } from 'react';
import { Loader } from '../ai-elements/loader';
import { Progress } from '../ui/progress';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { cn } from '@/lib/utils';

interface StreamingHandlerProps {
  status: 'ready' | 'submitted' | 'streaming' | 'error';
  onStop?: () => void;
  className?: string;
  showProgress?: boolean;
  estimatedDuration?: number;
}

interface StreamingState {
  startTime: number;
  elapsedTime: number;
  estimatedProgress: number;
  messageBuffer: string[];
  eventCount: number;
}

export const StreamingHandler: React.FC<StreamingHandlerProps> = ({
  status,
  onStop,
  className = '',
  showProgress = true,
  estimatedDuration = 30000, // 30 seconds default
}) => {
  const [streamingState, setStreamingState] = useState<StreamingState>({
    startTime: Date.now(),
    elapsedTime: 0,
    estimatedProgress: 0,
    messageBuffer: [],
    eventCount: 0,
  });

  // Update elapsed time dan progress
  useEffect(() => {
    if (status !== 'streaming' && status !== 'submitted') return;

    const startTime = Date.now();
    setStreamingState(prev => ({ ...prev, startTime }));

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / estimatedDuration) * 100, 95); // Cap at 95% until completion

      setStreamingState(prev => ({
        ...prev,
        elapsedTime: elapsed,
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
        elapsedTime: 0,
        estimatedProgress: 0,
        messageBuffer: [],
        eventCount: 0,
      });
    }
  }, [status]);

  if (status !== 'streaming' && status !== 'submitted') {
    return null;
  }

  return (
    <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
      <CardContent className="p-4">
        {/* Main Streaming Indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Animated Icon */}
            <div className="flex-shrink-0">
              {status === 'submitted' ? (
                <Loader size={20} />
              ) : (
                <div className="flex gap-1">
                  <div className="size-2 animate-bounce rounded-full bg-blue-500" style={{ animationDelay: '0ms' }} />
                  <div className="size-2 animate-bounce rounded-full bg-blue-500" style={{ animationDelay: '150ms' }} />
                  <div className="size-2 animate-bounce rounded-full bg-blue-500" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>

            {/* Status Text */}
            <div className="flex-1">
              <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {status === 'submitted' ? 'Memproses permintaan...' : 'Menulis respons...'}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400">
                {Math.round(streamingState.elapsedTime / 1000)}s
              </div>
            </div>
          </div>

          {/* Stop Button */}
          {onStop && (
            <Button
              onClick={onStop}
              variant="outline"
              size="sm"
              className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900"
            >
              ⏹️ Stop
            </Button>
          )}
        </div>

        {/* Progress Bar */}
        {showProgress && status === 'streaming' && (
          <div className="mt-3 space-y-2">
            <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400">
              <span>Progress</span>
              <span>{Math.round(streamingState.estimatedProgress)}%</span>
            </div>
            <Progress
              value={streamingState.estimatedProgress}
              className="h-2"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StreamingHandler;
