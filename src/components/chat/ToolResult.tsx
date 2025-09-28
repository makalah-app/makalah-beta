'use client';

/**
 * ToolResult - StreamingHandler-style component untuk tool execution results
 *
 * REDESIGNED FOR STREAMING INDICATOR CONSISTENCY:
 * - Uses same styling dan animation seperti StreamingHandler
 * - Bouncing dots animation untuk pending status
 * - Auto-hide behavior after completion (like StreamingHandler)
 * - Minimal clean design tanpa Card wrapper
 *
 * DESIGN COMPLIANCE:
 * - Consistent dengan StreamingHandler styling
 * - Bouncing dots animation untuk visual continuity
 * - Auto-hide setelah success (2.5 detik delay)
 * - Simple Tailwind utility classes
 */

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ToolResultProps {
  result: any;
  status?: 'success' | 'error' | 'pending';
  className?: string;
}

export const ToolResult = ({
  result,
  status = 'success',
  className
}: ToolResultProps) => {
  const [shouldHide, setShouldHide] = useState(false);

  const statusConfig = {
    success: {
      text: 'Pencarian selesai',
      percentage: 100,
      showBouncing: false
    },
    error: {
      text: 'Pencarian gagal',
      percentage: 0,
      showBouncing: false
    },
    pending: {
      text: 'Sedang mencari...',
      percentage: 75,
      showBouncing: true
    }
  };

  const config = statusConfig[status];

  // Auto-hide behavior - similar to StreamingHandler
  useEffect(() => {
    if (status === 'success') {
      // Hide after 2.5 seconds for success status
      const timer = setTimeout(() => {
        setShouldHide(true);
      }, 2500);

      return () => clearTimeout(timer);
    } else if (status === 'error') {
      // Hide after 4 seconds for error status (longer to read error)
      const timer = setTimeout(() => {
        setShouldHide(true);
      }, 4000);

      return () => clearTimeout(timer);
    }
    // Pending status doesn't auto-hide
  }, [status]);

  // Hide component like StreamingHandler does
  if (shouldHide) {
    return null;
  }

  return (
    <div className={cn('mt-3', className)}>
      {/* Single Line: StreamingHandler-style indicator */}
      <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
        {/* Bouncing/Static Dots - Same as StreamingHandler */}
        <div className="flex gap-1">
          <div
            className={cn(
              "size-1 rounded-full bg-primary",
              config.showBouncing && "animate-bounce"
            )}
          />
          <div
            className={cn(
              "size-1 rounded-full bg-primary",
              config.showBouncing && "animate-bounce"
            )}
            style={config.showBouncing ? { animationDelay: '0.1s' } : undefined}
          />
          <div
            className={cn(
              "size-1 rounded-full bg-primary",
              config.showBouncing && "animate-bounce"
            )}
            style={config.showBouncing ? { animationDelay: '0.2s' } : undefined}
          />
        </div>

        {/* Status Text */}
        <span>{config.text}</span>

        {/* Progress Percentage */}
        <span className="text-muted-foreground text-xs">{config.percentage}%</span>
      </div>

      {/* Result content - minimal styling (hidden for cleaner look) */}
      {result && false && (
        <div className="pl-6 mt-2">
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-x-auto">
            {typeof result === 'string'
              ? result
              : JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};